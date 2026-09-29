import type { CrawlResult, ParsedPage, RenderMode } from "@seo-master/shared";
import { fetchResource } from "./fetch";
import { emptyParsedHtml, parseHtml, type ParsedHtml } from "./parse";
import { launchRenderer, type Renderer } from "./render";
import { loadRobots } from "./robots";
import { loadSitemapUrls } from "./sitemap";
import { isSameSite, normalizeUrl } from "./url";

export interface CrawlOptions {
  maxPages?: number;
  concurrency?: number;
  /** Minimum delay between requests per worker; robots.txt Crawl-delay wins if larger. */
  delayMs?: number;
  /** JavaScript rendering: "auto" renders only when the start page's content depends on JS. */
  render?: RenderMode;
  onPage?: (page: ParsedPage, done: number) => void;
  /** Injectable for tests; defaults to headless Chromium via Playwright. */
  launchRenderer?: () => Promise<Renderer>;
}

type ContentStats = NonNullable<ParsedPage["raw"]>;

const statsOf = (p: ParsedHtml): ContentStats => ({ title: p.title, wordCount: p.wordCount, linkCount: p.links.length });

/**
 * Rendering is worth it when JS adds substantial text or links, supplies the title, or the raw
 * HTML is an empty app shell (a strong SPA signal even if the start page itself is short).
 */
export function contentNeedsJs(raw: ContentStats, rendered: ContentStats): boolean {
  return (
    (raw.wordCount < 10 && rendered.wordCount >= raw.wordCount + 10) ||
    rendered.wordCount >= raw.wordCount * 1.5 + 50 ||
    rendered.linkCount >= raw.linkCount * 1.5 + 5 ||
    (!raw.title && !!rendered.title)
  );
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

  const mode = opts.render ?? "auto";
  const rendering: CrawlResult["rendering"] = { mode, used: false };
  let renderer: Renderer | null = null;
  if (mode !== "never") {
    try {
      renderer = await (opts.launchRenderer ?? launchRenderer)();
    } catch (e) {
      if (mode === "always") throw e;
      rendering.reason = "unavailable";
      console.warn(`[crawler] ${(e as Error).message} — continuing without JavaScript rendering`);
    }
  }

  try {
    // "auto": render the start page once and keep the browser only if JS changes what crawlers see.
    let firstPage: ParsedPage | undefined;
    if (renderer && mode === "auto") {
      const rendered = await fetchPage(start, 0, renderer);
      if (rendered.raw && contentNeedsJs(rendered.raw, statsOf(rendered))) {
        rendering.used = true;
        rendering.reason = "content-differs";
        firstPage = rendered;
      } else {
        await renderer.close();
        renderer = null;
        rendering.reason = "not-needed";
        firstPage = await fetchPage(start, 0);
      }
    } else if (renderer) {
      rendering.used = true;
    }
    const { pages, disallowedUrls, truncated } = await crawlPages({
      start,
      robots,
      sitemap,
      delayMs,
      maxPages,
      concurrency,
      renderer,
      firstPage,
      onPage: opts.onPage,
    });
    return {
      startUrl: start,
      origin,
      pages,
      truncated,
      robotsTxt: { found: robots.found, disallowedUrls },
      sitemap,
      rendering,
      startedAt,
      finishedAt: new Date().toISOString(),
    };
  } finally {
    await renderer?.close();
  }
}

interface FrontierOptions {
  start: string;
  robots: Awaited<ReturnType<typeof loadRobots>>;
  sitemap: CrawlResult["sitemap"];
  delayMs: number;
  maxPages: number;
  concurrency: number;
  renderer: Renderer | null;
  /** Start page already fetched (auto rendering detection). */
  firstPage: ParsedPage | undefined;
  onPage: CrawlOptions["onPage"];
}

async function crawlPages({
  start,
  robots,
  sitemap,
  delayMs,
  maxPages,
  concurrency,
  renderer,
  firstPage,
  onPage,
}: FrontierOptions): Promise<{ pages: ParsedPage[]; disallowedUrls: string[]; truncated: boolean }> {
  // Linked URLs are crawled first (BFS); sitemap URLs only fill the remaining budget, so they
  // don't crowd out the real link structure and pages without internal links (orphans) still get audited.
  type Item = { url: string; depth: number };
  const linkQueue: Item[] = firstPage ? [] : [{ url: start, depth: 0 }];
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

  const record = (page: ParsedPage) => {
    pages.push(page);
    onPage?.(page, pages.length);
    for (const link of page.links) {
      if (link.internal && !link.rel.includes("nofollow")) enqueue(link.href, page.depth + 1, linkQueue);
    }
    // Pages reached through redirects: remember the target so it isn't crawled twice.
    seen.add(page.finalUrl);
  };
  if (firstPage) record(firstPage);

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
      const page = await fetchPage(next.url, next.depth, renderer ?? undefined);
      inFlight--;
      record(page);
      await sleep(delayMs);
    }
  };

  await Promise.all(Array.from({ length: concurrency }, worker));

  return {
    pages,
    disallowedUrls,
    truncated: pages.length >= maxPages && (linkQueue.length > 0 || [...sitemapPending].some((u) => !seen.has(u))),
  };
}

/**
 * Fetches a URL (status, redirects and headers always come from a plain HTTP request).
 * With a renderer, 200 HTML pages are additionally rendered in Chromium and audited as rendered,
 * keeping raw-HTML metrics in `raw` so JS-dependent content can be reported.
 */
export async function fetchPage(url: string, depth = 0, renderer?: Renderer): Promise<ParsedPage> {
  const res = await fetchResource(url);
  const contentType = res.headers.get("content-type");
  const isHtml = !!contentType && /text\/html|application\/xhtml/i.test(contentType);
  let parsed = isHtml && res.body ? parseHtml(res.body, res.finalUrl) : emptyParsedHtml();
  let raw: ParsedPage["raw"];
  if (renderer && isHtml && res.status === 200) {
    try {
      const rendered = parseHtml(await renderer.render(res.finalUrl), res.finalUrl);
      raw = statsOf(parsed);
      parsed = rendered;
    } catch (e) {
      console.warn(`[crawler] rendering ${res.finalUrl} failed, using raw HTML: ${(e as Error).message.split("\n")[0]}`);
    }
  }
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
    ...(raw ? { raw } : {}),
  };
}
