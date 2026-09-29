import * as cheerio from "cheerio";
import { fetchResource } from "./fetch";

const MAX_SITEMAP_FILES = 20;

/** Collect page URLs from the given sitemaps (following sitemap indexes). */
export async function loadSitemapUrls(
  sitemapUrls: string[],
  limit: number,
): Promise<{ found: boolean; urls: string[] }> {
  const queue = [...sitemapUrls];
  const seen = new Set<string>();
  const urls = new Set<string>();
  let found = false;

  while (queue.length && seen.size < MAX_SITEMAP_FILES && urls.size < limit) {
    const sm = queue.shift()!;
    if (seen.has(sm)) continue;
    seen.add(sm);
    const res = await fetchResource(sm);
    if (res.status < 200 || res.status >= 300 || !res.body.includes("<")) continue;
    found = true;
    const $ = cheerio.load(res.body, { xml: true });
    $("sitemapindex > sitemap > loc").each((_, el) => {
      queue.push($(el).text().trim());
    });
    $("urlset > url > loc").each((_, el) => {
      if (urls.size < limit) urls.add($(el).text().trim());
    });
  }
  return { found, urls: [...urls] };
}
