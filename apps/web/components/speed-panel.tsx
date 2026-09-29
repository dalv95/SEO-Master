import type { PageSpeedResult } from "@seo-master/shared";
import type { Locale } from "@seo-master/seo-rules";
import { pathOf } from "@/lib/format";
import { INTL_LOCALE } from "@/lib/i18n/intl";
import type { Dictionary } from "@/lib/i18n/en";
import { Panel } from "./ui";

type Rating = "good" | "fair" | "poor";

/** Google's Core Web Vitals / Lighthouse bands: [good up to, poor above]. */
const BANDS = { lcp: [2500, 4000], inp: [200, 500], cls: [0.1, 0.25], tbt: [200, 600] } as const;
const TONE: Record<Rating, string> = { good: "text-good", fair: "text-warning", poor: "text-critical" };

const rate = (metric: keyof typeof BANDS, v: number): Rating =>
  v <= BANDS[metric][0] ? "good" : v <= BANDS[metric][1] ? "fair" : "poor";
const rateScore = (s: number): Rating => (s >= 90 ? "good" : s >= 50 ? "fair" : "poor");

function Metric({ value, rating }: { value: string; rating: Rating | null }) {
  return <td className={`px-3 py-2 text-right tabular-nums ${rating ? TONE[rating] : "text-ink-soft"}`}>{value}</td>;
}

/** Per-page Core Web Vitals and the biggest Lighthouse opportunities across tested pages. */
export function SpeedPanel({
  results,
  t,
  locale,
}: {
  results: PageSpeedResult[] | null;
  t: Dictionary;
  locale: Locale;
}) {
  if (!results?.length) return <p className="mt-8 text-sm text-ink-soft print:hidden">{t.speed.notRun}</p>;

  const ok = results.filter((r) => !r.error);
  const fieldSource = ok.find((r) => r.field)?.field?.source;
  const fmt = (n: number, digits: number) =>
    n.toLocaleString(INTL_LOCALE[locale], { minimumFractionDigits: digits, maximumFractionDigits: digits });

  // Same insight on several pages: keep the largest saving and count pages.
  const opportunities = [
    ...ok
      .flatMap((r) => r.opportunities.map((o) => ({ ...o, url: r.url })))
      .reduce((m, o) => {
        const cur = m.get(o.id);
        if (!cur) m.set(o.id, { ...o, urls: new Set([o.url]) });
        else {
          cur.urls.add(o.url);
          if (o.savingsMs > cur.savingsMs) Object.assign(cur, { savingsMs: o.savingsMs, displayValue: o.displayValue });
        }
        return m;
      }, new Map<string, PageSpeedResult["opportunities"][number] & { urls: Set<string> }>())
      .values(),
  ]
    .sort((a, b) => b.savingsMs - a.savingsMs || b.urls.size - a.urls.size)
    .slice(0, 6);

  return (
    <section className="mt-10">
      <h2 className="text-xl font-bold tracking-tight">{t.speed.title}</h2>
      <p className="mt-1 text-sm text-ink-soft">
        {fieldSource === "url" ? t.speed.fieldUrl : fieldSource === "origin" ? t.speed.fieldOrigin : t.speed.labOnly}
      </p>
      <Panel className="mt-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-xs uppercase tracking-wider text-ink-soft">
            <tr className="border-b border-rule">
              <th className="px-3 py-2 text-left font-medium">{t.speed.page}</th>
              <th className="px-3 py-2 text-right font-medium">{t.speed.score}</th>
              <th className="px-3 py-2 text-right font-medium">LCP</th>
              <th className="px-3 py-2 text-right font-medium">INP</th>
              <th className="px-3 py-2 text-right font-medium">CLS</th>
              <th className="px-3 py-2 text-right font-medium">TBT</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-rule">
            {results.map((r) => {
              const lcp = r.field?.lcpMs ?? r.lab.lcpMs;
              const cls = r.field?.cls ?? r.lab.cls;
              const inp = r.field?.inpMs ?? null;
              return (
                <tr key={`${r.url}-${r.strategy}`}>
                  <td className="max-w-xs px-3 py-2">
                    <span className="block truncate font-mono">{pathOf(r.url)}</span>
                    <span className="text-xs text-ink-soft">{t.speed.device[r.strategy]}</span>
                  </td>
                  {r.error ? (
                    <td colSpan={5} className="px-3 py-2 text-right text-critical">
                      {t.speed.failed}
                    </td>
                  ) : (
                    <>
                      <td
                        className={`px-3 py-2 text-right text-lg font-bold tabular-nums ${r.score === null ? "" : TONE[rateScore(r.score)]}`}
                      >
                        {r.score ?? "–"}
                      </td>
                      <Metric value={lcp === null ? "–" : `${fmt(lcp / 1000, 1)} s`} rating={lcp === null ? null : rate("lcp", lcp)} />
                      <Metric value={inp === null ? "–" : `${inp} ms`} rating={inp === null ? null : rate("inp", inp)} />
                      <Metric value={cls === null ? "–" : fmt(cls, 2)} rating={cls === null ? null : rate("cls", cls)} />
                      <Metric
                        value={r.lab.tbtMs === null ? "–" : `${Math.round(r.lab.tbtMs)} ms`}
                        rating={r.lab.tbtMs === null ? null : rate("tbt", r.lab.tbtMs)}
                      />
                    </>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </Panel>
      <p className="mt-2 text-xs text-ink-soft">{t.speed.legend}</p>

      {opportunities.length > 0 && (
        <>
          <h3 className="mt-6 font-semibold">{t.speed.opportunities}</h3>
          <ul className="mt-2 space-y-2 text-sm">
            {opportunities.map((o) => (
              <li key={o.id} className="flex flex-wrap items-baseline justify-between gap-x-4 border-l-2 border-rule pl-3">
                <span>
                  {t.insights[o.id] ?? o.title}
                  {/* PSI returns this text in English only. */}
                  {locale === "en" && o.displayValue && <span className="text-ink-soft"> · {o.displayValue}</span>}
                </span>
                <span className="text-xs text-ink-soft">
                  {o.savingsMs > 0 && <span className="font-semibold text-ink">{t.speed.savings(o.savingsMs)} · </span>}
                  {t.speed.pages(o.urls.size)}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
