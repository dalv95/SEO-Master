import type { FixHint, Issue, IssueCategory, ParsedPage, Severity } from "@seo-master/shared";
import type { AuditContext } from "./context";

export interface Finding {
  message: string;
  evidence?: string;
  fixHint?: FixHint;
  url?: string;
}

export interface Rule {
  id: string;
  category: IssueCategory;
  severity: Severity;
  /** Short human-readable title, shown as the group header in reports. */
  title: string;
  run(ctx: AuditContext): Issue[];
}

type Meta = Omit<Rule, "run">;
type Out = Finding | Finding[] | null | undefined | false;

const toIssues = (meta: Meta, url: string, out: Out): Issue[] =>
  (out ? (Array.isArray(out) ? out : [out]) : []).map((f) => ({
    ruleId: meta.id,
    category: meta.category,
    severity: meta.severity,
    url: f.url ?? url,
    message: f.message,
    ...(f.evidence !== undefined ? { evidence: f.evidence } : {}),
    ...(f.fixHint ? { fixHint: f.fixHint } : {}),
  }));

/** Rule evaluated once per crawled 200 HTML page. */
export function pageRule(meta: Meta, check: (page: ParsedPage, ctx: AuditContext) => Out): Rule {
  return { ...meta, run: (ctx) => ctx.htmlPages.flatMap((p) => toIssues(meta, p.finalUrl, check(p, ctx))) };
}

/** Rule evaluated once per crawled URL regardless of status/content type. */
export function anyPageRule(meta: Meta, check: (page: ParsedPage, ctx: AuditContext) => Out): Rule {
  return { ...meta, run: (ctx) => ctx.crawl.pages.flatMap((p) => toIssues(meta, p.url, check(p, ctx))) };
}

/** Rule evaluated once for the whole site. Findings without `url` are attached to the start URL. */
export function siteRule(meta: Meta, check: (ctx: AuditContext) => Out): Rule {
  return { ...meta, run: (ctx) => toIssues(meta, ctx.crawl.startUrl, check(ctx)) };
}

export const truncate = (s: string, n = 120) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

/** Group pages by a normalized key and return groups with more than one page. */
export function duplicates(pages: ParsedPage[], key: (p: ParsedPage) => string | null): ParsedPage[][] {
  const groups = new Map<string, ParsedPage[]>();
  for (const p of pages) {
    const k = key(p)?.trim().toLowerCase();
    if (!k) continue;
    groups.set(k, [...(groups.get(k) ?? []), p]);
  }
  return [...groups.values()].filter((g) => g.length > 1);
}
