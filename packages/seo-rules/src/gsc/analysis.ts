/** Aggregated Search Console stats for one query × page over a window (see gsc_query_page_stats). */
export interface QueryPageStat {
  query: string;
  page: string;
  clicks: number;
  impressions: number;
  /** Impression-weighted average position. */
  position: number;
}

export interface PageStat {
  page: string;
  clicks: number;
  impressions: number;
  position: number;
}

/**
 * Typical organic CTR by position (rounded; varies by niche and SERP features).
 * Used only to rank opportunities, never shown as a promise.
 */
const CTR_BY_POSITION = [0.28, 0.15, 0.11, 0.08, 0.065, 0.05, 0.04, 0.032, 0.028, 0.025];
export function expectedCtr(position: number): number {
  const p = Math.max(1, Math.round(position));
  return p <= 10 ? CTR_BY_POSITION[p - 1]! : p <= 20 ? 0.01 : 0.003;
}

interface QueryStat {
  query: string;
  clicks: number;
  impressions: number;
  position: number;
  /** Page with the most impressions for this query. */
  topPage: string;
  pages: number;
}

/** Collapses query × page rows to one row per query (impression-weighted position). */
export function byQuery(rows: QueryPageStat[]): QueryStat[] {
  const m = new Map<string, QueryStat & { posSum: number; topImpr: number }>();
  for (const r of rows) {
    const q = m.get(r.query);
    if (!q) {
      m.set(r.query, { ...r, topPage: r.page, pages: 1, posSum: r.position * r.impressions, topImpr: r.impressions });
      continue;
    }
    q.clicks += r.clicks;
    q.impressions += r.impressions;
    q.posSum += r.position * r.impressions;
    q.pages++;
    if (r.impressions > q.topImpr) {
      q.topImpr = r.impressions;
      q.topPage = r.page;
    }
  }
  return [...m.values()].map(({ posSum, topImpr: _, ...q }) => ({
    ...q,
    position: q.impressions ? posSum / q.impressions : q.position,
  }));
}

export interface Opportunity extends QueryStat {
  /** Estimated extra clicks per window if the query reached position 3. */
  potentialClicks: number;
}

/**
 * "Striking distance": queries ranking 4–20 with real demand. Moving these into the top 3
 * is usually the fastest traffic win (existing page, existing relevance).
 */
export function strikingDistance(rows: QueryPageStat[], opts: { minImpressions?: number; limit?: number } = {}): Opportunity[] {
  const minImpr = opts.minImpressions ?? 20;
  return byQuery(rows)
    .filter((q) => q.position >= 3.5 && q.position <= 20.5 && q.impressions >= minImpr)
    .map((q) => ({ ...q, potentialClicks: Math.max(0, Math.round(q.impressions * expectedCtr(3) - q.clicks)) }))
    .filter((q) => q.potentialClicks > 0)
    .sort((a, b) => b.potentialClicks - a.potentialClicks)
    .slice(0, opts.limit ?? 50);
}

export interface DecliningPage {
  page: string;
  clicks: number;
  previousClicks: number;
  change: number;
  position: number | null;
  previousPosition: number;
}

/** Pages that lost ≥ `minDrop` of their clicks versus the previous window (including pages that vanished). */
export function decliningPages(
  current: PageStat[],
  previous: PageStat[],
  opts: { minPreviousClicks?: number; minDrop?: number; limit?: number } = {},
): DecliningPage[] {
  const cur = new Map(current.map((p) => [p.page, p]));
  return previous
    .filter((p) => p.clicks >= (opts.minPreviousClicks ?? 10))
    .map((p) => {
      const now = cur.get(p.page);
      const clicks = now?.clicks ?? 0;
      return {
        page: p.page,
        clicks,
        previousClicks: p.clicks,
        change: (clicks - p.clicks) / p.clicks,
        position: now?.position ?? null,
        previousPosition: p.position,
      };
    })
    .filter((p) => p.change <= -(opts.minDrop ?? 0.3))
    .sort((a, b) => b.previousClicks - b.clicks - (a.previousClicks - a.clicks))
    .slice(0, opts.limit ?? 50);
}

export interface Cannibalization {
  query: string;
  impressions: number;
  clicks: number;
  pages: { page: string; impressions: number; clicks: number; position: number }[];
}

/**
 * Queries where several pages of the site compete: ≥ 2 pages each with a meaningful share of
 * impressions and none clearly winning (best position worse than 3).
 */
export function cannibalization(
  rows: QueryPageStat[],
  opts: { minImpressions?: number; minShare?: number; limit?: number } = {},
): Cannibalization[] {
  const minShare = opts.minShare ?? 0.1;
  const groups = Map.groupBy(rows, (r) => r.query);
  const out: Cannibalization[] = [];
  for (const [query, list] of groups) {
    const impressions = list.reduce((s, r) => s + r.impressions, 0);
    if (impressions < (opts.minImpressions ?? 20)) continue;
    const pages = list
      .filter((r) => r.impressions / impressions >= minShare)
      .sort((a, b) => b.impressions - a.impressions)
      .map(({ page, impressions, clicks, position }) => ({ page, impressions, clicks, position }));
    if (pages.length < 2 || Math.min(...pages.map((p) => p.position)) <= 3) continue;
    out.push({ query, impressions, clicks: list.reduce((s, r) => s + r.clicks, 0), pages });
  }
  return out.sort((a, b) => b.impressions - a.impressions).slice(0, opts.limit ?? 50);
}

export interface DailyStat {
  date: string;
  clicks: number;
  impressions: number;
  position: number;
}

export interface PeriodTotals {
  clicks: number;
  impressions: number;
  ctr: number;
  /** Impression-weighted. */
  position: number;
  days: number;
}

/** Totals for the inclusive date range [from, to] (ISO dates). */
export function totals(daily: DailyStat[], from: string, to: string): PeriodTotals {
  const rows = daily.filter((d) => d.date >= from && d.date <= to);
  const clicks = rows.reduce((s, d) => s + d.clicks, 0);
  const impressions = rows.reduce((s, d) => s + d.impressions, 0);
  const posSum = rows.reduce((s, d) => s + d.position * d.impressions, 0);
  return {
    clicks,
    impressions,
    ctr: impressions ? clicks / impressions : 0,
    position: impressions ? posSum / impressions : 0,
    days: rows.length,
  };
}
