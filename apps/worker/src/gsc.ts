import {
  decryptSecret,
  GoogleAuthError,
  GscApiError,
  querySearchAnalytics,
  refreshAccessToken,
  type GscRow,
} from "@seo-master/google";
import { sql } from "./db";
import { env } from "./env";

const RESYNC_AFTER_HOURS = 12;
const DAILY_HISTORY_MONTHS = 16;
/** Query × page detail: initial import and retention. */
const DETAIL_BACKFILL_DAYS = 90;
const DETAIL_RETENTION_DAYS = 120;
/** Google keeps revising the last ~3 days; re-import a few more than that. */
const REFRESH_DAYS = 5;
const CHUNK_DAYS = 7;

export const gscEnabled = () => !!(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET && env.TOKEN_ENCRYPTION_KEY);

const day = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (d: Date, n: number) => new Date(d.getTime() + n * 86_400_000);

interface DueProject {
  id: string;
  gsc_property: string;
  gsc_detail_from: string | null;
  gsc_synced_at: Date | null;
  user_id: string;
  refresh_token_enc: string;
}

/** Syncs a few projects whose data is stale or never imported. Returns how many were processed. */
export async function syncDueProjects(limit = 3): Promise<number> {
  if (!gscEnabled()) return 0;
  const due = await sql<DueProject[]>`
    select p.id, p.gsc_property, p.gsc_detail_from::text, p.gsc_synced_at, g.user_id, g.refresh_token_enc
    from projects p join google_connections g on g.user_id = p.owner_id
    where p.gsc_property is not null and g.last_error is null
      and (p.gsc_synced_at is null or p.gsc_synced_at < now() - make_interval(hours => ${RESYNC_AFTER_HOURS}))
    order by p.gsc_synced_at nulls first
    limit ${limit}`;
  for (const p of due) await syncProject(p);
  return due.length;
}

async function syncProject(p: DueProject) {
  const started = Date.now();
  let accessToken: string;
  try {
    accessToken = await refreshAccessToken(
      { clientId: env.GOOGLE_CLIENT_ID!, clientSecret: env.GOOGLE_CLIENT_SECRET! },
      decryptSecret(p.refresh_token_enc, env.TOKEN_ENCRYPTION_KEY!),
    );
  } catch (e) {
    // Revoked or expired consent: mark the connection so the UI asks the user to reconnect.
    const msg = e instanceof GoogleAuthError && e.code === "invalid_grant" ? "reconnect_required" : (e as Error).message;
    await sql`update google_connections set last_error = ${msg}, updated_at = now() where user_id = ${p.user_id}`;
    console.error(`✖ GSC ${p.gsc_property}: token refresh failed (${msg})`);
    return;
  }

  try {
    const today = new Date();
    const end = day(today);

    // 1. Exact daily totals.
    const dailyFrom = p.gsc_synced_at ? addDays(today, -10) : new Date(today.getFullYear(), today.getMonth() - DAILY_HISTORY_MONTHS, today.getDate());
    const daily = await querySearchAnalytics(accessToken, p.gsc_property, {
      startDate: day(dailyFrom),
      endDate: end,
      dimensions: ["date"],
    });
    if (daily.length) {
      const rows = daily.map((r) => ({
        project_id: p.id,
        date: r.keys[0]!,
        clicks: r.clicks,
        impressions: r.impressions,
        ctr: r.ctr,
        position: r.position,
      }));
      await sql`
        insert into gsc_daily ${sql(rows)}
        on conflict (project_id, date) do update set
          clicks = excluded.clicks, impressions = excluded.impressions, ctr = excluded.ctr, position = excluded.position`;
    }

    // 2. Query × page detail: full backfill once, then only the recent days Google still revises.
    const detailFrom = p.gsc_detail_from ? addDays(today, -REFRESH_DAYS) : addDays(today, -DETAIL_BACKFILL_DAYS);
    let detailRows = 0;
    for (let from = detailFrom; from <= today; from = addDays(from, CHUNK_DAYS)) {
      const to = addDays(from, CHUNK_DAYS - 1) > today ? today : addDays(from, CHUNK_DAYS - 1);
      const rows = await querySearchAnalytics(accessToken, p.gsc_property, {
        startDate: day(from),
        endDate: day(to),
        dimensions: ["date", "query", "page"],
      });
      detailRows += rows.length;
      await replaceDetail(p.id, day(from), day(to), rows);
    }

    await sql.begin(async (tx) => {
      await tx`delete from gsc_rows where project_id = ${p.id} and date < ${day(addDays(today, -DETAIL_RETENTION_DAYS))}`;
      await tx`
        update projects set gsc_synced_at = now(), gsc_sync_error = null,
          gsc_detail_from = coalesce(gsc_detail_from, ${day(detailFrom)}::date)
        where id = ${p.id}`;
    });
    console.log(
      `✔ GSC ${p.gsc_property}: ${daily.length} days, ${detailRows} query×page rows in ${Math.round((Date.now() - started) / 1000)} s`,
    );
  } catch (e) {
    const msg = e instanceof GscApiError ? `${e.status}: ${e.message}` : (e as Error).message;
    // Record the error and back off until the next resync window instead of retrying in a hot loop.
    await sql`update projects set gsc_sync_error = ${msg}, gsc_synced_at = now() where id = ${p.id}`;
    console.error(`✖ GSC ${p.gsc_property}: ${msg}`);
  }
}

const BATCH = 1000;

async function replaceDetail(projectId: string, from: string, to: string, rows: GscRow[]) {
  await sql.begin(async (tx) => {
    await tx`delete from gsc_rows where project_id = ${projectId} and date between ${from} and ${to}`;
    const mapped = rows.map((r) => ({
      project_id: projectId,
      date: r.keys[0]!,
      query: r.keys[1]!,
      page: r.keys[2]!,
      clicks: r.clicks,
      impressions: r.impressions,
      position: r.position,
    }));
    for (let i = 0; i < mapped.length; i += BATCH) await tx`insert into gsc_rows ${tx(mapped.slice(i, i + BATCH))}`;
  });
}
