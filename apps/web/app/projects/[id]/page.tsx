import Link from "next/link";
import { notFound } from "next/navigation";
import { RENDER_MODES } from "@seo-master/shared";
import { startAudit } from "@/app/actions";
import { AutoRefresh } from "@/components/auto-refresh";
import { Shell } from "@/components/shell";
import { Button, Panel, Score } from "@/components/ui";
import { displayUrl, formatDate, timeAgo } from "@/lib/format";
import { getT } from "@/lib/i18n";
import { requireUser } from "@/lib/supabase/server";
import type { AuditRow, ProjectRow } from "@/lib/types";

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [{ supabase, user }, { t, locale }] = await Promise.all([requireUser(), getT()]);
  const [{ data: project }, { data: audits }] = await Promise.all([
    supabase.from("projects").select("*").eq("id", id).maybeSingle<ProjectRow>(),
    supabase.from("audits").select("*").eq("project_id", id).order("created_at", { ascending: false }).returns<AuditRow[]>(),
  ]);
  if (!project) notFound();
  const list = audits ?? [];
  const active = list.some((a) => a.status === "queued" || a.status === "running");

  return (
    <Shell email={user.email}>
      {active && <AutoRefresh />}
      <Link href="/" className="text-sm text-ink-soft hover:text-ink">
        ← {t.allSites}
      </Link>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{project.name}</h1>
          <a href={project.url} target="_blank" rel="noreferrer" className="font-mono text-sm text-ink-soft hover:text-signal">
            {displayUrl(project.url)} ↗
          </a>
        </div>
        <form action={startAudit} className="flex flex-wrap items-center gap-2">
          <input type="hidden" name="projectId" value={project.id} />
          <label htmlFor="maxPages" className="text-sm text-ink-soft">
            {t.project.pageLimit}
          </label>
          <select id="maxPages" name="maxPages" defaultValue="500" className="rounded-md border border-rule bg-panel px-2 py-2 text-sm">
            {[50, 100, 500, 1000, 5000].map((n) => (
              <option key={n}>{n}</option>
            ))}
          </select>
          <label htmlFor="renderMode" className="text-sm text-ink-soft">
            {t.project.renderLabel}
          </label>
          <select
            id="renderMode"
            name="renderMode"
            defaultValue={list[0]?.render_mode ?? "auto"}
            className="rounded-md border border-rule bg-panel px-2 py-2 text-sm"
          >
            {RENDER_MODES.map((m) => (
              <option key={m} value={m}>
                {t.project.renderModes[m]}
              </option>
            ))}
          </select>
          <Button disabled={active}>{active ? t.project.inProgress : t.project.runAudit}</Button>
        </form>
      </div>

      <h2 className="mt-10 text-sm font-semibold uppercase tracking-wider text-ink-soft">{t.project.history}</h2>
      {list.length === 0 ? (
        <p className="mt-3 text-ink-soft">{t.project.noAudits}</p>
      ) : (
        <Panel className="mt-3 divide-y divide-rule">
          {list.map((a, i) => {
            const prev = list.slice(i + 1).find((x) => x.status === "completed");
            const delta = a.score !== null && prev?.score != null ? a.score - prev.score : null;
            return (
              <Link key={a.id} href={`/audits/${a.id}`} className="flex items-center gap-4 px-5 py-4 hover:bg-paper/60">
                <Score value={a.score} className="w-12 text-2xl font-bold" />
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{formatDate(a.created_at, locale, true)}</p>
                  <p className="text-sm text-ink-soft">
                    {a.status === "completed" && t.project.pagesAgo(a.pages_crawled, timeAgo(a.created_at, locale))}
                    {a.status === "running" && t.project.crawling(a.pages_crawled)}
                    {a.status === "queued" && t.project.waiting}
                    {a.status === "failed" && <span className="text-critical">{t.project.failed(a.error ?? "")}</span>}
                  </p>
                </div>
                {delta !== null && delta !== 0 && (
                  <span className={`text-sm font-semibold tabular-nums ${delta > 0 ? "text-good" : "text-critical"}`}>
                    {delta > 0 ? "▲" : "▼"} {Math.abs(delta)}
                  </span>
                )}
              </Link>
            );
          })}
        </Panel>
      )}
    </Shell>
  );
}
