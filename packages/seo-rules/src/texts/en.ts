import type { RuleTexts } from "./types";

const s = (n: unknown, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;
const secs = (ms: unknown) => `${(Number(ms) / 1000).toFixed(1)} s`;
const device = (strategy: unknown) => (strategy === "desktop" ? "desktop" : "mobile");
const SOURCE: Record<string, string> = {
  field: "real users",
  origin: "real users, whole site",
  lab: "lab test",
};

export const en: RuleTexts = {
  "meta-title-missing": {
    title: "Missing <title>",
    message: () => "Page has no title tag or it is empty.",
    help: "The title is the clickable headline in search results. Add a unique, descriptive title (15–60 characters) with the page's main keyword.",
  },
  "meta-title-too-long": {
    title: "Title too long",
    message: (p) => `Title is ${p.length} characters (recommended ≤ ${p.max}); it will likely be truncated in search results.`,
    help: "Google truncates titles at around 60 characters. Put the most important words first and shorten the rest.",
  },
  "meta-title-too-short": {
    title: "Title too short",
    message: (p) => `Title is only ${p.length} characters; use a more descriptive title (${p.min}–${p.max}).`,
    help: "Short titles waste space in search results. Describe what the page offers and include the main keyword.",
  },
  "meta-title-duplicate": {
    title: "Duplicate titles",
    message: (p) => `Title is shared with ${s(p.count, "other page")}.`,
    help: "Each page needs its own title so search engines can tell pages apart and show the right one.",
  },
  "meta-description-missing": {
    title: "Missing meta description",
    message: () => "Page has no meta description; search engines will pick a snippet themselves.",
    help: "Write a 70–160 character summary that makes people want to click. Google often shows it under the title.",
  },
  "meta-description-length": {
    title: "Meta description length",
    message: (p) => `Meta description is ${p.length} characters (recommended ${p.min}–${p.max}).`,
    help: "Descriptions that are too short say little; ones that are too long get cut off. Aim for 70–160 characters.",
  },
  "meta-description-duplicate": {
    title: "Duplicate meta descriptions",
    message: (p) => `Meta description is shared with ${s(p.count, "other page")}.`,
    help: "Write a description specific to each page's content.",
  },
  "h1-missing": {
    title: "Missing H1",
    message: () => "Page has no non-empty <h1> heading.",
    help: "The H1 tells users and search engines what the page is about. Add one main heading that matches the topic.",
  },
  "h1-multiple": {
    title: "Multiple H1",
    message: (p) => `Page has ${p.count} <h1> headings; use a single main heading.`,
    help: "Keep one H1 for the main topic and use H2–H3 for sections.",
  },
  "heading-skipped-level": {
    title: "Skipped heading level",
    message: (p) => `Heading hierarchy skips from h${p.from} to h${p.to}.`,
    help: "Use headings in order (H1 → H2 → H3) so the structure is clear to readers, screen readers and crawlers.",
  },
  "thin-content": {
    title: "Thin content",
    message: (p) => `Page has only ${s(p.words, "word")} of visible text (< ${p.min}).`,
    help: "Pages with little text rarely rank. Expand them with useful information, or noindex them if they aren't meant for search.",
  },
  "html-lang-missing": {
    title: "Missing lang attribute",
    message: () => "<html> element has no lang attribute.",
    help: 'Add lang (e.g. <html lang="en">) so search engines and screen readers know the page language.',
  },
  "viewport-missing": {
    title: "Missing viewport meta",
    message: () => 'No <meta name="viewport">; the page is likely not mobile-friendly.',
    help: 'Google indexes the mobile version first. Add <meta name="viewport" content="width=device-width, initial-scale=1">.',
  },
  "http-error": {
    title: "Page returns an error",
    message: (p) => (p.error ? `Request failed: ${p.error}` : `URL returns HTTP ${p.status}.`),
    help: "Fix or remove the page, or redirect (301) it to the most relevant working page, and update links pointing to it.",
  },
  "redirect-chain": {
    title: "Redirect chain",
    message: (p) => `URL goes through ${s(p.hops, "redirect")} before reaching the final page.`,
    help: "Every extra hop slows users down and wastes crawl budget. Redirect straight to the final URL.",
  },
  noindex: {
    title: "Page is noindex",
    message: () => "Page is excluded from search engines (noindex). Make sure this is intentional.",
    help: "noindex keeps a page out of Google. Remove it from pages that should appear in search results.",
  },
  "js-dependent-content": {
    title: "Content requires JavaScript",
    message: (p) =>
      `Without JavaScript the page has ${s(p.rawWords, "word")} and ${s(p.rawLinks, "link")}; after rendering ${s(p.words, "word")} and ${s(p.links, "link")}.`,
    help: "Google renders JavaScript, but later and not always completely; other search engines, AI crawlers and link previews often don't. Serve important content and links in the initial HTML (server-side rendering or pre-rendering).",
  },
  "canonical-missing": {
    title: "Missing canonical",
    message: () => "Page has no rel=canonical link.",
    help: "A canonical tag tells search engines which URL is the main version, preventing duplicate content caused by URL parameters or alternate addresses.",
  },
  "canonical-broken": {
    title: "Canonical points to a bad URL",
    message: (p) => `Canonical URL returns ${p.status}${p.redirected ? " after redirect" : ""}.`,
    help: "The canonical must point directly at a working (200) page, otherwise search engines may ignore it.",
  },
  "hreflang-invalid": {
    title: "Invalid hreflang",
    message: (p) => `Invalid hreflang value "${p.lang}".`,
    help: 'Use ISO language codes with an optional region, such as "pl", "en-GB" or "x-default".',
  },
  "robots-txt-missing": {
    title: "No robots.txt",
    message: () => "robots.txt was not found.",
    help: "robots.txt tells crawlers what they may visit and where your sitemap is. Add one at the site root.",
  },
  "sitemap-missing": {
    title: "No XML sitemap",
    message: () => "No XML sitemap found (checked robots.txt Sitemap: entries and /sitemap.xml).",
    help: "A sitemap helps search engines discover all your pages. Generate one and reference it in robots.txt.",
  },
  "sitemap-bad-url": {
    title: "Sitemap lists non-200 URL",
    message: (p) => `URL listed in the sitemap returns ${p.status}${p.redirected ? " after redirect" : ""}.`,
    help: "Sitemaps should list only final, working URLs. Remove or update broken and redirected entries.",
  },
  "broken-internal-link": {
    title: "Broken internal link",
    message: (p) => `Links to ${p.target}, which returns ${p.status}.`,
    help: "Broken links frustrate users and waste link value. Update the link or redirect the missing page.",
  },
  "internal-link-redirect": {
    title: "Internal link to redirect",
    message: (p) => `Links to ${p.href}, which redirects to ${p.target}.`,
    help: "Point internal links straight at the final URL to avoid unnecessary redirects.",
  },
  "link-empty-anchor": {
    title: "Link without anchor text",
    message: (p) => `${s(p.count, "link")} without text, image alt or aria-label.`,
    help: "Anchor text tells search engines what the linked page is about. Add text, an image alt or an aria-label.",
  },
  "orphan-page": {
    title: "Orphan page",
    message: () => "Page is in the sitemap but no crawled page links to it.",
    help: "Pages without internal links are hard for users and crawlers to find. Link to them from related pages or the menu.",
  },
  "page-too-deep": {
    title: "Page deep in site structure",
    message: (p) => `Page is ${s(p.depth, "click")} from the start page (recommended ≤ ${p.max}).`,
    help: "Important pages should be reachable within 3 clicks. Link to them from the homepage, menu or category pages.",
  },
  "img-alt-missing": {
    title: "Image without alt",
    message: () => "Image has no alt attribute.",
    help: 'Describe the image in its alt text (or use alt="" for purely decorative images). It helps image search and accessibility.',
  },
  "jsonld-invalid": {
    title: "Invalid JSON-LD",
    message: (p) => `JSON-LD block cannot be parsed: ${p.error}`,
    help: "Fix the JSON syntax, then check the page with Google's Rich Results Test.",
  },
  "structured-data-missing": {
    title: "No structured data",
    message: () => "No page uses JSON-LD structured data (e.g. Organization, Product, Article, BreadcrumbList).",
    help: "Structured data can earn rich results (stars, prices, breadcrumbs). Start with Organization or LocalBusiness on the homepage.",
  },
  "og-missing": {
    title: "Missing Open Graph tags",
    message: (p) => `Missing Open Graph tags: ${p.missing}.`,
    help: "Open Graph tags control the title, description and image shown when the page is shared on Facebook, LinkedIn or messengers.",
  },
  "twitter-card-missing": {
    title: "Missing Twitter card",
    message: () => "No twitter:card meta tag.",
    help: 'Add <meta name="twitter:card" content="summary_large_image"> for a proper preview on X/Twitter.',
  },
  "not-https": {
    title: "Site not on HTTPS",
    message: () => "Page is served over plain HTTP.",
    help: "HTTPS is a ranking signal and browsers mark HTTP pages as not secure. Install a certificate and redirect HTTP to HTTPS.",
  },
  "mixed-content": {
    title: "Mixed content",
    message: (p) => `HTTPS page loads ${s(p.count, "resource")} over HTTP.`,
    help: "Load all scripts, styles and images over HTTPS, otherwise browsers may block them.",
  },
  "slow-response": {
    title: "Slow server response",
    message: (p) => `Page took ${p.ms} ms to download (> ${p.max} ms).`,
    help: "Slow responses hurt users and Core Web Vitals. Check hosting, caching and server-side rendering time.",
  },
  "large-html": {
    title: "Large HTML document",
    message: (p) => `HTML is ${p.kb} KB (> ${p.maxKb} KB).`,
    help: "Large HTML slows loading. Remove inline data and scripts, paginate long lists or load sections later.",
  },
  "cwv-lcp-slow": {
    title: "Slow Largest Contentful Paint (LCP)",
    message: (p) =>
      `The main content appears after ${secs(p.ms)} on ${device(p.strategy)} (${SOURCE[String(p.source)]}); should be ≤ ${secs(p.max)}.`,
    help: "LCP is a Core Web Vital used in Google ranking. Compress and resize the main image (WebP/AVIF), preload it, avoid render-blocking CSS/JS and speed up the server response.",
  },
  "cwv-inp-slow": {
    title: "Slow Interaction to Next Paint (INP)",
    message: (p) =>
      `The page reacts to clicks and taps after ${p.ms} ms on ${device(p.strategy)} (${SOURCE[String(p.source)]}); should be ≤ ${p.max} ms.`,
    help: "INP is a Core Web Vital measuring responsiveness. Break up long JavaScript tasks, remove unused scripts and third-party widgets, and defer non-essential work.",
  },
  "cwv-cls-high": {
    title: "Layout shifts (CLS)",
    message: (p) =>
      `Content jumps while loading: CLS ${p.cls} on ${device(p.strategy)} (${SOURCE[String(p.source)]}); should be ≤ ${p.max}.`,
    help: "CLS is a Core Web Vital. Set width and height on images and embeds, reserve space for ads and banners, and avoid inserting content above what's already visible.",
  },
  "pagespeed-score-low": {
    title: "Low PageSpeed score",
    message: (p) => `PageSpeed performance score is ${p.score}/100 on ${device(p.strategy)}.`,
    help: "See the Speed section of this report for the biggest opportunities Lighthouse found, starting with the largest estimated savings.",
  },
  "pagespeed-failed": {
    title: "PageSpeed test failed",
    message: (p) => `PageSpeed couldn't test this page on ${device(p.strategy)}: ${p.error}`,
    help: "Google must be able to load the page from the internet. Check that it's publicly reachable and doesn't block Google's Lighthouse user agent; then run the audit again.",
  },
};
