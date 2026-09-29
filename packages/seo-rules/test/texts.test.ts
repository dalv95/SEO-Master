import { describe, expect, it } from "vitest";
import { issueMessage, LOCALES, plural, ruleTexts, rules, runAudit } from "../src";
import { goodHtml, htmlPage, ORIGIN, site, statusPage } from "./helpers";

describe("rule texts", () => {
  it("every rule has a title, message and help text in every locale", () => {
    for (const locale of LOCALES)
      for (const rule of rules) {
        const t = ruleTexts[locale][rule.id];
        expect(t, `${locale}:${rule.id}`).toBeDefined();
        expect(t!.title.length).toBeGreaterThan(0);
        expect(t!.help.length).toBeGreaterThan(20);
      }
  });

  it("has no texts for rules that don't exist", () => {
    const ids = new Set(rules.map((r) => r.id));
    for (const locale of LOCALES) expect(Object.keys(ruleTexts[locale]).filter((id) => !ids.has(id))).toEqual([]);
  });

  it("renders every produced issue without missing params in every locale", () => {
    const bad = htmlPage(
      "/bad",
      `<html><head><title>${"Very long title ".repeat(6)}</title><meta name="description" content="short">
       <meta name="robots" content="noindex"><link rel="canonical" href="/old">
       <link rel="alternate" hreflang="xx_bad" href="/en">
       <script type="application/ld+json">{bad</script><script src="http://cdn.test/a.js"></script></head>
       <body><h1>a</h1><h1>b</h1><h4>c</h4><img src="/i.png"><a href="/gone"></a><a href="/old">o</a><a href="/">h</a></body></html>`,
      { depth: 5, responseTimeMs: 3000, bytes: 600 * 1024 },
    );
    const dupA = htmlPage("/d1", `<html><head><title>Hi</title></head><body><a href="/">h</a></body></html>`);
    const dupB = htmlPage("/d2", `<html><head><title>Hi</title></head><body><a href="/">h</a></body></html>`);
    const home = htmlPage("/", goodHtml("/", "", `<a href="/bad">b</a><a href="/d1">1</a><a href="/d2">2</a>`), {
      depth: 0,
    });
    const old = statusPage("/old", 200, {
      finalUrl: `${ORIGIN}/`,
      redirectChain: [
        { url: `${ORIGIN}/old`, status: 301 },
        { url: `${ORIGIN}/older`, status: 301 },
      ],
    });
    const failed = statusPage("/timeout", 0, { error: "fetch failed" });
    const orphan = htmlPage("/orphan", goodHtml("/orphan"));
    const slow = { lcpMs: 5000, cls: 0.4, tbtMs: 900, fcpMs: 3000, siMs: 6000 };
    const r = runAudit(
      site([home, bad, dupA, dupB, statusPage("/gone", 404), old, failed, orphan], {
        robotsTxt: { found: false, disallowedUrls: [] },
        sitemap: { found: false, urls: [`${ORIGIN}/gone`] },
        pageSpeed: [
          { url: `${ORIGIN}/`, strategy: "mobile", score: 30, lab: slow, opportunities: [],
            field: { source: "origin", lcpMs: 4100, inpMs: 420, cls: 0.3, category: "SLOW" } },
          { url: `${ORIGIN}/`, strategy: "desktop", score: 40, lab: slow, field: null, opportunities: [] },
          { url: `${ORIGIN}/bad`, strategy: "mobile", score: null, lab: slow, field: null, opportunities: [], error: "boom" },
        ],
      }),
    );

    // Most rules should be exercised by this fixture.
    expect(new Set(r.issues.map((i) => i.ruleId)).size).toBeGreaterThanOrEqual(33);
    for (const issue of r.issues)
      for (const locale of LOCALES) {
        const msg = issueMessage(locale, issue.ruleId, issue.params, issue.message);
        expect(msg, `${locale}:${issue.ruleId}`).not.toMatch(/undefined|NaN|\[object/);
      }
  });

  it("formats PageSpeed numbers per locale", () => {
    const params = { ms: 3832, max: 2500, strategy: "mobile", source: "lab" };
    expect(issueMessage("pl", "cwv-lcp-slow", params, "")).toContain("3,8 s na telefonie (test laboratoryjny)");
    expect(issueMessage("en", "cwv-lcp-slow", params, "")).toContain("3.8 s on mobile (lab test)");
  });

  it("falls back to the stored message for issues without params", () => {
    expect(issueMessage("pl", "thin-content", null, "stored")).toBe("stored");
    expect(issueMessage("pl", "unknown-rule", {}, "stored")).toBe("stored");
  });
});

describe("plural (pl)", () => {
  it.each([
    [1, "1 znak"],
    [2, "2 znaki"],
    [5, "5 znaków"],
    [12, "12 znaków"],
    [22, "22 znaki"],
    [63, "63 znaki"],
    [65, "65 znaków"],
    [114, "114 znaków"],
  ])("%i", (n, expected) => {
    expect(plural(n, "znak", "znaki", "znaków")).toBe(expected);
  });
});
