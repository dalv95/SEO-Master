import { pageRule } from "../rule";

export const THIN_CONTENT_WORDS = 200;

export const contentRules = [
  pageRule({ id: "h1-missing", category: "content", severity: "warning", title: "Missing H1" }, (p) =>
    !p.headings.some((h) => h.level === 1 && h.text) && {
      message: "Page has no non-empty <h1> heading.",
      fixHint: { action: "add", target: "body h1" },
    },
  ),
  pageRule({ id: "h1-multiple", category: "content", severity: "notice", title: "Multiple H1" }, (p) => {
    const h1s = p.headings.filter((h) => h.level === 1);
    return (
      h1s.length > 1 && {
        message: `Page has ${h1s.length} <h1> headings; use a single main heading.`,
        evidence: h1s.map((h) => h.text).join(" | "),
      }
    );
  }),
  pageRule(
    { id: "heading-skipped-level", category: "content", severity: "notice", title: "Skipped heading level" },
    (p) => {
      for (let i = 1; i < p.headings.length; i++) {
        const prev = p.headings[i - 1]!;
        const cur = p.headings[i]!;
        if (cur.level > prev.level + 1)
          return {
            message: `Heading hierarchy skips from h${prev.level} to h${cur.level}.`,
            evidence: cur.text,
          };
      }
      return null;
    },
  ),
  pageRule({ id: "thin-content", category: "content", severity: "notice", title: "Thin content" }, (p) =>
    p.wordCount < THIN_CONTENT_WORDS && {
      message: `Page has only ${p.wordCount} words of visible text (< ${THIN_CONTENT_WORDS}).`,
    },
  ),
  pageRule({ id: "html-lang-missing", category: "content", severity: "notice", title: "Missing lang attribute" }, (p) =>
    !p.lang && {
      message: "<html> element has no lang attribute.",
      fixHint: { action: "set", target: "html @lang" },
    },
  ),
  pageRule({ id: "viewport-missing", category: "content", severity: "warning", title: "Missing viewport meta" }, (p) =>
    !p.hasViewport && {
      message: "No <meta name=\"viewport\">; the page is likely not mobile-friendly.",
      fixHint: {
        action: "add",
        target: 'head > meta[name="viewport"]',
        value: "width=device-width, initial-scale=1",
      },
    },
  ),
];
