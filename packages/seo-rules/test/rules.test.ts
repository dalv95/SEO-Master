import { describe, expect, it } from "vitest";
import { runAudit } from "../src";
import { goodHtml, htmlPage, ORIGIN, site, statusPage } from "./helpers";

const ids = (r: ReturnType<typeof runAudit>) => [...new Set(r.issues.map((i) => i.ruleId))].sort();

// Home links to /a and /a links back, so neither is an orphan.
const home = () => htmlPage("/", goodHtml("/", "", `<a href="/a">A</a>`), { depth: 0 });
const pageA = () => htmlPage("/a", goodHtml("/a", "", `<a href="/">Home</a>`));

describe("runAudit", () => {
  it("reports no issues and a perfect score for a clean site", () => {
    const r = runAudit(site([home(), pageA()]));
    expect(r.issues).toEqual([]);
    expect(r.score).toBe(100);
  });

  it("flags missing and bad meta tags with fix hints", () => {
    const bare = htmlPage("/a", `<html><head><title>Hi</title></head><body><h1>x</h1><a href="/">Home</a></body></html>`);
    const r = runAudit(site([home(), bare]));
    expect(ids(r)).toEqual(
      expect.arrayContaining([
        "meta-title-too-short",
        "meta-description-missing",
        "viewport-missing",
        "html-lang-missing",
        "canonical-missing",
        "og-missing",
        "twitter-card-missing",
        "thin-content",
      ]),
    );
    const vp = r.issues.find((i) => i.ruleId === "viewport-missing");
    expect(vp?.url).toBe(`${ORIGIN}/a`);
    expect(vp?.fixHint?.value).toBe("width=device-width, initial-scale=1");
  });

  it("detects duplicate titles across pages", () => {
    const b = htmlPage("/b", goodHtml("/a", "", `<a href="/">h</a>`), { url: `${ORIGIN}/b`, finalUrl: `${ORIGIN}/b` });
    const h = htmlPage("/", goodHtml("/", "", `<a href="/a">A</a><a href="/b">B</a>`), { depth: 0 });
    const r = runAudit(site([h, pageA(), b]));
    const dup = r.issues.filter((i) => i.ruleId === "meta-title-duplicate");
    expect(dup.map((i) => i.url).sort()).toEqual([`${ORIGIN}/a`, `${ORIGIN}/b`]);
  });

  it("finds broken links, redirects and error pages", () => {
    const h = htmlPage("/", goodHtml("/", "", `<a href="/a">A</a><a href="/gone">G</a><a href="/old">O</a>`), { depth: 0 });
    const gone = statusPage("/gone", 404);
    const old = statusPage("/old", 200, {
      finalUrl: `${ORIGIN}/a`,
      redirectChain: [
        { url: `${ORIGIN}/old`, status: 301 },
        { url: `${ORIGIN}/older`, status: 302 },
      ],
    });
    const r = runAudit(site([h, pageA(), gone, old]));
    expect(ids(r)).toEqual(["broken-internal-link", "http-error", "internal-link-redirect", "redirect-chain"]);
    expect(r.issues[0]?.severity).toBe("critical"); // sorted by severity
    const broken = r.issues.find((i) => i.ruleId === "broken-internal-link");
    expect(broken?.url).toBe(`${ORIGIN}/`);
  });

  it("flags orphan pages found only via sitemap, noindex and missing sitemap", () => {
    const orphan = htmlPage("/orphan", goodHtml("/orphan", `<meta name="robots" content="noindex">`));
    const r = runAudit(site([home(), pageA(), orphan], { sitemap: { found: false, urls: [] } }));
    expect(ids(r)).toEqual(["noindex", "orphan-page", "sitemap-missing"]);

    const partial = runAudit(site([home(), pageA(), orphan], { truncated: true }));
    expect(ids(partial)).toEqual(["noindex"]);
  });

  it("flags images without alt, invalid JSON-LD, mixed content and heading skips", () => {
    const html = goodHtml(
      "/a",
      `<script type="application/ld+json">{oops</script><script src="http://cdn.test/x.js"></script>`,
      `<a href="/">Home</a><h3>skip</h3><img src="/x.png"><img src="/y.png" alt="">`,
    );
    const r = runAudit(site([home(), htmlPage("/a", html)]));
    expect(ids(r)).toEqual(["heading-skipped-level", "img-alt-missing", "jsonld-invalid", "mixed-content"]);
    expect(r.issues.filter((i) => i.ruleId === "img-alt-missing")).toHaveLength(1);
  });

  it("flags content that only appears after JavaScript rendering", () => {
    const rendered = htmlPage("/a", goodHtml("/a", "", `<a href="/">Home</a>`), {
      raw: { title: null, wordCount: 3, linkCount: 0 },
    });
    const same = htmlPage("/b", goodHtml("/b", "", `<a href="/">Home</a>`), {
      raw: { title: "t", wordCount: 250, linkCount: 1 },
    });
    const h = htmlPage("/", goodHtml("/", "", `<a href="/a">A</a><a href="/b">B</a>`), { depth: 0 });
    const r = runAudit(site([h, rendered, same]));
    const js = r.issues.filter((i) => i.ruleId === "js-dependent-content");
    expect(js.map((i) => i.url)).toEqual([`${ORIGIN}/a`]);
    expect(js[0]?.params).toMatchObject({ rawWords: 3, rawLinks: 0 });
  });

  it("lowers the score proportionally to affected pages", () => {
    const noTitle = (p: string) =>
      htmlPage(p, goodHtml(p, "", `<a href="/">h</a>`).replace(/<title>.*<\/title>/, ""));
    const one = runAudit(site([home(), pageA(), noTitle("/b"), htmlPage("/c", goodHtml("/c", "", `<a href="/b">b</a>`))]));
    const all = runAudit(site([noTitle("/"), noTitle("/a")]));
    const meta = (r: typeof one) => r.categories.find((c) => c.category === "meta")!.score;
    expect(meta(one)).toBeGreaterThan(meta(all));
    expect(meta(all)).toBe(65);
    expect(one.score).toBeLessThan(100);
  });
});
