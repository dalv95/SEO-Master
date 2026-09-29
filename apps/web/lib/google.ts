import "server-only";
import { decryptSecret, encryptSecret, listSites, refreshAccessToken, type GscSite } from "@seo-master/google";
import { sql } from "./db";

/** Short-lived cookie holding the OAuth state + where to return after consent. */
export const OAUTH_COOKIE = "google_oauth";

export function googleConfig() {
  const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, TOKEN_ENCRYPTION_KEY } = process.env;
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !TOKEN_ENCRYPTION_KEY) return null;
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  return {
    client: { clientId: GOOGLE_CLIENT_ID, clientSecret: GOOGLE_CLIENT_SECRET, redirectUri: `${site}/api/google/callback` },
    key: TOKEN_ENCRYPTION_KEY,
  };
}

export async function saveGoogleConnection(userId: string, email: string | null, refreshToken: string) {
  const cfg = googleConfig()!;
  await sql`
    insert into google_connections (user_id, google_email, refresh_token_enc)
    values (${userId}, ${email}, ${encryptSecret(refreshToken, cfg.key)})
    on conflict (user_id) do update set
      google_email = excluded.google_email, refresh_token_enc = excluded.refresh_token_enc,
      last_error = null, updated_at = now()`;
}

/** Search Console properties the user's connected Google account can read. */
export async function listUserSites(userId: string): Promise<GscSite[]> {
  const cfg = googleConfig();
  if (!cfg) return [];
  const [row] = await sql<{ refresh_token_enc: string }[]>`
    select refresh_token_enc from google_connections where user_id = ${userId} and last_error is null`;
  if (!row) return [];
  const token = await refreshAccessToken(cfg.client, decryptSecret(row.refresh_token_enc, cfg.key));
  return listSites(token);
}

/** Links a project to a property and schedules a full import (old data is removed when the property changes). */
export async function linkProperty(projectId: string, ownerId: string, property: string | null) {
  await sql.begin(async (tx) => {
    const [p] = await tx<{ gsc_property: string | null }[]>`
      select gsc_property from projects where id = ${projectId} and owner_id = ${ownerId} for update`;
    if (!p) throw new Error("Project not found");
    if (p.gsc_property !== property) {
      await tx`delete from gsc_daily where project_id = ${projectId}`;
      await tx`delete from gsc_rows where project_id = ${projectId}`;
    }
    await tx`
      update projects set gsc_property = ${property}, gsc_synced_at = null, gsc_sync_error = null,
        gsc_detail_from = case when gsc_property is distinct from ${property} then null else gsc_detail_from end
      where id = ${projectId}`;
  });
}
