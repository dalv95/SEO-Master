import { anyPageRule, pageRule, siteRule } from "../rule";

const isNoindex = (v: string | null) => !!v && /noindex|none/i.test(v);

export const indexabilityRules = [
  anyPageRule(
    { id: "http-error", category: "indexability", severity: "critical", title: "Page returns an error" },
    (p) => {
      if (p.error) return { message: `Request failed: ${p.error}` };
      if (p.status >= 400) return { message: `URL returns HTTP ${p.status}.` };
      return null;
    },
  ),
  anyPageRule(
    { id: "redirect-chain", category: "indexability", severity: "warning", title: "Redirect chain" },
    (p) =>
      p.redirectChain.length > 1 && {
        message: `URL goes through ${p.redirectChain.length} redirects before reaching the final page.`,
        evidence: [...p.redirectChain.map((h) => `${h.url} (${h.status})`), p.finalUrl].join(" → "),
      },
  ),
  pageRule({ id: "noindex", category: "indexability", severity: "warning", title: "Page is noindex" }, (p) => {
    const src = isNoindex(p.metaRobots) ? `meta robots: ${p.metaRobots}` : isNoindex(p.xRobotsTag) ? `X-Robots-Tag: ${p.xRobotsTag}` : null;
    return src ? { message: "Page is excluded from search engines (noindex). Make sure this is intentional.", evidence: src } : null;
  }),
  pageRule({ id: "canonical-missing", category: "indexability", severity: "notice", title: "Missing canonical" }, (p) =>
    !p.canonical && {
      message: "Page has no rel=canonical link.",
      fixHint: { action: "add", target: 'head > link[rel="canonical"]', value: p.finalUrl },
    },
  ),
  pageRule(
    { id: "canonical-broken", category: "indexability", severity: "warning", title: "Canonical points to a bad URL" },
    (p, ctx) => {
      if (!p.canonical || p.canonical === p.finalUrl) return null;
      const target = ctx.pageByUrl.get(p.canonical);
      if (!target) return null;
      if (target.status !== 200 || target.redirectChain.length > 0)
        return {
          message: `Canonical URL returns ${target.status}${target.redirectChain.length ? " after redirect" : ""}.`,
          evidence: p.canonical,
          fixHint: { action: "replace", target: 'head > link[rel="canonical"] @href', value: target.finalUrl },
        };
      return null;
    },
  ),
  pageRule({ id: "hreflang-invalid", category: "indexability", severity: "warning", title: "Invalid hreflang" }, (p) =>
    p.hreflang
      .filter((h) => !/^(x-default|[a-z]{2,3}(-[a-z]{4})?(-([a-z]{2}|\d{3}))?)$/i.test(h.lang) || !h.href)
      .map((h) => ({ message: `Invalid hreflang value "${h.lang}".`, evidence: h.href })),
  ),
  siteRule({ id: "robots-txt-missing", category: "indexability", severity: "notice", title: "No robots.txt" }, (ctx) =>
    !ctx.crawl.robotsTxt.found && {
      url: new URL("/robots.txt", ctx.crawl.origin).toString(),
      message: "robots.txt was not found.",
    },
  ),
  siteRule({ id: "sitemap-missing", category: "indexability", severity: "warning", title: "No XML sitemap" }, (ctx) =>
    !ctx.crawl.sitemap.found && {
      message: "No XML sitemap found (checked robots.txt Sitemap: entries and /sitemap.xml).",
    },
  ),
  siteRule(
    { id: "sitemap-bad-url", category: "indexability", severity: "warning", title: "Sitemap lists non-200 URL" },
    (ctx) =>
      ctx.crawl.sitemap.urls.flatMap((u) => {
        const p = ctx.pageByUrl.get(u);
        if (!p || (p.status === 200 && p.redirectChain.length === 0)) return [];
        return [{ url: u, message: `URL listed in the sitemap returns ${p.status}${p.redirectChain.length ? " after redirect" : ""}.` }];
      }),
  ),
];
