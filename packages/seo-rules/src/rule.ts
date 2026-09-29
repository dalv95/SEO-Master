import type { FixHint, Issue, IssueCategory, IssueParams, ParsedPage, Severity } from "@seo-master/shared";
import type { AuditContext } from "./context";
import { en } from "./texts/en";

export interface Finding {
  /** Values for the rule's message template in src/texts. */
  params?: IssueParams;
  evidence?: string;
  fixHint?: FixHint;
  url?: string;
}

export interface Rule {
  id: string;
  category: IssueCategory;
  severity: Severity;
  /** English title (localized titles: `ruleText(locale, id)`). */
  title: string;
  /**
   * Number of pages the rule could have flagged, for scoring the share of affected pages.
   * Defaults to all crawled HTML pages; sampled checks (PageSpeed) use their sample size.
   */
  population?: (ctx: AuditContext) => number;
  run(ctx: AuditContext): Issue[];
}

type Meta = Pick<Rule, "id" | "category" | "severity" | "population">;
type Out = Finding | Finding[] | null | undefined | false;

function define(meta: Meta, run: (emit: (url: string, out: Out) => Issue[], ctx: AuditContext) => Issue[]): Rule {
  const text = en[meta.id];
  if (!text) throw new Error(`Rule "${meta.id}" has no texts in src/texts/en.ts`);
  const emit = (url: string, out: Out): Issue[] =>
    (out ? (Array.isArray(out) ? out : [out]) : []).map((f) => {
      const params = f.params ?? {};
      return {
        ruleId: meta.id,
        category: meta.category,
        severity: meta.severity,
        url: f.url ?? url,
        message: text.message(params),
        params,
        ...(f.evidence !== undefined ? { evidence: f.evidence } : {}),
        ...(f.fixHint ? { fixHint: f.fixHint } : {}),
      };
    });
  return { ...meta, title: text.title, run: (ctx) => run(emit, ctx) };
}

/** Rule evaluated once per crawled 200 HTML page. */
export function pageRule(meta: Meta, check: (page: ParsedPage, ctx: AuditContext) => Out): Rule {
  return define(meta, (emit, ctx) => ctx.htmlPages.flatMap((p) => emit(p.finalUrl, check(p, ctx))));
}

/** Rule evaluated once per crawled URL regardless of status/content type. */
export function anyPageRule(meta: Meta, check: (page: ParsedPage, ctx: AuditContext) => Out): Rule {
  return define(meta, (emit, ctx) => ctx.crawl.pages.flatMap((p) => emit(p.url, check(p, ctx))));
}

/** Rule evaluated once for the whole site. Findings without `url` are attached to the start URL. */
export function siteRule(meta: Meta, check: (ctx: AuditContext) => Out): Rule {
  return define(meta, (emit, ctx) => emit(ctx.crawl.startUrl, check(ctx)));
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
