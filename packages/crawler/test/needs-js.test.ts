import { describe, expect, it } from "vitest";
import { contentNeedsJs } from "../src/crawl";

const stats = (wordCount: number, linkCount: number, title: string | null = "T") => ({ title, wordCount, linkCount });

describe("contentNeedsJs", () => {
  it.each([
    ["empty SPA shell with a short rendered login page", stats(0, 0), stats(16, 0), true],
    ["JS adds a lot of text", stats(200, 20), stats(400, 20), true],
    ["JS adds navigation links", stats(300, 2), stats(300, 12), true],
    ["title set by JS", stats(300, 10, null), stats(300, 10), true],
    ["server-rendered page, minor JS additions", stats(300, 20), stats(320, 22), false],
    ["tiny static page", stats(5, 1), stats(5, 1), false],
  ])("%s", (_, raw, rendered, expected) => {
    expect(contentNeedsJs(raw, rendered)).toBe(expected);
  });
});
