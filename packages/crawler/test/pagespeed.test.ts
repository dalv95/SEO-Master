import { describe, expect, it } from "vitest";
import type { CrawlResult } from "@seo-master/shared";
import { parsePageSpeed, selectPageSpeedUrls } from "../src/pagespeed";
import { parseHtml } from "../src/parse";
import fixtureJson from "./fixtures/psi-goup24-mobile.json";

const fixture = fixtureJson as unknown as Parameters<typeof parsePageSpeed>[2];

describe("parsePageSpeed", () => {
  // Real PSI v5 / Lighthouse 13 response for a low-traffic site (no CrUX data), trimmed.
  const r = parsePageSpeed("https://goup24.com.pl/", "mobile", fixture);

  it("reads score and lab metrics", () => {
    expect(r.score).toBe(87);
    expect(r.lab.lcpMs).toBeCloseTo(3832.5);
    expect(r.lab.cls).toBeLessThan(0.01);
    expect(r.lab.tbtMs).toBe(0);
    expect(r.field).toBeNull();
  });

  it("lists failing insights with the biggest savings first", () => {
    expect(r.opportunities[0]).toMatchObject({ id: "image-delivery-insight", savingsMs: 2400 });
    expect(r.opportunities.map((o) => o.id)).toContain("render-blocking-insight");
    const savings = r.opportunities.map((o) => o.savingsMs);
    expect(savings).toEqual([...savings].sort((a, b) => b - a));
  });

  it("prefers URL-level CrUX data and falls back to the origin", () => {
    const metrics = (lcp: number) => ({
      LARGEST_CONTENTFUL_PAINT_MS: { percentile: lcp },
      INTERACTION_TO_NEXT_PAINT: { percentile: 250 },
      CUMULATIVE_LAYOUT_SHIFT_SCORE: { percentile: 12 },
    });
    const withUrl = parsePageSpeed("u", "mobile", {
      ...fixture,
      loadingExperience: { overall_category: "AVERAGE", metrics: metrics(3100) },
    });
    expect(withUrl.field).toEqual({ source: "url", lcpMs: 3100, inpMs: 250, cls: 0.12, category: "AVERAGE" });

    const originOnly = parsePageSpeed("u", "mobile", {
      ...fixture,
      loadingExperience: { origin_fallback: true, metrics: metrics(3100) },
      originLoadingExperience: { overall_category: "FAST", metrics: metrics(1800) },
    });
    expect(originOnly.field).toMatchObject({ source: "origin", lcpMs: 1800, category: "FAST" });
  });

  it("throws on a response without a Lighthouse result", () => {
    expect(() => parsePageSpeed("u", "mobile", { error: { message: "FAILED_DOCUMENT_REQUEST" } })).toThrow(
      "FAILED_DOCUMENT_REQUEST",
    );
  });
});

describe("selectPageSpeedUrls", () => {
  const O = "https://example.com";
  const page = (path: string, body: string, depth = 1) => ({
    url: `${O}${path}`,
    finalUrl: `${O}${path}`,
    status: 200,
    redirectChain: [],
    contentType: "text/html",
    responseTimeMs: 1,
    bytes: 1,
    isHtml: true,
    depth,
    xRobotsTag: null,
    ...parseHtml(`<html><body>${body}</body></html>`, `${O}${path}`),
  });
  const crawl = {
    startUrl: `${O}/`,
    pages: [
      page("/", `<a href="/popular">p</a><a href="/rare">r</a><a href="/deep">d</a>`, 0),
      page("/popular", `<a href="/">h</a><a href="/deep">d</a>`),
      page("/rare", `<a href="/popular">p</a>`),
      page("/deep", `<a href="/popular">p</a>`, 2),
      { ...page("/broken", ""), status: 404 },
    ],
  } as unknown as CrawlResult;

  it("starts with the start page, then the most linked-to pages", () => {
    expect(selectPageSpeedUrls(crawl, 3)).toEqual([`${O}/`, `${O}/popular`, `${O}/deep`]);
  });

  it("never includes error pages", () => {
    expect(selectPageSpeedUrls(crawl, 10)).not.toContain(`${O}/broken`);
  });
});
