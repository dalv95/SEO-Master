import * as cheerio from "cheerio";
import type { JsonLdBlock, ParsedPage } from "@seo-master/shared";
import { isSameSite, normalizeUrl } from "./url";

export type ParsedHtml = Pick<
  ParsedPage,
  | "title"
  | "metaDescription"
  | "metaRobots"
  | "canonical"
  | "lang"
  | "hasViewport"
  | "hreflang"
  | "headings"
  | "images"
  | "links"
  | "jsonLd"
  | "openGraph"
  | "twitter"
  | "wordCount"
  | "mixedContent"
>;

const clean = (s: string) => s.replace(/\s+/g, " ").trim();

function collectTypes(node: unknown, out: string[]): void {
  if (Array.isArray(node)) return node.forEach((n) => collectTypes(n, out));
  if (node && typeof node === "object") {
    const obj = node as Record<string, unknown>;
    const t = obj["@type"];
    if (typeof t === "string") out.push(t);
    else if (Array.isArray(t)) t.forEach((x) => typeof x === "string" && out.push(x));
    if (obj["@graph"]) collectTypes(obj["@graph"], out);
  }
}

function parseJsonLd(raw: string): JsonLdBlock {
  try {
    const types: string[] = [];
    collectTypes(JSON.parse(raw), types);
    return { raw, types };
  } catch (e) {
    return { raw, types: [], error: (e as Error).message };
  }
}

/** Extract SEO-relevant fields from an HTML document. `url` is the final (post-redirect) URL. */
export function parseHtml(html: string, url: string): ParsedHtml {
  const $ = cheerio.load(html);
  const base = normalizeUrl($("base[href]").attr("href") ?? "", url) ?? url;

  const meta = (name: string) => {
    const v = $(`meta[name="${name}" i]`).attr("content");
    return v === undefined ? null : clean(v);
  };

  const titleEl = $("head title").first();
  const canonicalHref = $('link[rel="canonical" i]').attr("href");

  const headings = $("h1, h2, h3, h4, h5, h6")
    .toArray()
    .map((el) => ({ level: Number(el.tagName.slice(1)), text: clean($(el).text()) }));

  const images = $("img")
    .toArray()
    .map((el) => {
      const $el = $(el);
      const src = $el.attr("src") ?? $el.attr("data-src") ?? "";
      return { src: normalizeUrl(src, base) ?? src, alt: $el.attr("alt") ?? null };
    });

  const links = $("a[href]")
    .toArray()
    .flatMap((el) => {
      const $el = $(el);
      const href = normalizeUrl($el.attr("href") ?? "", base);
      if (!href) return [];
      return [
        {
          href,
          // Accessible name: visible text, then aria-label/title (icon links), then image alt / SVG title.
          text:
            clean($el.text()) ||
            clean($el.attr("aria-label") ?? "") ||
            clean($el.attr("title") ?? "") ||
            clean($el.find("img[alt]").attr("alt") ?? "") ||
            clean($el.find("svg title").first().text()),
          rel: ($el.attr("rel") ?? "").toLowerCase(),
          internal: isSameSite(href, url),
        },
      ];
    });

  const hreflang = $('link[rel="alternate" i][hreflang]')
    .toArray()
    .map((el) => ({
      lang: $(el).attr("hreflang") ?? "",
      href: normalizeUrl($(el).attr("href") ?? "", base) ?? "",
    }));

  const jsonLd = $('script[type="application/ld+json" i]')
    .toArray()
    .map((el) => parseJsonLd($(el).text()));

  const openGraph: Record<string, string> = {};
  $('meta[property^="og:" i]').each((_, el) => {
    const p = $(el).attr("property");
    if (p) openGraph[p.toLowerCase()] = clean($(el).attr("content") ?? "");
  });
  const twitter: Record<string, string> = {};
  $('meta[name^="twitter:" i]').each((_, el) => {
    const n = $(el).attr("name");
    if (n) twitter[n.toLowerCase()] = clean($(el).attr("content") ?? "");
  });

  const mixedContent: string[] = [];
  if (url.startsWith("https:")) {
    $("img[src], script[src], iframe[src], audio[src], video[src], source[src], link[rel~='stylesheet'][href]").each(
      (_, el) => {
        const v = $(el).attr("src") ?? $(el).attr("href") ?? "";
        if (/^http:\/\//i.test(v)) mixedContent.push(v);
      },
    );
  }

  const $body = $("body").clone();
  $body.find("script, style, noscript, template, svg").remove();
  // Join text nodes with spaces so adjacent block elements (<h1>a</h1><p>b</p>) don't merge into one word.
  const text = clean(
    $body
      .find("*")
      .addBack()
      .contents()
      .toArray()
      .filter((n) => n.type === "text")
      .map((n) => $(n).text())
      .join(" "),
  );

  return {
    title: titleEl.length ? clean(titleEl.text()) : null,
    metaDescription: meta("description"),
    metaRobots: meta("robots"),
    canonical: canonicalHref === undefined ? null : normalizeUrl(canonicalHref, base) ?? canonicalHref,
    lang: $("html").attr("lang") ?? null,
    hasViewport: $('meta[name="viewport" i]').length > 0,
    hreflang,
    headings,
    images,
    links,
    jsonLd,
    openGraph,
    twitter,
    wordCount: text ? text.split(" ").length : 0,
    mixedContent,
  };
}

export const emptyParsedHtml = (): ParsedHtml => ({
  title: null,
  metaDescription: null,
  metaRobots: null,
  canonical: null,
  lang: null,
  hasViewport: false,
  hreflang: [],
  headings: [],
  images: [],
  links: [],
  jsonLd: [],
  openGraph: {},
  twitter: {},
  wordCount: 0,
  mixedContent: [],
});
