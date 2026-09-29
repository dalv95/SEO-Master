import Link from "next/link";
import { matchProperty, type GscSite } from "@seo-master/google";
import type { Locale } from "@seo-master/seo-rules";
import { disconnectGoogle, linkGscProperty, resyncGsc, unlinkGscProperty } from "@/app/projects/[id]/gsc-actions";
import { AutoRefresh } from "@/components/auto-refresh";
import { Button, Panel } from "@/components/ui";
import { timeAgo } from "@/lib/format";
import { googleConfig, listUserSites } from "@/lib/google";
import type { Dictionary } from "@/lib/i18n/en";
import { createClient } from "@/lib/supabase/server";
import type { ProjectRow } from "@/lib/types";

const linkButton = "rounded-md border border-rule bg-panel px-3 py-1.5 text-sm hover:border-signal";

/** Connect Google → pick the property → import status, on the project page. */
export async function GscCard({
  project,
  userId,
  t,
  locale,
  banner,
}: {
  project: ProjectRow;
  userId: string;
  t: Dictionary;
  locale: Locale;
  banner?: string;
}) {
  if (!googleConfig()) return <p className="mt-8 text-sm text-ink-soft">{t.gsc.notConfigured}</p>;

  const supabase = await createClient();
  const { data: connection } = await supabase
    .from("google_connections")
    .select("google_email, last_error")
    .eq("user_id", userId)
    .maybeSingle<{ google_email: string | null; last_error: string | null }>();

  const returnTo = `/projects/${project.id}`;
  const hidden = <input type="hidden" name="projectId" value={project.id} />;
  let body: React.ReactNode;

  if (!connection || connection.last_error) {
    body = (
      <>
        <p className="mt-1 text-sm text-ink-soft">{connection ? t.gsc.reconnectHelp : t.gsc.connectHelp}</p>
        <a
          href={`/api/google/connect?returnTo=${encodeURIComponent(returnTo)}`}
          className="mt-4 inline-block rounded-md bg-signal px-4 py-2 text-sm font-semibold text-signal-ink hover:opacity-90"
        >
          {connection ? t.gsc.reconnect : t.gsc.connect}
        </a>
      </>
    );
  } else if (!project.gsc_property) {
    let sites: GscSite[] = [];
    let error: string | null = null;
    try {
      sites = await listUserSites(userId);
    } catch (e) {
      error = (e as Error).message;
    }
    const suggested = matchProperty(sites, project.url);
    body =
      error || sites.length === 0 ? (
        <p className="mt-2 text-sm text-ink-soft">{error ?? t.gsc.noProperties}</p>
      ) : (
        <form action={linkGscProperty} className="mt-3 flex flex-wrap items-center gap-2">
          {hidden}
          <label htmlFor="property" className="text-sm text-ink-soft">
            {t.gsc.property}
          </label>
          <select
            id="property"
            name="property"
            defaultValue={suggested ?? sites[0]!.siteUrl}
            className="rounded-md border border-rule bg-panel px-2 py-2 font-mono text-sm"
          >
            {sites.map((s) => (
              <option key={s.siteUrl} value={s.siteUrl}>
                {s.siteUrl}
              </option>
            ))}
          </select>
          <Button>{t.gsc.useProperty}</Button>
        </form>
      );
  } else {
    const importing = !project.gsc_synced_at;
    body = (
      <>
        {importing && <AutoRefresh intervalMs={5000} />}
        <p className="mt-1 font-mono text-sm">{project.gsc_property}</p>
        <p className={`mt-1 text-sm ${project.gsc_sync_error ? "text-critical" : "text-ink-soft"}`}>
          {project.gsc_sync_error
            ? t.gsc.syncError(project.gsc_sync_error)
            : importing
              ? t.gsc.importing
              : t.gsc.synced(timeAgo(project.gsc_synced_at!, locale))}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {!importing && (
            <Link href={`/projects/${project.id}/search-console`} className={linkButton}>
              {t.gsc.open}
            </Link>
          )}
          <form action={resyncGsc}>
            {hidden}
            <button className={linkButton}>{t.gsc.resync}</button>
          </form>
          <form action={unlinkGscProperty}>
            {hidden}
            <button className={linkButton}>{t.gsc.unlink}</button>
          </form>
        </div>
      </>
    );
  }

  return (
    <Panel className="mt-8 p-5">
      {banner && t.gsc.banner[banner] && (
        <p className={`mb-3 text-sm ${banner === "connected" ? "text-good" : "text-critical"}`}>{t.gsc.banner[banner]}</p>
      )}
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h2 className="font-semibold">{t.gsc.title}</h2>
        {connection && !connection.last_error && (
          <form action={disconnectGoogle} className="flex items-center gap-3 text-xs text-ink-soft">
            {hidden}
            {connection.google_email && <span>{t.gsc.connectedAs(connection.google_email)}</span>}
            <button className="hover:text-ink">{t.gsc.disconnect}</button>
          </form>
        )}
      </div>
      {body}
    </Panel>
  );
}
