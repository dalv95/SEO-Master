import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { crawl } from "../src/crawl";
import { launchRenderer, type Renderer } from "../src/render";

const page = (body: string) => `<html><head><title>T</title></head><body>${body}</body></html>`;

let server: Server;
let base: string;

beforeAll(async () => {
  server = createServer((req, res) => {
    const routes: Record<string, () => void> = {
      "/robots.txt": () => res.end(`User-agent: *\nDisallow: /private\nSitemap: ${base}/sitemap.xml`),
      "/sitemap.xml": () =>
        res.end(
          `<?xml version="1.0"?><urlset><url><loc>${base}/</loc></url><url><loc>${base}/orphan</loc></url></urlset>`,
        ),
      "/": () =>
        html(page(`<a href="/a">A</a><a href="/old">Old</a><a href="/private/x">P</a><a href="/missing">M</a><a href="https://elsewhere.test/">E</a>`)),
      "/a": () => html(page(`<a href="/">Home</a>`)),
      "/old": () => {
        res.writeHead(301, { location: "/a" });
        res.end();
      },
      "/orphan": () => html(page("orphan")),
      // Client-side rendered app: empty shell, content and links injected by JS.
      "/spa/": () =>
        html(
          `<html><head><title>App</title></head><body><div id="root"></div><script>
            document.getElementById("root").innerHTML =
              "<h1>Rendered</h1><p>${"lorem ipsum ".repeat(60)}</p>" +
              ["one", "two", "three", "four", "five", "six"].map((p) => '<a href="/spa/' + p + '">' + p + "</a>").join("");
          </script></body></html>`,
        ),
    };
    const handler = routes[req.url ?? ""];
    if (handler) return handler();
    res.writeHead(404, { "content-type": "text/html" });
    res.end("not found");

    function html(body: string) {
      res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      res.end(body);
    }
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(() => new Promise<void>((r) => server.close(() => r())));

describe("crawl", () => {
  it("crawls same-site links and sitemap URLs, respecting robots.txt", async () => {
    const result = await crawl(`${base}/`, { delayMs: 0, render: "never" });
    const urls = result.pages.map((p) => p.url.replace(base, "")).sort();

    expect(urls).toEqual(["/", "/a", "/missing", "/old", "/orphan"]);
    expect(result.robotsTxt.found).toBe(true);
    expect(result.robotsTxt.disallowedUrls).toEqual([`${base}/private/x`]);
    expect(result.sitemap).toEqual({ found: true, urls: [`${base}/`, `${base}/orphan`] });

    const old = result.pages.find((p) => p.url === `${base}/old`)!;
    expect(old.finalUrl).toBe(`${base}/a`);
    expect(old.redirectChain).toEqual([{ url: `${base}/old`, status: 301 }]);

    expect(result.pages.find((p) => p.url === `${base}/missing`)?.status).toBe(404);
    expect(result.truncated).toBe(false);
    // Sitemap-only URLs come after everything reachable by links.
    expect(result.pages.at(-1)?.url).toBe(`${base}/orphan`);
  });

  it("stops at maxPages", async () => {
    const result = await crawl(`${base}/`, { delayMs: 0, maxPages: 2, render: "never" });
    expect(result.pages).toHaveLength(2);
    expect(result.truncated).toBe(true);
  });

  it("auto mode keeps plain HTML sites unrendered", async () => {
    let renders = 0;
    const fake: Renderer = { render: async () => (renders++, "<html><head><title>T</title></head><body></body></html>"), close: async () => {} };
    const result = await crawl(`${base}/`, { delayMs: 0, launchRenderer: async () => fake });
    expect(result.rendering).toEqual({ mode: "auto", used: false, reason: "not-needed" });
    expect(renders).toBe(1); // only the start-page probe
    expect(result.pages.every((p) => !p.raw)).toBe(true);
  });

  it("falls back to raw HTML when no browser is available (auto) and fails for always", async () => {
    const broken = async (): Promise<Renderer> => {
      throw new Error("no chromium");
    };
    const auto = await crawl(`${base}/`, { delayMs: 0, maxPages: 1, launchRenderer: broken });
    expect(auto.rendering).toMatchObject({ used: false, reason: "unavailable" });
    await expect(crawl(`${base}/`, { render: "always", launchRenderer: broken })).rejects.toThrow("no chromium");
  });
});

// Real headless Chromium; skipped where no browser can be launched.
const chromium = await launchRenderer().then(
  (r) => r,
  () => null,
);
afterAll(() => chromium?.close());

describe.skipIf(!chromium)("crawl with JavaScript rendering", () => {
  it("auto mode detects a client-rendered app and audits the rendered DOM", async () => {
    const result = await crawl(`${base}/spa/`, { delayMs: 0, maxPages: 3, launchRenderer: async () => chromium! });
    expect(result.rendering).toEqual({ mode: "auto", used: true, reason: "content-differs" });
    const home = result.pages[0]!;
    expect(home.headings).toEqual([{ level: 1, text: "Rendered" }]);
    expect(home.links.map((l) => l.text)).toEqual(["one", "two", "three", "four", "five", "six"]);
    expect(home.raw).toEqual({ title: "App", wordCount: 0, linkCount: 0 });
    // Links discovered only through rendering are crawled.
    expect(result.pages.map((p) => p.url)).toContain(`${base}/spa/one`);
  });
});
