import { pageRule } from "../rule";

export const THIN_CONTENT_WORDS = 200;

export const contentRules = [
  pageRule(
    { id: "h1-missing", category: "content", severity: "warning" },
    (p) => !p.headings.some((h) => h.level === 1 && h.text) && { fixHint: { action: "add", target: "body h1" } },
  ),
  pageRule({ id: "h1-multiple", category: "content", severity: "notice" }, (p) => {
    const h1s = p.headings.filter((h) => h.level === 1);
    return h1s.length > 1 && { params: { count: h1s.length }, evidence: h1s.map((h) => h.text).join(" | ") };
  }),
  pageRule({ id: "heading-skipped-level", category: "content", severity: "notice" }, (p) => {
    for (let i = 1; i < p.headings.length; i++) {
      const prev = p.headings[i - 1]!;
      const cur = p.headings[i]!;
      if (cur.level > prev.level + 1) return { params: { from: prev.level, to: cur.level }, evidence: cur.text };
    }
    return null;
  }),
  pageRule(
    { id: "thin-content", category: "content", severity: "notice" },
    (p) => p.wordCount < THIN_CONTENT_WORDS && { params: { words: p.wordCount, min: THIN_CONTENT_WORDS } },
  ),
  pageRule(
    { id: "html-lang-missing", category: "content", severity: "notice" },
    (p) => !p.lang && { fixHint: { action: "set", target: "html @lang" } },
  ),
  pageRule(
    { id: "viewport-missing", category: "content", severity: "warning" },
    (p) =>
      !p.hasViewport && {
        fixHint: { action: "add", target: 'head > meta[name="viewport"]', value: "width=device-width, initial-scale=1" },
      },
  ),
];
