import { anyPageRule, pageRule, siteRule } from "../rule";

const isNoindex = (v: string | null) => !!v && /noindex|none/i.test(v);

export const indexabilityRules = [
  anyPageRule({ id: "http-error", category: "indexability", severity: "critical" }, (p) => {
    if (p.error) return { params: { error: p.error } };
    if (p.status >= 400) return { params: { status: p.status } };
    return null;
  }),
  anyPageRule(
    { id: "redirect-chain", category: "indexability", severity: "warning" },
    (p) =>
      p.redirectChain.length > 1 && {
        params: { hops: p.redirectChain.length },
        evidence: [...p.redirectChain.map((h) => `${h.url} (${h.status})`), p.finalUrl].join(" → "),
      },
  ),
  pageRule({ id: "noindex", category: "indexability", severity: "warning" }, (p) => {
    const src = isNoindex(p.metaRobots)
      ? `meta robots: ${p.metaRobots}`
      : isNoindex(p.xRobotsTag)
        ? `X-Robots-Tag: ${p.xRobotsTag}`
        : null;
    return src ? { evidence: src } : null;
  }),
  pageRule(
    { id: "canonical-missing", category: "indexability", severity: "notice" },
    (p) => !p.canonical && { fixHint: { action: "add", target: 'head > link[rel="canonical"]', value: p.finalUrl } },
  ),
  pageRule({ id: "canonical-broken", category: "indexability", severity: "warning" }, (p, ctx) => {
    if (!p.canonical || p.canonical === p.finalUrl) return null;
    const target = ctx.pageByUrl.get(p.canonical);
    if (!target || (target.status === 200 && target.redirectChain.length === 0)) return null;
    return {
      params: { status: target.status, redirected: target.redirectChain.length > 0 },
      evidence: p.canonical,
      fixHint: { action: "replace", target: 'head > link[rel="canonical"] @href', value: target.finalUrl },
    };
  }),
  pageRule({ id: "hreflang-invalid", category: "indexability", severity: "warning" }, (p) =>
    p.hreflang
      .filter((h) => !/^(x-default|[a-z]{2,3}(-[a-z]{4})?(-([a-z]{2}|\d{3}))?)$/i.test(h.lang) || !h.href)
      .map((h) => ({ params: { lang: h.lang }, evidence: h.href })),
  ),
  siteRule(
    { id: "robots-txt-missing", category: "indexability", severity: "notice" },
    (ctx) => !ctx.crawl.robotsTxt.found && { url: new URL("/robots.txt", ctx.crawl.origin).toString() },
  ),
  siteRule({ id: "sitemap-missing", category: "indexability", severity: "warning" }, (ctx) => !ctx.crawl.sitemap.found && {}),
  siteRule({ id: "sitemap-bad-url", category: "indexability", severity: "warning" }, (ctx) =>
    ctx.crawl.sitemap.urls.flatMap((u) => {
      const p = ctx.pageByUrl.get(u);
      if (!p || (p.status === 200 && p.redirectChain.length === 0)) return [];
      return [{ url: u, params: { status: p.status, redirected: p.redirectChain.length > 0 } }];
    }),
  ),
];
