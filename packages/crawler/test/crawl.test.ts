import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { crawl } from "../src/crawl";

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
    const result = await crawl(`${base}/`, { delayMs: 0 });
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
    const result = await crawl(`${base}/`, { delayMs: 0, maxPages: 2 });
    expect(result.pages).toHaveLength(2);
    expect(result.truncated).toBe(true);
  });
});
