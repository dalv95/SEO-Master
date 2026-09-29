import { pageRule, siteRule } from "../rule";

export const MAX_DEPTH = 3;

export const linkRules = [
  pageRule({ id: "broken-internal-link", category: "links", severity: "critical" }, (p, ctx) =>
    p.links.flatMap((l) => {
      if (!l.internal) return [];
      const target = ctx.pageByUrl.get(l.href);
      if (!target || (target.status > 0 && target.status < 400)) return [];
      return [
        {
          params: { target: l.href, status: target.status || target.error },
          evidence: l.text || l.href,
          fixHint: { action: "remove" as const, target: `a[href="${l.href}"]` },
        },
      ];
    }),
  ),
  pageRule({ id: "internal-link-redirect", category: "links", severity: "notice" }, (p, ctx) =>
    [...new Set(p.links.filter((l) => l.internal).map((l) => l.href))].flatMap((href) => {
      const t = ctx.pageByUrl.get(href);
      if (!t || t.url !== href || t.redirectChain.length === 0 || t.status >= 400) return [];
      return [
        {
          params: { href, target: t.finalUrl },
          fixHint: { action: "replace" as const, target: `a[href="${href}"] @href`, value: t.finalUrl },
        },
      ];
    }),
  ),
  pageRule({ id: "link-empty-anchor", category: "links", severity: "notice" }, (p) => {
    const empty = p.links.filter((l) => !l.text);
    return (
      empty.length > 0 && {
        params: { count: empty.length },
        evidence: empty
          .slice(0, 5)
          .map((l) => l.href)
          .join(", "),
      }
    );
  }),
  // Only meaningful for a complete crawl: in a partial one, the linking pages may simply not have been fetched.
  siteRule(
    { id: "orphan-page", category: "links", severity: "warning" },
    (ctx) =>
      !ctx.crawl.truncated &&
      ctx.htmlPages
        .filter((p) => p.url !== ctx.crawl.startUrl && !ctx.inlinks.has(p.url) && !ctx.inlinks.has(p.finalUrl))
        .map((p) => ({ url: p.finalUrl })),
  ),
  pageRule(
    { id: "page-too-deep", category: "links", severity: "notice" },
    (p) => p.depth > MAX_DEPTH && { params: { depth: p.depth, max: MAX_DEPTH } },
  ),
];
