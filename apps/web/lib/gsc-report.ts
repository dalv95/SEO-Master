import { gsc } from "@seo-master/seo-rules";
import type { SupabaseClient } from "@supabase/supabase-js";

const DAY = 86_400_000;
export const iso = (d: Date) => d.toISOString().slice(0, 10);
export const shift = (date: string, days: number) => iso(new Date(new Date(`${date}T00:00:00Z`).getTime() + days * DAY));

export const RANGES = { "28d": 28, "3m": 91, "12m": 364, "16m": 486 } as const;
export type Range = keyof typeof RANGES;

interface StatRow {
  query?: string;
  page: string;
  clicks: number;
  impressions: number;
  avg_position: number | null;
}
const toStat = (r: StatRow) => ({
  query: r.query ?? "",
  page: r.page,
  clicks: Number(r.clicks),
  impressions: Number(r.impressions),
  position: Number(r.avg_position ?? 0),
});

/**
 * Everything the Search Console tab shows. Windows end at the latest imported day (Google lags
 * 2–3 days): current = last 28 days, previous = the 28 before, year ago = same 28 days −364.
 */
export async function loadGscReport(supabase: SupabaseClient, projectId: string) {
  const { data: dailyRows } = await supabase
    .from("gsc_daily")
    .select("date, clicks, impressions, position")
    .eq("project_id", projectId)
    .order("date");
  const daily = (dailyRows ?? []) as gsc.DailyStat[];
  if (!daily.length) return null;

  const end = daily.at(-1)!.date;
  const cur = { from: shift(end, -27), to: end };
  const prev = { from: shift(end, -55), to: shift(end, -28) };
  const year = { from: shift(cur.from, -364), to: shift(end, -364) };

  const rpc = async (fn: string, w: { from: string; to: string }) => {
    const { data, error } = await supabase.rpc(fn, { p_project: projectId, p_from: w.from, p_to: w.to });
    if (error) throw new Error(error.message);
    return ((data ?? []) as StatRow[]).map(toStat);
  };
  const [curQP, prevQP, curPages, prevPages] = await Promise.all([
    rpc("gsc_query_page_stats", cur),
    rpc("gsc_query_page_stats", prev),
    rpc("gsc_page_stats", cur),
    rpc("gsc_page_stats", prev),
  ]);

  const prevQueries = new Map(gsc.byQuery(prevQP).map((q) => [q.query, q]));
  const prevPageMap = new Map(prevPages.map((p) => [p.page, p]));
  const yearTotals = gsc.totals(daily, year.from, year.to);

  return {
    end,
    daily,
    totals: {
      current: gsc.totals(daily, cur.from, cur.to),
      previous: gsc.totals(daily, prev.from, prev.to),
      // Only meaningful with (nearly) a full year-ago window.
      year: yearTotals.days >= 20 ? yearTotals : null,
    },
    opportunities: gsc.strikingDistance(curQP, { limit: 25 }),
    declining: gsc.decliningPages(curPages, prevPages, { limit: 20 }),
    cannibalization: gsc.cannibalization(curQP, { limit: 15 }),
    topQueries: gsc
      .byQuery(curQP)
      .sort((a, b) => b.clicks - a.clicks || b.impressions - a.impressions)
      .slice(0, 20)
      .map((q) => ({ ...q, previousClicks: prevQueries.get(q.query)?.clicks ?? 0 })),
    topPages: [...curPages]
      .sort((a, b) => b.clicks - a.clicks || b.impressions - a.impressions)
      .slice(0, 20)
      .map((p) => ({ ...p, previousClicks: prevPageMap.get(p.page)?.clicks ?? 0 })),
  };
}

/** Daily points for short ranges, weekly sums (weeks ending on the last day) for long ones. */
export function trendSeries(daily: gsc.DailyStat[], range: Range, metric: "clicks" | "impressions", intlLocale = "en-GB") {
  const series = rawTrendSeries(daily, range, metric);
  const day = new Intl.DateTimeFormat(intlLocale, { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
  const short = new Intl.DateTimeFormat(intlLocale, { day: "numeric", month: "short", timeZone: "UTC" });
  const month = new Intl.DateTimeFormat(intlLocale, { month: "short", year: "2-digit", timeZone: "UTC" });
  const long = RANGES[range] > 120;
  return {
    weekly: series.weekly,
    points: series.points.map((p) => {
      const d = new Date(`${p.date}T00:00:00Z`);
      return { ...p, label: day.format(d), tick: (long ? month : short).format(d) };
    }),
  };
}

function rawTrendSeries(daily: gsc.DailyStat[], range: Range, metric: "clicks" | "impressions") {
  const end = daily.at(-1)!.date;
  const from = shift(end, -(RANGES[range] - 1));
  const rows = daily.filter((d) => d.date >= from);
  const weekly = RANGES[range] > 120;
  if (!weekly) return { weekly, points: rows.map((d) => ({ date: d.date, value: d[metric] })) };
  const buckets = new Map<string, { value: number; days: number }>();
  for (const d of rows) {
    const daysBack = Math.round((Date.parse(`${end}T00:00:00Z`) - Date.parse(`${d.date}T00:00:00Z`)) / DAY);
    const start = shift(end, -(Math.floor(daysBack / 7) * 7 + 6));
    const b = buckets.get(start) ?? { value: 0, days: 0 };
    buckets.set(start, { value: b.value + d[metric], days: b.days + 1 });
  }
  // A partial first week would look like a traffic drop; show complete weeks only.
  const points = [...buckets]
    .filter(([, b]) => b.days === 7)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, b]) => ({ date, value: b.value }));
  return { weekly, points };
}
