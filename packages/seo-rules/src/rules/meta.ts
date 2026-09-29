import { duplicates, pageRule, siteRule, truncate } from "../rule";

export const TITLE_MAX = 60;
export const TITLE_MIN = 15;
export const DESCRIPTION_MAX = 160;
export const DESCRIPTION_MIN = 70;

export const metaRules = [
  pageRule(
    { id: "meta-title-missing", category: "meta", severity: "critical" },
    (p) => !p.title && { fixHint: { action: "set", target: "head > title" } },
  ),
  pageRule(
    { id: "meta-title-too-long", category: "meta", severity: "warning" },
    (p) =>
      !!p.title &&
      p.title.length > TITLE_MAX && {
        params: { length: p.title.length, max: TITLE_MAX },
        evidence: p.title,
        fixHint: { action: "replace", target: "head > title" },
      },
  ),
  pageRule(
    { id: "meta-title-too-short", category: "meta", severity: "notice" },
    (p) =>
      !!p.title &&
      p.title.length < TITLE_MIN && {
        params: { length: p.title.length, min: TITLE_MIN, max: TITLE_MAX },
        evidence: p.title,
        fixHint: { action: "replace", target: "head > title" },
      },
  ),
  siteRule({ id: "meta-title-duplicate", category: "meta", severity: "warning" }, (ctx) =>
    duplicates(ctx.htmlPages, (p) => p.title).flatMap((group) =>
      group.map((p) => ({
        url: p.finalUrl,
        params: { count: group.length - 1 },
        evidence: truncate(p.title ?? ""),
        fixHint: { action: "replace" as const, target: "head > title" },
      })),
    ),
  ),
  pageRule(
    { id: "meta-description-missing", category: "meta", severity: "warning" },
    (p) => !p.metaDescription && { fixHint: { action: "set", target: 'head > meta[name="description"] @content' } },
  ),
  pageRule({ id: "meta-description-length", category: "meta", severity: "notice" }, (p) => {
    const d = p.metaDescription;
    if (!d || (d.length >= DESCRIPTION_MIN && d.length <= DESCRIPTION_MAX)) return null;
    return {
      params: { length: d.length, min: DESCRIPTION_MIN, max: DESCRIPTION_MAX },
      evidence: truncate(d, 200),
      fixHint: { action: "replace", target: 'head > meta[name="description"] @content' },
    };
  }),
  siteRule({ id: "meta-description-duplicate", category: "meta", severity: "notice" }, (ctx) =>
    duplicates(ctx.htmlPages, (p) => p.metaDescription).flatMap((group) =>
      group.map((p) => ({
        url: p.finalUrl,
        params: { count: group.length - 1 },
        evidence: truncate(p.metaDescription ?? ""),
      })),
    ),
  ),
];
