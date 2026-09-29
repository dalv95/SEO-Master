import { describe, expect, it } from "vitest";
import { parseHtml } from "../src/parse";

const html = `<!doctype html>
<html lang="pl">
<head>
  <title>  Sklep   z butami </title>
  <meta name="Description" content="Najlepsze buty">
  <meta name="robots" content="index,follow">
  <meta name="viewport" content="width=device-width">
  <link rel="canonical" href="/buty">
  <link rel="alternate" hreflang="en" href="https://example.com/en/shoes">
  <meta property="og:title" content="Buty">
  <meta name="twitter:card" content="summary">
  <script type="application/ld+json">{"@context":"https://schema.org","@graph":[{"@type":"Organization"},{"@type":["Product","Thing"]}]}</script>
  <script type="application/ld+json">{ broken </script>
  <link rel="stylesheet" href="http://cdn.example.com/a.css">
</head>
<body>
  <h1>Buty</h1><h3>Sub</h3>
  <img src="/a.jpg" alt="A"><img src="b.jpg">
  <a href="/kontakt#form">Kontakt</a>
  <a href="https://other.com/x" rel="nofollow">Other</a>
  <a href="mailto:a@b.c">Mail</a>
  <a href="https://www.example.com/o-nas"><img src="/logo.png" alt="Logo"></a>
  <a href="https://facebook.com/x" aria-label="Facebook"><svg><path d=""/></svg></a>
  <a href="/ig" title="Instagram"><svg><path d=""/></svg></a>
  <script>var ignored = "lots of words here";</script>
  <p>jeden dwa trzy</p>
</body></html>`;

describe("parseHtml", () => {
  const p = parseHtml(html, "https://example.com/sklep/");

  it("extracts head metadata", () => {
    expect(p.title).toBe("Sklep z butami");
    expect(p.metaDescription).toBe("Najlepsze buty");
    expect(p.metaRobots).toBe("index,follow");
    expect(p.hasViewport).toBe(true);
    expect(p.lang).toBe("pl");
    expect(p.canonical).toBe("https://example.com/buty");
    expect(p.hreflang).toEqual([{ lang: "en", href: "https://example.com/en/shoes" }]);
    expect(p.openGraph["og:title"]).toBe("Buty");
    expect(p.twitter["twitter:card"]).toBe("summary");
  });

  it("parses JSON-LD types including @graph and reports errors", () => {
    expect(p.jsonLd[0]?.types).toEqual(["Organization", "Product", "Thing"]);
    expect(p.jsonLd[1]?.error).toBeTruthy();
  });

  it("resolves links, drops fragments and non-http links, marks internal (www-insensitive)", () => {
    expect(p.links.map((l) => [l.href, l.internal])).toEqual([
      ["https://example.com/kontakt", true],
      ["https://other.com/x", false],
      ["https://www.example.com/o-nas", true],
      ["https://facebook.com/x", false],
      ["https://example.com/ig", true],
    ]);
    expect(p.links[1]?.rel).toBe("nofollow");
    expect(p.links.slice(2).map((l) => l.text)).toEqual(["Logo", "Facebook", "Instagram"]);
  });

  it("collects headings, images, mixed content and word count", () => {
    expect(p.headings).toEqual([
      { level: 1, text: "Buty" },
      { level: 3, text: "Sub" },
    ]);
    expect(p.images).toEqual([
      { src: "https://example.com/a.jpg", alt: "A" },
      { src: "https://example.com/sklep/b.jpg", alt: null },
      { src: "https://example.com/logo.png", alt: "Logo" },
    ]);
    expect(p.mixedContent).toEqual(["http://cdn.example.com/a.css"]);
    expect(p.wordCount).toBe(8); // Buty Sub Kontakt Other Mail jeden dwa trzy
  });

  it("handles a document without head elements", () => {
    const e = parseHtml("<p>hi</p>", "http://example.com/");
    expect(e.title).toBeNull();
    expect(e.metaDescription).toBeNull();
    expect(e.canonical).toBeNull();
    expect(e.mixedContent).toEqual([]);
  });
});
