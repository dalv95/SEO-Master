import { pageRule, siteRule } from "../rule";

export const MAX_DEPTH = 3;

export const linkRules = [
  pageRule(
    { id: "broken-internal-link", category: "links", severity: "critical", title: "Broken internal link" },
    (p, ctx) =>
      p.links.flatMap((l) => {
        if (!l.internal) return [];
        const target = ctx.pageByUrl.get(l.href);
        if (!target || (target.status > 0 && target.status < 400)) return [];
        return [
          {
            message: `Links to ${l.href}, which returns ${target.status || target.error}.`,
            evidence: l.text || l.href,
            fixHint: { action: "remove" as const, target: `a[href="${l.href}"]` },
          },
        ];
      }),
  ),
  pageRule(
    { id: "internal-link-redirect", category: "links", severity: "notice", title: "Internal link to redirect" },
    (p, ctx) =>
      [...new Set(p.links.filter((l) => l.internal).map((l) => l.href))].flatMap((href) => {
        const t = ctx.pageByUrl.get(href);
        if (!t || t.url !== href || t.redirectChain.length === 0 || t.status >= 400) return [];
        return [
          {
            message: `Links to ${href}, which redirects to ${t.finalUrl}.`,
            fixHint: { action: "replace" as const, target: `a[href="${href}"] @href`, value: t.finalUrl },
          },
        ];
      }),
  ),
  pageRule({ id: "link-empty-anchor", category: "links", severity: "notice", title: "Link without anchor text" }, (p) => {
    const empty = p.links.filter((l) => !l.text);
    return (
      empty.length > 0 && {
        message: `${empty.length} link(s) have no anchor text or image alt.`,
        evidence: empty.slice(0, 5).map((l) => l.href).join(", "),
      }
    );
  }),
  // Only meaningful for a complete crawl: in a partial one, the linking pages may simply not have been fetched.
  siteRule({ id: "orphan-page", category: "links", severity: "warning", title: "Orphan page" }, (ctx) =>
    !ctx.crawl.truncated &&
    ctx.htmlPages
      .filter((p) => p.url !== ctx.crawl.startUrl && !ctx.inlinks.has(p.url) && !ctx.inlinks.has(p.finalUrl))
      .map((p) => ({ url: p.finalUrl, message: "Page is in the sitemap but no crawled page links to it." })),
  ),
  pageRule({ id: "page-too-deep", category: "links", severity: "notice", title: "Page deep in site structure" }, (p) =>
    p.depth > MAX_DEPTH && { message: `Page is ${p.depth} clicks from the start page (recommended ≤ ${MAX_DEPTH}).` },
  ),
];
