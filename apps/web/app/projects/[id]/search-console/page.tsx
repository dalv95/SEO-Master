import Link from "next/link";
import { notFound } from "next/navigation";
import { ProjectTabs } from "@/components/project-tabs";
import { Shell } from "@/components/shell";
import { TrendChart } from "@/components/trend-chart";
import { Panel } from "@/components/ui";
import { displayUrl, formatDate, pathOf } from "@/lib/format";
import { loadGscReport, RANGES, trendSeries, type Range } from "@/lib/gsc-report";
import { getT, INTL_LOCALE } from "@/lib/i18n";
import { requireUser } from "@/lib/supabase/server";
import type { ProjectRow } from "@/lib/types";

export default async function SearchConsolePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ range?: string }>;
}) {
  const [{ id }, { range: r }, { supabase, user }, { t, locale }] = await Promise.all([
    params,
    searchParams,
    requireUser(),
    getT(),
  ]);
  const { data: project } = await supabase.from("projects").select("*").eq("id", id).maybeSingle<ProjectRow>();
  if (!project) notFound();
  const range: Range = r && r in RANGES ? (r as Range) : "3m";
  const report = project.gsc_property ? await loadGscReport(supabase, id) : null;

  const intl = INTL_LOCALE[locale];
  const num = new Intl.NumberFormat(intl);
  const pct = new Intl.NumberFormat(intl, { style: "percent", maximumFractionDigits: 1 });
  const dec = new Intl.NumberFormat(intl, { maximumFractionDigits: 1, minimumFractionDigits: 1 });

  return (
    <Shell email={user.email}>
      <Link href="/" className="text-sm text-ink-soft hover:text-ink">
        ← {t.allSites}
      </Link>
      <h1 className="mt-3 text-3xl font-bold tracking-tight">{project.name}</h1>
      <p className="font-mono text-sm text-ink-soft">{displayUrl(project.url)}</p>
      <ProjectTabs projectId={id} active="gsc" t={t} />

      {!report ? (
        <p className="mt-8 text-ink-soft">
          {project.gsc_property ? t.gsc.importing : t.gsc.notLinked}{" "}
          {!project.gsc_property && (
            <Link href={`/projects/${id}`} className="text-signal hover:underline">
              {t.gsc.linkOnProject}
            </Link>
          )}
        </p>
      ) : (
        <>
          <p className="mt-6 text-sm text-ink-soft">
            <span className="font-mono">{project.gsc_property}</span> ·{" "}
            {t.gsc.dataThrough(formatDate(report.end, locale))}
          </p>

          <section className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label={t.gsc.last28}>
            <Stat
              label={t.gsc.clicks}
              value={num.format(report.totals.current.clicks)}
              now={report.totals.current.clicks}
              prev={report.totals.previous.clicks}
              year={report.totals.year?.clicks}
              t={t}
              pct={pct}
            />
            <Stat
              label={t.gsc.impressions}
              value={num.format(report.totals.current.impressions)}
              now={report.totals.current.impressions}
              prev={report.totals.previous.impressions}
              year={report.totals.year?.impressions}
              t={t}
              pct={pct}
            />
            <Stat
              label={t.gsc.ctr}
              value={pct.format(report.totals.current.ctr)}
              now={report.totals.current.ctr}
              prev={report.totals.previous.ctr}
              year={report.totals.year?.ctr}
              t={t}
              pct={pct}
            />
            <Stat
              label={t.gsc.position}
              value={dec.format(report.totals.current.position)}
              now={report.totals.current.position}
              prev={report.totals.previous.position}
              year={report.totals.year?.position}
              lowerIsBetter
              absolute={dec}
              t={t}
              pct={pct}
            />
          </section>

          <Panel className="mt-6 p-5">
            <nav aria-label={t.gsc.rangeLabel} className="flex flex-wrap gap-2 text-sm">
              {(Object.keys(RANGES) as Range[]).map((k) => (
                <Link
                  key={k}
                  href={`?range=${k}`}
                  scroll={false}
                  aria-current={k === range ? "true" : undefined}
                  className={`rounded-full border px-3 py-1 ${
                    k === range ? "border-signal bg-signal text-signal-ink" : "border-rule hover:border-signal"
                  }`}
                >
                  {t.gsc.range[k]}
                </Link>
              ))}
            </nav>
            <div className="mt-5 grid gap-8 md:grid-cols-2">
              {(["clicks", "impressions"] as const).map((m) => {
                const s = trendSeries(report.daily, range, m, intl);
                return (
                  <TrendChart
                    key={m}
                    points={s.points}
                    weekly={s.weekly}
                    title={m === "clicks" ? t.gsc.clicksPerDay : t.gsc.impressionsPerDay}
                    subtitle={s.weekly ? t.gsc.perWeek : t.gsc.perDay}
                    separators={locale === "pl" ? [" ", ","] : [",", "."]}
                    tableLabel={t.gsc.showTable}
                    dateLabel={t.gsc.date}
                  />
                );
              })}
            </div>
          </Panel>

          <Section title={t.gsc.opportunities} help={t.gsc.opportunitiesHelp}>
            <Table
              empty={t.gsc.none}
              head={[t.gsc.query, t.gsc.position, t.gsc.impressions, t.gsc.clicks, t.gsc.potential]}
              rows={report.opportunities.map((o) => [
                <QueryCell key="q" query={o.query} page={o.topPage} />,
                dec.format(o.position),
                num.format(o.impressions),
                num.format(o.clicks),
                <span key="p" className="font-semibold text-good">
                  +{num.format(o.potentialClicks)}
                </span>,
              ])}
            />
          </Section>

          <Section title={t.gsc.declining} help={t.gsc.decliningHelp}>
            <Table
              empty={t.gsc.none}
              head={[t.gsc.page, t.gsc.before, t.gsc.now, t.gsc.change, t.gsc.position]}
              rows={report.declining.map((p) => [
                <PageCell key="p" url={p.page} />,
                num.format(p.previousClicks),
                num.format(p.clicks),
                <span key="c" className="font-semibold text-critical">
                  {pct.format(p.change)}
                </span>,
                `${dec.format(p.previousPosition)} → ${p.position === null ? "–" : dec.format(p.position)}`,
              ])}
            />
          </Section>

          <Section title={t.gsc.cannibalization} help={t.gsc.cannibalizationHelp}>
            {report.cannibalization.length === 0 ? (
              <p className="text-sm text-ink-soft">{t.gsc.none}</p>
            ) : (
              <Panel className="divide-y divide-rule">
                {report.cannibalization.map((c) => (
                  <div key={c.query} className="px-4 py-3 text-sm">
                    <p className="font-medium">
                      {c.query} <span className="font-normal text-ink-soft">· {num.format(c.impressions)} {t.gsc.impressions.toLowerCase()}</span>
                    </p>
                    <ul className="mt-1 space-y-0.5">
                      {c.pages.map((p) => (
                        <li key={p.page} className="flex justify-between gap-4 text-ink-soft">
                          <a href={p.page} target="_blank" rel="noreferrer" className="truncate font-mono hover:text-signal">
                            {pathOf(p.page)}
                          </a>
                          <span className="shrink-0 tabular-nums">
                            {num.format(p.impressions)} · {dec.format(p.position)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </Panel>
            )}
          </Section>

          <div className="grid gap-x-8 lg:grid-cols-2">
            <Section title={t.gsc.topQueries}>
              <Table
                empty={t.gsc.none}
                head={[t.gsc.query, t.gsc.clicks, t.gsc.change, t.gsc.position]}
                rows={report.topQueries.map((q) => [
                  <span key="q" className="break-words">{q.query}</span>,
                  num.format(q.clicks),
                  <Delta key="d" now={q.clicks} prev={q.previousClicks} />,
                  dec.format(q.position),
                ])}
              />
            </Section>
            <Section title={t.gsc.topPages}>
              <Table
                empty={t.gsc.none}
                head={[t.gsc.page, t.gsc.clicks, t.gsc.change, t.gsc.position]}
                rows={report.topPages.map((p) => [
                  <PageCell key="p" url={p.page} />,
                  num.format(p.clicks),
                  <Delta key="d" now={p.clicks} prev={p.previousClicks} />,
                  dec.format(p.position),
                ])}
              />
            </Section>
          </div>
        </>
      )}
    </Shell>
  );
}

function Section({ title, help, children }: { title: string; help?: string; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="text-xl font-bold tracking-tight">{title}</h2>
      {help && <p className="mt-1 max-w-3xl text-sm text-ink-soft">{help}</p>}
      <div className="mt-3">{children}</div>
    </section>
  );
}

function Table({ head, rows, empty }: { head: string[]; rows: React.ReactNode[][]; empty: string }) {
  if (!rows.length) return <p className="text-sm text-ink-soft">{empty}</p>;
  return (
    <Panel className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-xs uppercase tracking-wider text-ink-soft">
          <tr className="border-b border-rule">
            {head.map((h, i) => (
              <th key={h} className={`px-3 py-2 font-medium ${i ? "text-right" : "text-left"}`}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-rule">
          {rows.map((cells, r) => (
            <tr key={r}>
              {cells.map((c, i) => (
                <td key={i} className={`px-3 py-2 ${i ? "text-right tabular-nums whitespace-nowrap" : "max-w-sm"}`}>
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </Panel>
  );
}

function QueryCell({ query, page }: { query: string; page: string }) {
  return (
    <>
      <span className="block break-words font-medium">{query}</span>
      <a href={page} target="_blank" rel="noreferrer" className="block truncate font-mono text-xs text-ink-soft hover:text-signal">
        {pathOf(page)}
      </a>
    </>
  );
}

function PageCell({ url }: { url: string }) {
  return (
    <a href={url} target="_blank" rel="noreferrer" className="block truncate font-mono hover:text-signal">
      {pathOf(url)}
    </a>
  );
}

function Delta({ now, prev }: { now: number; prev: number }) {
  if (!prev) return <span className="text-ink-soft">–</span>;
  const change = (now - prev) / prev;
  const tone = change > 0.005 ? "text-good" : change < -0.005 ? "text-critical" : "text-ink-soft";
  return (
    <span className={tone}>
      {change > 0 ? "+" : ""}
      {Math.round(change * 100)}%
    </span>
  );
}

/** Stat tile: value, change vs previous 28 days (colored by whether it's good), and vs a year ago. */
function Stat({
  label,
  value,
  now,
  prev,
  year,
  lowerIsBetter,
  absolute,
  t,
  pct,
}: {
  label: string;
  value: string;
  now: number;
  prev: number;
  year?: number;
  lowerIsBetter?: boolean;
  /** Show the change as an absolute difference (position) instead of a percentage. */
  absolute?: Intl.NumberFormat;
  t: Awaited<ReturnType<typeof getT>>["t"];
  pct: Intl.NumberFormat;
}) {
  const fmt = (base: number) => {
    if (!base) return null;
    const diff = now - base;
    const text = absolute ? `${diff > 0 ? "+" : ""}${absolute.format(diff)}` : `${diff > 0 ? "+" : ""}${pct.format(diff / base)}`;
    const good = lowerIsBetter ? diff < 0 : diff > 0;
    return { text, arrow: diff > 0 ? "▲" : diff < 0 ? "▼" : "", tone: Math.abs(diff / base) < 0.005 ? "text-ink-soft" : good ? "text-good" : "text-critical" };
  };
  const p = fmt(prev);
  const y = year === undefined ? null : fmt(year);
  return (
    <Panel className="p-4">
      <p className="text-sm text-ink-soft">{label}</p>
      <p className="mt-1 text-3xl font-bold tracking-tight">{value}</p>
      {p && (
        <p className={`mt-1 text-sm font-medium ${p.tone}`}>
          {p.arrow} {p.text} <span className="font-normal text-ink-soft">{t.gsc.vsPrevious}</span>
        </p>
      )}
      {y && (
        <p className="text-xs text-ink-soft">
          {y.text} {t.gsc.vsYear}
        </p>
      )}
    </Panel>
  );
}
