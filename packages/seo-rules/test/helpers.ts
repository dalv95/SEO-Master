import { emptyParsedHtml, parseHtml } from "@seo-master/crawler";
import type { CrawlResult, ParsedPage } from "@seo-master/shared";

export const ORIGIN = "https://example.com";

/** Well-formed page that passes every page-level rule. */
export const goodHtml = (path: string, extraHead = "", body = "") => `<!doctype html>
<html lang="en"><head>
<title>A descriptive page title for ${path}</title>
<meta name="description" content="${"A meta description that is long enough to be useful to searchers. ".repeat(1)}Page ${path}.">
<meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="canonical" href="${ORIGIN}${path}">
<meta property="og:title" content="t"><meta property="og:description" content="d"><meta property="og:image" content="i">
<meta name="twitter:card" content="summary">
<script type="application/ld+json">{"@type":"WebPage"}</script>
${extraHead}
</head><body><h1>Heading ${path}</h1><p>${"word ".repeat(250)}</p>${body}</body></html>`;

export function htmlPage(path: string, html: string, over: Partial<ParsedPage> = {}): ParsedPage {
  const url = `${ORIGIN}${path}`;
  return {
    url,
    finalUrl: url,
    status: 200,
    redirectChain: [],
    contentType: "text/html",
    responseTimeMs: 100,
    bytes: html.length,
    isHtml: true,
    depth: 1,
    xRobotsTag: null,
    ...parseHtml(html, url),
    ...over,
  };
}

export function statusPage(path: string, status: number, over: Partial<ParsedPage> = {}): ParsedPage {
  const url = `${ORIGIN}${path}`;
  return {
    url,
    finalUrl: url,
    status,
    redirectChain: [],
    contentType: "text/html",
    responseTimeMs: 50,
    bytes: 0,
    isHtml: true,
    depth: 1,
    xRobotsTag: null,
    ...emptyParsedHtml(),
    ...over,
  };
}

export function site(pages: ParsedPage[], over: Partial<CrawlResult> = {}): CrawlResult {
  return {
    startUrl: `${ORIGIN}/`,
    origin: ORIGIN,
    pages,
    robotsTxt: { found: true, disallowedUrls: [] },
    sitemap: { found: true, urls: [] },
    truncated: false,
    rendering: { mode: "never", used: false },
    startedAt: "",
    finishedAt: "",
    ...over,
  };
}
