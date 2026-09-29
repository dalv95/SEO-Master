import Link from "next/link";
import { notFound } from "next/navigation";
import { ISSUE_CATEGORIES, type IssueCategory, type Severity } from "@seo-master/shared";
import { AutoRefresh } from "@/components/auto-refresh";
import { CrawlSpectrum } from "@/components/crawl-spectrum";
import { ReportSummary } from "@/components/report-summary";
import { Shell } from "@/components/shell";
import { Panel, SeverityDot } from "@/components/ui";
import {
  buildSpectrum,
  groupIssues,
  issuesPerUrl,
  loadAudit,
  loadAuditDetails,
  SEVERITIES,
} from "@/lib/audit-report";
import { pathOf } from "@/lib/format";
import { getT } from "@/lib/i18n";
import { requireUser } from "@/lib/supabase/server";

const URLS_PER_RULE = 50;

type Search = { severity?: string; category?: string };

export default async function AuditPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Search>;
}) {
  const [{ id }, search, { supabase, user }, { t, locale }] = await Promise.all([
    params,
    searchParams,
    requireUser(),
    getT(),
  ]);

  const loaded = await loadAudit(supabase, id);
  if (!loaded) notFound();
  const { audit, project } = loaded;

  if (audit.status !== "completed") {
    return (
      <Shell email={user.email}>
        {audit.status !== "failed" && <AutoRefresh />}
        <Link href={`/projects/${audit.project_id}`} className="text-sm text-ink-soft hover:text-ink">
          ← {project.name}
        </Link>
        <Panel className="mt-6 p-8">
          {audit.status === "failed" ? (
            <>
              <h1 className="text-2xl font-bold">{t.audit.failedTitle}</h1>
              <p className="mt-2 text-critical">{audit.error}</p>
              <p className="mt-2 text-ink-soft">{t.audit.failedHelp}</p>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-bold">
                {audit.status === "queued" ? t.audit.queuedTitle : t.audit.runningTitle}
              </h1>
              <p className="mt-2 font-mono text-ink-soft">{t.audit.progress(audit.pages_crawled, audit.max_pages)}</p>
              <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-rule">
                <div
                  className="h-full bg-signal transition-[width] duration-700"
                  style={{ width: `${Math.max(2, (100 * audit.pages_crawled) / audit.max_pages)}%` }}
                />
              </div>
              <p className="mt-4 text-sm text-ink-soft">{t.audit.progressHelp}</p>
            </>
          )}
        </Panel>
      </Shell>
    );
  }

  const { issues, pages } = await loadAuditDetails(supabase, id);
  const perUrl = issuesPerUrl(issues);

  const severity = SEVERITIES.includes(search.severity as Severity) ? (search.severity as Severity) : undefined;
  const category = ISSUE_CATEGORIES.includes(search.category as IssueCategory)
    ? (search.category as IssueCategory)
    : undefined;
  const groups = groupIssues(
    issues.filter((i) => (!severity || i.severity === severity) && (!category || i.category === category)),
    locale,
  );
  const bySeverity = Object.fromEntries(SEVERITIES.map((s) => [s, issues.filter((i) => i.severity === s).length]));
  const href = (next: Search) => {
    const q = new URLSearchParams(
      Object.entries({ severity, category, ...next }).filter(([, v]) => v) as [string, string][],
    );
    return `?${q}`;
  };

  return (
    <Shell email={user.email}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href={`/projects/${audit.project_id}`} className="text-sm text-ink-soft hover:text-ink">
          ← {project.name}
        </Link>
        <div className="flex gap-2 text-sm">
          <a href={`/audits/${id}/csv`} className="rounded-md border border-rule bg-panel px-3 py-1.5 hover:border-signal">
            {t.audit.exportCsv}
          </a>
          <a
            href={`/audits/${id}/print`}
            target="_blank"
            className="rounded-md border border-rule bg-panel px-3 py-1.5 hover:border-signal"
          >
            {t.audit.exportPdf}
          </a>
        </div>
      </div>

      <div className="mt-4">
        <ReportSummary
          audit={audit}
          project={project}
          t={t}
          locale={locale}
          activeCategory={category}
          categoryHref={(c) => href({ category: category === c ? undefined : c })}
        />
      </div>

      <Panel className="mt-8 p-5">
        <CrawlSpectrum pages={buildSpectrum(pages, perUrl)} t={t.spectrum} />
      </Panel>

      <div className="mt-10 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold tracking-tight">
          {t.audit.whatToFix}
          {category && <span className="text-ink-soft"> · {t.category[category]}</span>}
        </h2>
        <nav className="flex flex-wrap gap-2 text-sm" aria-label={t.audit.filterBySeverity}>
          <FilterChip href={href({ severity: undefined })} active={!severity}>
            {t.audit.all} {issues.length}
          </FilterChip>
          {SEVERITIES.map((s) => (
            <FilterChip key={s} href={href({ severity: s })} active={severity === s}>
              <SeverityDot severity={s} /> {t.severity[s]} {bySeverity[s]}
            </FilterChip>
          ))}
          {category && (
            <FilterChip href={href({ category: undefined })} active={false}>
              ✕ {t.category[category]}
            </FilterChip>
          )}
        </nav>
      </div>

      {groups.length === 0 ? (
        <p className="mt-4 text-ink-soft">{t.audit.noMatches}</p>
      ) : (
        <Panel className="mt-4 divide-y divide-rule">
          {groups.map((g) => (
            <details key={g.ruleId} className="group">
              <summary className="flex cursor-pointer list-none items-center gap-3 px-5 py-4 hover:bg-paper/60">
                <SeverityDot severity={g.severity} />
                <span className="flex-1 font-medium">{g.title}</span>
                <span className="hidden text-xs text-ink-soft sm:inline">{t.category[g.category]}</span>
                <span className="w-24 text-right text-sm tabular-nums text-ink-soft">{t.audit.pages(g.pagesAffected)}</span>
                <span aria-hidden className="text-ink-soft transition-transform group-open:rotate-90">
                  ›
                </span>
              </summary>
              <div className="px-5 pb-4">
                <div className="mb-4 rounded-md bg-paper px-4 py-3 text-sm">
                  <p className="font-semibold">{t.audit.howToFix}</p>
                  <p className="mt-1 text-ink-soft">{g.help}</p>
                  <p className="mt-2 font-mono text-xs text-ink-soft">{g.ruleId}</p>
                </div>
                <ul className="space-y-3">
                  {g.issues.slice(0, URLS_PER_RULE).map((i) => (
                    <li key={i.id} className="border-l-2 border-rule pl-3 text-sm">
                      <a href={i.url} target="_blank" rel="noreferrer" className="break-all font-mono text-signal hover:underline">
                        {pathOf(i.url)}
                      </a>
                      <p className="mt-0.5">{i.text}</p>
                      {i.evidence && <p className="mt-0.5 break-all text-ink-soft">↳ {i.evidence}</p>}
                      {i.fix_hint && (
                        <p className="mt-1 font-mono text-xs text-ink-soft">
                          {t.audit.fix}: {i.fix_hint.action} <span className="text-ink">{i.fix_hint.target}</span>
                          {i.fix_hint.value && <> = &quot;{i.fix_hint.value}&quot;</>}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
                {g.issues.length > URLS_PER_RULE && (
                  <p className="mt-3 text-sm text-ink-soft">{t.audit.more(g.issues.length - URLS_PER_RULE)}</p>
                )}
              </div>
            </details>
          ))}
        </Panel>
      )}

      <details className="mt-10">
        <summary className="cursor-pointer text-xl font-bold tracking-tight">{t.audit.crawledPages(pages.length)}</summary>
        <Panel className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wider text-ink-soft">
              <tr className="border-b border-rule">
                <th className="px-4 py-2 font-medium">{t.audit.table.url}</th>
                <th className="px-4 py-2 font-medium">{t.audit.table.status}</th>
                <th className="px-4 py-2 font-medium">{t.audit.table.depth}</th>
                <th className="px-4 py-2 font-medium">{t.audit.table.words}</th>
                <th className="px-4 py-2 font-medium">{t.audit.table.time}</th>
                <th className="px-4 py-2 text-right font-medium">{t.audit.table.issues}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rule">
              {pages.map((p) => (
                <tr key={p.id}>
                  <td className="max-w-md px-4 py-2">
                    <p className="truncate font-mono">{pathOf(p.url)}</p>
                    {p.title && <p className="truncate text-xs text-ink-soft">{p.title}</p>}
                  </td>
                  <td className={`px-4 py-2 tabular-nums ${p.status >= 400 || p.status === 0 ? "text-critical" : ""}`}>
                    {p.status || "ERR"}
                    {p.final_url !== p.url && <span className="text-ink-soft"> → {pathOf(p.final_url)}</span>}
                  </td>
                  <td className="px-4 py-2 tabular-nums">{p.depth}</td>
                  <td className="px-4 py-2 tabular-nums">{p.word_count ?? "–"}</td>
                  <td className="px-4 py-2 tabular-nums">{p.response_time_ms} ms</td>
                  <td className="px-4 py-2 text-right tabular-nums">
                    {(perUrl.get(p.final_url) ?? perUrl.get(p.url))?.n ?? 0}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      </details>
    </Shell>
  );
}

function FilterChip({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 tabular-nums ${
        active ? "border-signal bg-signal text-signal-ink" : "border-rule bg-panel hover:border-signal"
      }`}
    >
      {children}
    </Link>
  );
}
