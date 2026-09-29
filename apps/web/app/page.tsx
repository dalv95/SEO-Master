import Link from "next/link";
import { Shell } from "@/components/shell";
import { Panel, Score } from "@/components/ui";
import { displayUrl, timeAgo } from "@/lib/format";
import { getT } from "@/lib/i18n";
import { requireUser } from "@/lib/supabase/server";
import type { AuditRow, ProjectRow } from "@/lib/types";
import { NewProjectForm } from "./new-project-form";

type ProjectWithAudits = ProjectRow & { audits: Pick<AuditRow, "score" | "status" | "created_at">[] };

export default async function Dashboard() {
  const [{ supabase, user }, { t, locale }] = await Promise.all([requireUser(), getT()]);
  const { data } = await supabase
    .from("projects")
    .select("id, name, url, created_at, audits(score, status, created_at)")
    .order("created_at", { ascending: false })
    .order("created_at", { referencedTable: "audits", ascending: false })
    .limit(1, { referencedTable: "audits" });
  const projects = (data ?? []) as ProjectWithAudits[];

  return (
    <Shell email={user.email}>
      <div className="grid gap-10 lg:grid-cols-[1fr_20rem]">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t.dashboard.title}</h1>
          {projects.length === 0 ? (
            <p className="mt-4 max-w-md text-ink-soft">{t.dashboard.empty}</p>
          ) : (
            <Panel className="mt-6 divide-y divide-rule">
              {projects.map((p) => {
                const last = p.audits[0];
                return (
                  <Link
                    key={p.id}
                    href={`/projects/${p.id}`}
                    className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-paper/60"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{p.name}</p>
                      <p className="truncate font-mono text-sm text-ink-soft">{displayUrl(p.url)}</p>
                    </div>
                    <div className="text-right">
                      <Score value={last?.score ?? null} className="text-2xl font-bold" />
                      <p className="text-xs text-ink-soft">
                        {!last
                          ? t.dashboard.noAudits
                          : last.status === "completed"
                            ? timeAgo(last.created_at, locale)
                            : t.status[last.status]}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </Panel>
          )}
        </div>
        <aside>
          <Panel className="p-5">
            <h2 className="font-semibold">{t.dashboard.addSite}</h2>
            <NewProjectForm t={t.dashboard} />
          </Panel>
        </aside>
      </div>
    </Shell>
  );
}
