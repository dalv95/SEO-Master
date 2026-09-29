import Link from "next/link";
import { notFound } from "next/navigation";
import { startAudit } from "@/app/actions";
import { AutoRefresh } from "@/components/auto-refresh";
import { Shell } from "@/components/shell";
import { Button, Panel, Score } from "@/components/ui";
import { displayUrl, timeAgo } from "@/lib/format";
import { requireUser } from "@/lib/supabase/server";
import type { AuditRow, ProjectRow } from "@/lib/types";

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user } = await requireUser();
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
        ← All sites
      </Link>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{project.name}</h1>
          <a href={project.url} target="_blank" rel="noreferrer" className="font-mono text-sm text-ink-soft hover:text-signal">
            {displayUrl(project.url)} ↗
          </a>
        </div>
        <form action={startAudit} className="flex items-center gap-2">
          <input type="hidden" name="projectId" value={project.id} />
          <label htmlFor="maxPages" className="text-sm text-ink-soft">
            Page limit
          </label>
          <select id="maxPages" name="maxPages" defaultValue="500" className="rounded-md border border-rule bg-panel px-2 py-2 text-sm">
            {[50, 100, 500, 1000, 5000].map((n) => (
              <option key={n}>{n}</option>
            ))}
          </select>
          <Button disabled={active}>{active ? "Audit in progress" : "Run new audit"}</Button>
        </form>
      </div>

      <h2 className="mt-10 text-sm font-semibold uppercase tracking-wider text-ink-soft">Audit history</h2>
      {list.length === 0 ? (
        <p className="mt-3 text-ink-soft">No audits yet. Run one to see how this site is doing.</p>
      ) : (
        <Panel className="mt-3 divide-y divide-rule">
          {list.map((a, i) => {
            const prev = list.slice(i + 1).find((x) => x.status === "completed");
            const delta = a.score !== null && prev?.score != null ? a.score - prev.score : null;
            return (
              <Link key={a.id} href={`/audits/${a.id}`} className="flex items-center gap-4 px-5 py-4 hover:bg-paper/60">
                <Score value={a.score} className="w-12 text-2xl font-bold" />
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{new Date(a.created_at).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}</p>
                  <p className="text-sm text-ink-soft">
                    {a.status === "completed" && `${a.pages_crawled} pages · ${timeAgo(a.created_at)}`}
                    {a.status === "running" && `Crawling… ${a.pages_crawled} pages so far`}
                    {a.status === "queued" && "Waiting for a crawler"}
                    {a.status === "failed" && <span className="text-critical">Failed: {a.error}</span>}
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
