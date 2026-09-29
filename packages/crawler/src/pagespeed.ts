import type { CrawlResult, PageSpeedResult, PageSpeedStrategy } from "@seo-master/shared";

const API = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed";
const TIMEOUT_MS = 90_000;
const CONCURRENCY = 3;

/* Minimal shape of the PSI v5 response we read. */
interface PsiMetric {
  percentile?: number;
  category?: string;
}
interface PsiExperience {
  origin_fallback?: boolean;
  overall_category?: string;
  metrics?: Record<string, PsiMetric>;
}
interface PsiAudit {
  id: string;
  title: string;
  score: number | null;
  numericValue?: number;
  displayValue?: string;
  metricSavings?: Record<string, number>;
}
interface PsiResponse {
  error?: { message?: string };
  loadingExperience?: PsiExperience;
  originLoadingExperience?: PsiExperience;
  lighthouseResult?: {
    categories: { performance?: { score: number | null; auditRefs: { id: string; group?: string }[] } };
    audits: Record<string, PsiAudit>;
  };
}

const num = (v: number | undefined) => (v === undefined || Number.isNaN(v) ? null : v);

function parseField(exp: PsiExperience | undefined, source: "url" | "origin"): PageSpeedResult["field"] {
  const m = exp?.metrics;
  if (!m) return null;
  const cls = m.CUMULATIVE_LAYOUT_SHIFT_SCORE?.percentile;
  const category = exp?.overall_category;
  return {
    source,
    lcpMs: num(m.LARGEST_CONTENTFUL_PAINT_MS?.percentile),
    inpMs: num(m.INTERACTION_TO_NEXT_PAINT?.percentile),
    // CrUX reports CLS ×100.
    cls: cls === undefined ? null : cls / 100,
    category: category === "FAST" || category === "AVERAGE" || category === "SLOW" ? category : null,
  };
}

/** Converts a PSI v5 response into our compact result. Exported for tests. */
export function parsePageSpeed(url: string, strategy: PageSpeedStrategy, json: PsiResponse): PageSpeedResult {
  const lr = json.lighthouseResult;
  if (!lr) throw new Error(json.error?.message ?? "No Lighthouse result");
  const a = lr.audits;
  const perf = lr.categories.performance;

  // Lighthouse 12+ reports opportunities as failing "insights" with metric savings.
  const opportunities = (perf?.auditRefs ?? [])
    .filter((r) => r.group === "insights" || r.group === "diagnostics")
    .map((r) => a[r.id])
    .filter((x): x is PsiAudit => !!x && x.score !== null && x.score < 0.9)
    .map((x) => ({
      id: x.id,
      title: x.title,
      savingsMs: Math.max(0, ...Object.values(x.metricSavings ?? {})),
      ...(x.displayValue ? { displayValue: x.displayValue } : {}),
    }))
    .sort((p, q) => q.savingsMs - p.savingsMs)
    .slice(0, 6);

  const urlField = json.loadingExperience?.origin_fallback ? null : parseField(json.loadingExperience, "url");
  return {
    url,
    strategy,
    score: perf?.score === null || perf?.score === undefined ? null : Math.round(perf.score * 100),
    lab: {
      lcpMs: num(a["largest-contentful-paint"]?.numericValue),
      cls: num(a["cumulative-layout-shift"]?.numericValue),
      tbtMs: num(a["total-blocking-time"]?.numericValue),
      fcpMs: num(a["first-contentful-paint"]?.numericValue),
      siMs: num(a["speed-index"]?.numericValue),
    },
    field: urlField ?? parseField(json.originLoadingExperience, "origin"),
    opportunities,
  };
}

const emptyResult = (url: string, strategy: PageSpeedStrategy, error: string): PageSpeedResult => ({
  url,
  strategy,
  score: null,
  lab: { lcpMs: null, cls: null, tbtMs: null, fcpMs: null, siMs: null },
  field: null,
  opportunities: [],
  error,
});

/** One PSI run. Never throws; failures are returned in `error`. Retries once on 429/5xx. */
export async function runPageSpeed(url: string, strategy: PageSpeedStrategy, apiKey: string): Promise<PageSpeedResult> {
  const q = new URL(API);
  q.searchParams.set("url", url);
  q.searchParams.set("strategy", strategy);
  q.searchParams.set("category", "performance");
  q.searchParams.set("key", apiKey);
  let lastError = "";
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(q, { signal: AbortSignal.timeout(TIMEOUT_MS) });
      const json = (await res.json()) as PsiResponse;
      if (res.ok) return parsePageSpeed(url, strategy, json);
      // Never leak the key: PSI error messages don't contain it, but keep only the first line.
      lastError = (json.error?.message ?? `HTTP ${res.status}`).split("\n")[0]!;
      if (res.status !== 429 && res.status < 500) break;
    } catch (e) {
      lastError = (e as Error).message;
    }
  }
  return emptyResult(url, strategy, lastError);
}

/**
 * Picks the pages worth testing: the start page plus the most linked-to other pages
 * (a proxy for importance), shallowest first on ties.
 */
export function selectPageSpeedUrls(crawl: CrawlResult, max: number): string[] {
  const ok = crawl.pages.filter((p) => p.isHtml && p.status === 200);
  const inlinks = new Map<string, number>();
  for (const p of ok)
    for (const l of new Set(p.links.filter((l) => l.internal).map((l) => l.href)))
      inlinks.set(l, (inlinks.get(l) ?? 0) + 1);

  const start = ok.find((p) => p.url === crawl.startUrl)?.finalUrl;
  const seen = new Set<string>(start ? [start] : []);
  const others = ok
    .filter((p) => !seen.has(p.finalUrl))
    .sort(
      (a, b) =>
        (inlinks.get(b.finalUrl) ?? inlinks.get(b.url) ?? 0) - (inlinks.get(a.finalUrl) ?? inlinks.get(a.url) ?? 0) ||
        a.depth - b.depth,
    )
    .flatMap((p) => (seen.has(p.finalUrl) ? [] : (seen.add(p.finalUrl), [p.finalUrl])));
  return [...(start ? [start] : []), ...others].slice(0, max);
}

/** Mobile for every selected page (Google indexes mobile-first), plus desktop for the start page. */
export async function runPageSpeedForCrawl(
  crawl: CrawlResult,
  opts: { apiKey: string; maxPages?: number },
): Promise<PageSpeedResult[]> {
  const urls = selectPageSpeedUrls(crawl, opts.maxPages ?? 5);
  const jobs: [string, PageSpeedStrategy][] = urls.map((u) => [u, "mobile"]);
  if (urls[0]) jobs.splice(1, 0, [urls[0], "desktop"]);

  const results: PageSpeedResult[] = new Array(jobs.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, jobs.length) }, async () => {
      while (next < jobs.length) {
        const i = next++;
        const [url, strategy] = jobs[i]!;
        results[i] = await runPageSpeed(url, strategy, opts.apiKey);
      }
    }),
  );
  return results;
}
