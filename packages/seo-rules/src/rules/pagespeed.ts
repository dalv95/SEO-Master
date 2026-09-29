import type { PageSpeedResult } from "@seo-master/shared";
import type { AuditContext } from "../context";
import { siteRule, type Finding } from "../rule";

/** Google's Core Web Vitals "good" thresholds (p75). */
export const LCP_GOOD_MS = 2500;
export const INP_GOOD_MS = 200;
export const CLS_GOOD = 0.1;
export const SCORE_LOW = 50;

const tested = (ctx: AuditContext) => (ctx.crawl.pageSpeed ?? []).filter((r) => !r.error);
const population = (ctx: AuditContext) => new Set(tested(ctx).map((r) => r.url)).size;

/** Real-user (CrUX) data wins over the lab measurement when available. */
function measure(r: PageSpeedResult, field: number | null | undefined, lab: number | null | undefined) {
  if (field !== null && field !== undefined) return { value: field, source: r.field!.source === "url" ? "field" : "origin" };
  if (lab !== null && lab !== undefined) return { value: lab, source: "lab" };
  return null;
}

const perResult = (ctx: AuditContext, check: (r: PageSpeedResult) => Finding | null) =>
  tested(ctx).flatMap((r) => {
    const f = check(r);
    return f ? [{ url: r.url, ...f }] : [];
  });

export const pageSpeedRules = [
  siteRule({ id: "cwv-lcp-slow", category: "performance", severity: "warning", population }, (ctx) =>
    perResult(ctx, (r) => {
      const m = measure(r, r.field?.lcpMs, r.lab.lcpMs);
      return m && m.value > LCP_GOOD_MS
        ? { params: { ms: Math.round(m.value), max: LCP_GOOD_MS, strategy: r.strategy, source: m.source } }
        : null;
    }),
  ),
  // INP needs real interactions: there is no lab equivalent, so field data only.
  siteRule({ id: "cwv-inp-slow", category: "performance", severity: "warning", population }, (ctx) =>
    perResult(ctx, (r) => {
      const m = measure(r, r.field?.inpMs, null);
      return m && m.value > INP_GOOD_MS
        ? { params: { ms: Math.round(m.value), max: INP_GOOD_MS, strategy: r.strategy, source: m.source } }
        : null;
    }),
  ),
  siteRule({ id: "cwv-cls-high", category: "performance", severity: "warning", population }, (ctx) =>
    perResult(ctx, (r) => {
      const m = measure(r, r.field?.cls, r.lab.cls);
      return m && m.value > CLS_GOOD
        ? { params: { cls: Math.round(m.value * 1000) / 1000, max: CLS_GOOD, strategy: r.strategy, source: m.source } }
        : null;
    }),
  ),
  siteRule({ id: "pagespeed-score-low", category: "performance", severity: "warning", population }, (ctx) =>
    perResult(ctx, (r) =>
      r.score !== null && r.score < SCORE_LOW
        ? {
            params: { score: r.score, strategy: r.strategy },
            ...(r.opportunities.length ? { evidence: r.opportunities.slice(0, 3).map((o) => o.id).join(", ") } : {}),
          }
        : null,
    ),
  ),
  siteRule({ id: "pagespeed-failed", category: "performance", severity: "notice", population: () => 1 }, (ctx) =>
    (ctx.crawl.pageSpeed ?? [])
      .filter((r) => r.error)
      .map((r) => ({ url: r.url, params: { strategy: r.strategy, error: r.error } })),
  ),
];
