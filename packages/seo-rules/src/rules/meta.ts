import { duplicates, pageRule, siteRule, truncate } from "../rule";

export const TITLE_MAX = 60;
export const TITLE_MIN = 15;
export const DESCRIPTION_MAX = 160;
export const DESCRIPTION_MIN = 70;

export const metaRules = [
  pageRule(
    { id: "meta-title-missing", category: "meta", severity: "critical", title: "Missing <title>" },
    (p) =>
      !p.title && {
        message: "Page has no title tag or it is empty.",
        fixHint: { action: "set", target: "head > title" },
      },
  ),
  pageRule(
    { id: "meta-title-too-long", category: "meta", severity: "warning", title: "Title too long" },
    (p) =>
      !!p.title &&
      p.title.length > TITLE_MAX && {
        message: `Title is ${p.title.length} characters (recommended ≤ ${TITLE_MAX}); it will likely be truncated in search results.`,
        evidence: p.title,
        fixHint: { action: "replace", target: "head > title" },
      },
  ),
  pageRule(
    { id: "meta-title-too-short", category: "meta", severity: "notice", title: "Title too short" },
    (p) =>
      !!p.title &&
      p.title.length < TITLE_MIN && {
        message: `Title is only ${p.title.length} characters; use a more descriptive title (${TITLE_MIN}–${TITLE_MAX}).`,
        evidence: p.title,
        fixHint: { action: "replace", target: "head > title" },
      },
  ),
  siteRule(
    { id: "meta-title-duplicate", category: "meta", severity: "warning", title: "Duplicate titles" },
    (ctx) =>
      duplicates(ctx.htmlPages, (p) => p.title).flatMap((group) =>
        group.map((p) => ({
          url: p.finalUrl,
          message: `Title is shared with ${group.length - 1} other page(s).`,
          evidence: truncate(p.title ?? ""),
          fixHint: { action: "replace" as const, target: "head > title" },
        })),
      ),
  ),
  pageRule(
    {
      id: "meta-description-missing",
      category: "meta",
      severity: "warning",
      title: "Missing meta description",
    },
    (p) =>
      !p.metaDescription && {
        message: "Page has no meta description; search engines will pick a snippet themselves.",
        fixHint: { action: "set", target: 'head > meta[name="description"] @content' },
      },
  ),
  pageRule(
    {
      id: "meta-description-length",
      category: "meta",
      severity: "notice",
      title: "Meta description length",
    },
    (p) => {
      const d = p.metaDescription;
      if (!d || (d.length >= DESCRIPTION_MIN && d.length <= DESCRIPTION_MAX)) return null;
      return {
        message: `Meta description is ${d.length} characters (recommended ${DESCRIPTION_MIN}–${DESCRIPTION_MAX}).`,
        evidence: truncate(d, 200),
        fixHint: { action: "replace", target: 'head > meta[name="description"] @content' },
      };
    },
  ),
  siteRule(
    {
      id: "meta-description-duplicate",
      category: "meta",
      severity: "notice",
      title: "Duplicate meta descriptions",
    },
    (ctx) =>
      duplicates(ctx.htmlPages, (p) => p.metaDescription).flatMap((group) =>
        group.map((p) => ({
          url: p.finalUrl,
          message: `Meta description is shared with ${group.length - 1} other page(s).`,
          evidence: truncate(p.metaDescription ?? ""),
        })),
      ),
  ),
];
