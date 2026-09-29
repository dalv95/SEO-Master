import { pageRule, siteRule } from "../rule";

export const SLOW_RESPONSE_MS = 1500;
export const LARGE_HTML_BYTES = 500 * 1024;

export const imageRules = [
  pageRule({ id: "img-alt-missing", category: "images", severity: "warning" }, (p) =>
    p.images
      .filter((i) => i.alt === null)
      .map((i) => ({ evidence: i.src, fixHint: { action: "set" as const, target: `img[src="${i.src}"] @alt` } })),
  ),
];

export const structuredDataRules = [
  pageRule({ id: "jsonld-invalid", category: "structured-data", severity: "warning" }, (p) =>
    p.jsonLd.filter((b) => b.error).map((b) => ({ params: { error: b.error } })),
  ),
  siteRule(
    { id: "structured-data-missing", category: "structured-data", severity: "notice" },
    (ctx) =>
      ctx.htmlPages.length > 0 &&
      !ctx.htmlPages.some((p) => p.jsonLd.some((b) => !b.error)) && {
        fixHint: { action: "add", target: 'head > script[type="application/ld+json"]' },
      },
  ),
];

const OG_REQUIRED = ["og:title", "og:description", "og:image"];

export const socialRules = [
  pageRule({ id: "og-missing", category: "social", severity: "notice" }, (p) => {
    const missing = OG_REQUIRED.filter((k) => !p.openGraph[k]);
    return (
      missing.length > 0 && {
        params: { missing: missing.join(", ") },
        fixHint: { action: "add", target: `head > meta[property="${missing[0]}"]` },
      }
    );
  }),
  pageRule(
    { id: "twitter-card-missing", category: "social", severity: "notice" },
    (p) =>
      !p.twitter["twitter:card"] && {
        fixHint: { action: "add", target: 'head > meta[name="twitter:card"]', value: "summary_large_image" },
      },
  ),
];

export const securityRules = [
  siteRule({ id: "not-https", category: "security", severity: "critical" }, (ctx) =>
    ctx.htmlPages.filter((p) => p.finalUrl.startsWith("http:")).map((p) => ({ url: p.finalUrl })),
  ),
  pageRule(
    { id: "mixed-content", category: "security", severity: "warning" },
    (p) =>
      p.mixedContent.length > 0 && {
        params: { count: p.mixedContent.length },
        evidence: p.mixedContent.slice(0, 5).join(", "),
      },
  ),
];

export const performanceRules = [
  pageRule(
    { id: "slow-response", category: "performance", severity: "warning" },
    (p) => p.responseTimeMs > SLOW_RESPONSE_MS && { params: { ms: p.responseTimeMs, max: SLOW_RESPONSE_MS } },
  ),
  pageRule(
    { id: "large-html", category: "performance", severity: "notice" },
    (p) =>
      p.bytes > LARGE_HTML_BYTES && {
        params: { kb: Math.round(p.bytes / 1024), maxKb: LARGE_HTML_BYTES / 1024 },
      },
  ),
];
