import type { CrawlResult, ParsedPage } from "@seo-master/shared";

export interface AuditContext {
  crawl: CrawlResult;
  /** HTML pages that returned 200 — content rules only look at these. */
  htmlPages: ParsedPage[];
  /** Lookup by requested URL and by final URL. */
  pageByUrl: Map<string, ParsedPage>;
  /** target URL → set of internal source page URLs linking to it. */
  inlinks: Map<string, Set<string>>;
}

export function buildContext(crawl: CrawlResult): AuditContext {
  const pageByUrl = new Map<string, ParsedPage>();
  const inlinks = new Map<string, Set<string>>();
  for (const p of crawl.pages) {
    pageByUrl.set(p.url, p);
    if (!pageByUrl.has(p.finalUrl)) pageByUrl.set(p.finalUrl, p);
  }
  // A redirecting URL and its target are the same document: keep one entry per final URL,
  // preferring the one fetched without redirects.
  const byFinal = new Map<string, ParsedPage>();
  for (const p of crawl.pages) {
    if (!p.isHtml || p.status !== 200) continue;
    const existing = byFinal.get(p.finalUrl);
    if (!existing || (existing.redirectChain.length > 0 && p.redirectChain.length === 0)) byFinal.set(p.finalUrl, p);
  }
  const htmlPages = [...byFinal.values()];
  for (const p of htmlPages) {
    for (const l of p.links) {
      if (!l.internal || l.href === p.finalUrl) continue;
      let set = inlinks.get(l.href);
      if (!set) inlinks.set(l.href, (set = new Set()));
      set.add(p.finalUrl);
    }
  }
  return { crawl, htmlPages, pageByUrl, inlinks };
}
