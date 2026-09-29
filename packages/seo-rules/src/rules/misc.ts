import { pageRule, siteRule } from "../rule";

export const SLOW_RESPONSE_MS = 1500;
export const LARGE_HTML_BYTES = 500 * 1024;

export const imageRules = [
  pageRule({ id: "img-alt-missing", category: "images", severity: "warning", title: "Image without alt" }, (p) =>
    p.images
      .filter((i) => i.alt === null)
      .map((i) => ({
        message: "Image has no alt attribute.",
        evidence: i.src,
        fixHint: { action: "set" as const, target: `img[src="${i.src}"] @alt` },
      })),
  ),
];

export const structuredDataRules = [
  pageRule({ id: "jsonld-invalid", category: "structured-data", severity: "warning", title: "Invalid JSON-LD" }, (p) =>
    p.jsonLd.filter((b) => b.error).map((b) => ({ message: `JSON-LD block cannot be parsed: ${b.error}` })),
  ),
  siteRule(
    { id: "structured-data-missing", category: "structured-data", severity: "notice", title: "No structured data" },
    (ctx) =>
      ctx.htmlPages.length > 0 &&
      !ctx.htmlPages.some((p) => p.jsonLd.some((b) => !b.error)) && {
        message: "No page uses JSON-LD structured data (e.g. Organization, Product, Article, BreadcrumbList).",
        fixHint: { action: "add", target: 'head > script[type="application/ld+json"]' },
      },
  ),
];

const OG_REQUIRED = ["og:title", "og:description", "og:image"];

export const socialRules = [
  pageRule({ id: "og-missing", category: "social", severity: "notice", title: "Missing Open Graph tags" }, (p) => {
    const missing = OG_REQUIRED.filter((k) => !p.openGraph[k]);
    return (
      missing.length > 0 && {
        message: `Missing Open Graph tags: ${missing.join(", ")}.`,
        fixHint: { action: "add", target: `head > meta[property="${missing[0]}"]` },
      }
    );
  }),
  pageRule({ id: "twitter-card-missing", category: "social", severity: "notice", title: "Missing Twitter card" }, (p) =>
    !p.twitter["twitter:card"] && {
      message: "No twitter:card meta tag.",
      fixHint: { action: "add", target: 'head > meta[name="twitter:card"]', value: "summary_large_image" },
    },
  ),
];

export const securityRules = [
  siteRule({ id: "not-https", category: "security", severity: "critical", title: "Site not on HTTPS" }, (ctx) =>
    ctx.htmlPages
      .filter((p) => p.finalUrl.startsWith("http:"))
      .map((p) => ({ url: p.finalUrl, message: "Page is served over plain HTTP." })),
  ),
  pageRule({ id: "mixed-content", category: "security", severity: "warning", title: "Mixed content" }, (p) =>
    p.mixedContent.length > 0 && {
      message: `HTTPS page loads ${p.mixedContent.length} resource(s) over HTTP.`,
      evidence: p.mixedContent.slice(0, 5).join(", "),
    },
  ),
];

export const performanceRules = [
  pageRule({ id: "slow-response", category: "performance", severity: "warning", title: "Slow server response" }, (p) =>
    p.responseTimeMs > SLOW_RESPONSE_MS && {
      message: `Page took ${p.responseTimeMs} ms to download (> ${SLOW_RESPONSE_MS} ms).`,
    },
  ),
  pageRule({ id: "large-html", category: "performance", severity: "notice", title: "Large HTML document" }, (p) =>
    p.bytes > LARGE_HTML_BYTES && { message: `HTML is ${Math.round(p.bytes / 1024)} KB (> ${LARGE_HTML_BYTES / 1024} KB).` },
  ),
];
