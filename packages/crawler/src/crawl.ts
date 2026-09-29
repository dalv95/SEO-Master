import type { CrawlResult, ParsedPage } from "@seo-master/shared";
import { fetchResource } from "./fetch";
import { emptyParsedHtml, parseHtml } from "./parse";
import { loadRobots } from "./robots";
import { loadSitemapUrls } from "./sitemap";
import { isSameSite, normalizeUrl } from "./url";

export interface CrawlOptions {
  maxPages?: number;
  concurrency?: number;
  /** Minimum delay between requests per worker; robots.txt Crawl-delay wins if larger. */
  delayMs?: number;
  onPage?: (page: ParsedPage, done: number) => void;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function crawl(startUrl: string, opts: CrawlOptions = {}): Promise<CrawlResult> {
  const maxPages = opts.maxPages ?? 500;
  const concurrency = opts.concurrency ?? 2;
  const startedAt = new Date().toISOString();

  const start = normalizeUrl(startUrl);
  if (!start) throw new Error(`Invalid start URL: ${startUrl}`);
  const origin = new URL(start).origin;

  const robots = await loadRobots(origin);
  const delayMs = Math.max(opts.delayMs ?? 250, robots.crawlDelayMs ?? 0);
  const sitemap = await loadSitemapUrls(
    robots.sitemaps.length ? robots.sitemaps : [new URL("/sitemap.xml", origin).toString()],
    maxPages * 2,
  );

  // Linked URLs are crawled first (BFS); sitemap URLs only fill the remaining budget, so they
  // don't crowd out the real link structure and pages without internal links (orphans) still get audited.
  type Item = { url: string; depth: number };
  const linkQueue: Item[] = [{ url: start, depth: 0 }];
  const sitemapQueue: Item[] = [];
  const seen = new Set<string>([start]);
  const disallowedUrls: string[] = [];
  const pages: ParsedPage[] = [];

  const enqueue = (url: string, depth: number, queue: Item[]) => {
    if (seen.has(url) || !isSameSite(url, start)) return;
    seen.add(url);
    if (!robots.isAllowed(url)) {
      disallowedUrls.push(url);
      return;
    }
    queue.push({ url, depth });
  };
  const sitemapPending = new Set<string>();
  for (const u of sitemap.urls) {
    const n = normalizeUrl(u);
    if (n && n !== start && isSameSite(n, start) && robots.isAllowed(n)) sitemapPending.add(n);
  }

  let inFlight = 0;
  // Sitemap URLs start once link discovery has fully drained; from then on all workers take them.
  let sitemapPhase = false;
  const worker = async () => {
    for (;;) {
      if (pages.length + inFlight >= maxPages) return;
      let next = linkQueue.shift();
      while (!next && (inFlight === 0 || sitemapPhase) && sitemapPending.size) {
        sitemapPhase = true;
        const [u] = sitemapPending;
        sitemapPending.delete(u!);
        if (!seen.has(u!)) {
          seen.add(u!);
          next = { url: u!, depth: 1 };
        }
      }
      if (!next) {
        if (inFlight === 0) return;
        await sleep(50);
        continue;
      }
      inFlight++;
      const page = await fetchPage(next.url, next.depth);
      inFlight--;
      pages.push(page);
      opts.onPage?.(page, pages.length);
      for (const link of page.links) {
        if (link.internal && !link.rel.includes("nofollow")) enqueue(link.href, next.depth + 1, linkQueue);
      }
      // Pages reached through redirects: remember the target so it isn't crawled twice.
      seen.add(page.finalUrl);
      await sleep(delayMs);
    }
  };

  await Promise.all(Array.from({ length: concurrency }, worker));

  return {
    startUrl: start,
    origin,
    pages,
    robotsTxt: { found: robots.found, disallowedUrls },
    sitemap,
    truncated: pages.length >= maxPages && (linkQueue.length > 0 || [...sitemapPending].some((u) => !seen.has(u))),
    startedAt,
    finishedAt: new Date().toISOString(),
  };
}

export async function fetchPage(url: string, depth = 0): Promise<ParsedPage> {
  const res = await fetchResource(url);
  const contentType = res.headers.get("content-type");
  const isHtml = !!contentType && /text\/html|application\/xhtml/i.test(contentType);
  const parsed = isHtml && res.body ? parseHtml(res.body, res.finalUrl) : emptyParsedHtml();
  return {
    url,
    finalUrl: res.finalUrl,
    status: res.status,
    redirectChain: res.redirectChain,
    contentType,
    responseTimeMs: res.responseTimeMs,
    bytes: res.bytes,
    isHtml,
    depth,
    ...(res.error ? { error: res.error } : {}),
    xRobotsTag: res.headers.get("x-robots-tag"),
    ...parsed,
  };
}
