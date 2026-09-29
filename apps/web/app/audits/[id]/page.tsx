import Link from "next/link";
import { notFound } from "next/navigation";
import { ruleById } from "@seo-master/seo-rules";
import { ISSUE_CATEGORIES, type IssueCategory, type Severity } from "@seo-master/shared";
import { AutoRefresh } from "@/components/auto-refresh";
import { CrawlSpectrum, type SpectrumPage } from "@/components/crawl-spectrum";
import { Shell } from "@/components/shell";
import { Panel, Score, SeverityDot } from "@/components/ui";
import { CATEGORY_LABEL, displayUrl, pathOf, scoreTone } from "@/lib/format";
import { requireUser } from "@/lib/supabase/server";
import type { AuditIssueRow, AuditPageRow, AuditRow, ProjectRow } from "@/lib/types";

const SEVERITIES: Severity[] = ["critical", "warning", "notice"];
const RANK: Record<Severity, number> = { critical: 0, warning: 1, notice: 2 };
const URLS_PER_RULE = 50;

type Search = { severity?: string; category?: string };

export default async function AuditPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Search>;
}) {
  const [{ id }, search] = await Promise.all([params, searchParams]);
  const { supabase, user } = await requireUser();

  const { data: audit } = await supabase.from("audits").select("*").eq("id", id).maybeSingle<AuditRow>();
  if (!audit) notFound();
  const { data: project } = await supabase
    .from("projects")
    .select("*")
    .eq("id", audit.project_id)
    .single<ProjectRow>();

  if (audit.status !== "completed") {
    return (
      <Shell email={user.email}>
        {audit.status !== "failed" && <AutoRefresh />}
        <Link href={`/projects/${audit.project_id}`} className="text-sm text-ink-soft hover:text-ink">
          ← {project?.name}
        </Link>
        <Panel className="mt-6 p-8">
          {audit.status === "failed" ? (
            <>
              <h1 className="text-2xl font-bold">The audit didn&apos;t finish</h1>
              <p className="mt-2 text-critical">{audit.error}</p>
              <p className="mt-2 text-ink-soft">Check that the site is reachable, then run a new audit from the site page.</p>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-bold">
                {audit.status === "queued" ? "Waiting for a crawler…" : "Crawling your site…"}
              </h1>
              <p className="mt-2 font-mono text-ink-soft">
                {audit.pages_crawled} / {audit.max_pages} pages
              </p>
              <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-rule">
                <div
                  className="h-full bg-signal transition-[width] duration-700"
                  style={{ width: `${Math.max(2, (100 * audit.pages_crawled) / audit.max_pages)}%` }}
                />
              </div>
              <p className="mt-4 text-sm text-ink-soft">This page updates by itself. The report appears when the crawl is done.</p>
            </>
          )}
        </Panel>
      </Shell>
    );
  }

  const [{ data: issueData }, { data: pageData }] = await Promise.all([
    supabase.from("audit_issues").select("*").eq("audit_id", id).limit(20000).returns<AuditIssueRow[]>(),
    supabase
      .from("audit_pages")
      .select("id, url, final_url, status, depth, is_html, title, word_count, response_time_ms")
      .eq("audit_id", id)
      .order("id")
      .limit(5000)
      .returns<AuditPageRow[]>(),
  ]);
  const issues = issueData ?? [];
  const pages = pageData ?? [];

  // Worst severity and count per page URL, for the spectrum.
  const perUrl = new Map<string, { worst: Severity; n: number }>();
  for (const i of issues) {
    const cur = perUrl.get(i.url);
    if (!cur) perUrl.set(i.url, { worst: i.severity, n: 1 });
    else {
      cur.n++;
      if (RANK[i.severity] < RANK[cur.worst]) cur.worst = i.severity;
    }
  }
  const seenFinal = new Set<string>();
  const spectrum = pages.flatMap((p): SpectrumPage[] => {
    if (p.is_html && p.status === 200) {
      if (seenFinal.has(p.final_url)) return [];
      seenFinal.add(p.final_url);
    }
    const s = perUrl.get(p.final_url) ?? perUrl.get(p.url);
    if (p.status === 0 || p.status >= 400) return [{ url: p.url, worst: "error", issues: s?.n ?? 1 }];
    return [{ url: p.final_url, worst: s?.worst ?? "clean", issues: s?.n ?? 0 }];
  });

  const severity = SEVERITIES.includes(search.severity as Severity) ? (search.severity as Severity) : undefined;
  const category = ISSUE_CATEGORIES.includes(search.category as IssueCategory)
    ? (search.category as IssueCategory)
    : undefined;
  const filtered = issues.filter((i) => (!severity || i.severity === severity) && (!category || i.category === category));

  const groups = [...Map.groupBy(filtered, (i) => i.rule_id).entries()]
    .map(([ruleId, list]) => ({ ruleId, list, severity: list[0]!.severity, category: list[0]!.category }))
    .sort((a, b) => RANK[a.severity] - RANK[b.severity] || b.list.length - a.list.length);

  const bySeverity = Object.fromEntries(SEVERITIES.map((s) => [s, issues.filter((i) => i.severity === s).length]));
  const href = (next: Search) => {
    const q = new URLSearchParams(Object.entries({ severity, category, ...next }).filter(([, v]) => v) as [string, string][]);
    return `?${q}`;
  };

  return (
    <Shell email={user.email}>
      <Link href={`/projects/${audit.project_id}`} className="text-sm text-ink-soft hover:text-ink">
        ← {project?.name}
      </Link>

      <div className="mt-4 grid gap-6 lg:grid-cols-[auto_1fr] lg:items-center">
        <div className="flex items-baseline gap-4">
          <Score value={audit.score} className="text-7xl font-bold leading-none tracking-tighter sm:text-8xl" />
          <div>
            <p className="font-mono text-sm text-ink-soft">{project && displayUrl(project.url)}</p>
            <p className="text-sm text-ink-soft">
              {audit.pages_crawled} pages ·{" "}
              {new Date(audit.created_at).toLocaleDateString("en-GB", { dateStyle: "medium" })}
            </p>
            <p className="mt-1 text-xs text-ink-soft">
              robots.txt {audit.crawl_summary?.robotsTxt.found ? "✓" : "✗"} · sitemap{" "}
              {audit.crawl_summary?.sitemap.found ? `✓ ${audit.crawl_summary.sitemap.urls} URLs` : "✗"}
            </p>
          </div>
        </div>
        <ul className="grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-3">
          {audit.category_scores?.map((c) => (
            <li key={c.category}>
              <Link href={href({ category: category === c.category ? undefined : c.category })} className="group block">
                <div className="flex justify-between text-sm">
                  <span className={category === c.category ? "font-semibold text-signal" : "group-hover:text-signal"}>
                    {CATEGORY_LABEL[c.category]}
                  </span>
                  <Score value={c.score} className="font-semibold" />
                </div>
                <div className="mt-1 h-1 rounded-full bg-rule">
                  <div
                    className={`h-full rounded-full ${{ good: "bg-good", fair: "bg-warning", poor: "bg-critical", none: "" }[scoreTone(c.score)]}`}
                    style={{ width: `${c.score}%` }}
                  />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </div>

      <Panel className="mt-8 p-5">
        <CrawlSpectrum pages={spectrum} />
      </Panel>

      <div className="mt-10 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold tracking-tight">
          What to fix
          {category && <span className="text-ink-soft"> · {CATEGORY_LABEL[category]}</span>}
        </h2>
        <nav className="flex flex-wrap gap-2 text-sm" aria-label="Filter by severity">
          <FilterChip href={href({ severity: undefined })} active={!severity}>
            All {issues.length}
          </FilterChip>
          {SEVERITIES.map((s) => (
            <FilterChip key={s} href={href({ severity: s })} active={severity === s}>
              <SeverityDot severity={s} /> {s} {bySeverity[s]}
            </FilterChip>
          ))}
          {category && (
            <FilterChip href={href({ category: undefined })} active={false}>
              ✕ {CATEGORY_LABEL[category]}
            </FilterChip>
          )}
        </nav>
      </div>

      {groups.length === 0 ? (
        <p className="mt-4 text-ink-soft">No issues match these filters.</p>
      ) : (
        <Panel className="mt-4 divide-y divide-rule">
          {groups.map((g) => {
            const rule = ruleById.get(g.ruleId);
            const pagesAffected = new Set(g.list.map((i) => i.url)).size;
            return (
              <details key={g.ruleId} className="group">
                <summary className="flex cursor-pointer list-none items-center gap-3 px-5 py-4 hover:bg-paper/60">
                  <SeverityDot severity={g.severity} />
                  <span className="flex-1 font-medium">{rule?.title ?? g.ruleId}</span>
                  <span className="hidden text-xs text-ink-soft sm:inline">{CATEGORY_LABEL[g.category]}</span>
                  <span className="w-24 text-right text-sm tabular-nums text-ink-soft">
                    {pagesAffected} {pagesAffected === 1 ? "page" : "pages"}
                  </span>
                  <span aria-hidden className="text-ink-soft transition-transform group-open:rotate-90">
                    ›
                  </span>
                </summary>
                <div className="px-5 pb-4">
                  <p className="mb-3 font-mono text-xs text-ink-soft">{g.ruleId}</p>
                  <ul className="space-y-3">
                    {g.list.slice(0, URLS_PER_RULE).map((i) => (
                      <li key={i.id} className="border-l-2 border-rule pl-3 text-sm">
                        <a href={i.url} target="_blank" rel="noreferrer" className="break-all font-mono text-signal hover:underline">
                          {pathOf(i.url)}
                        </a>
                        <p className="mt-0.5">{i.message}</p>
                        {i.evidence && <p className="mt-0.5 break-all text-ink-soft">↳ {i.evidence}</p>}
                        {i.fix_hint && (
                          <p className="mt-1 font-mono text-xs text-ink-soft">
                            fix: {i.fix_hint.action} <span className="text-ink">{i.fix_hint.target}</span>
                            {i.fix_hint.value && <> = &quot;{i.fix_hint.value}&quot;</>}
                          </p>
                        )}
                      </li>
                    ))}
                  </ul>
                  {g.list.length > URLS_PER_RULE && (
                    <p className="mt-3 text-sm text-ink-soft">…and {g.list.length - URLS_PER_RULE} more</p>
                  )}
                </div>
              </details>
            );
          })}
        </Panel>
      )}

      <details className="mt-10">
        <summary className="cursor-pointer text-xl font-bold tracking-tight">Crawled pages ({pages.length})</summary>
        <Panel className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wider text-ink-soft">
              <tr className="border-b border-rule">
                <th className="px-4 py-2 font-medium">URL</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium">Depth</th>
                <th className="px-4 py-2 font-medium">Words</th>
                <th className="px-4 py-2 font-medium">Time</th>
                <th className="px-4 py-2 text-right font-medium">Issues</th>
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
                  <td className="px-4 py-2 text-right tabular-nums">{(perUrl.get(p.final_url) ?? perUrl.get(p.url))?.n ?? 0}</td>
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
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 capitalize tabular-nums ${
        active ? "border-signal bg-signal text-signal-ink" : "border-rule bg-panel hover:border-signal"
      }`}
    >
      {children}
    </Link>
  );
}
