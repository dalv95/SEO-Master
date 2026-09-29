import type { AuditResult, CrawlResult, Severity } from "@seo-master/shared";
import { buildContext } from "./context";
import type { Rule } from "./rule";
import { contentRules } from "./rules/content";
import { indexabilityRules } from "./rules/indexability";
import { linkRules } from "./rules/links";
import { metaRules } from "./rules/meta";
import {
  imageRules,
  performanceRules,
  securityRules,
  socialRules,
  structuredDataRules,
} from "./rules/misc";
import { scoreIssues } from "./score";

export const rules: Rule[] = [
  ...indexabilityRules,
  ...metaRules,
  ...contentRules,
  ...linkRules,
  ...imageRules,
  ...structuredDataRules,
  ...socialRules,
  ...securityRules,
  ...performanceRules,
];

export const ruleById = new Map(rules.map((r) => [r.id, r]));

const SEVERITY_ORDER: Record<Severity, number> = { critical: 0, warning: 1, notice: 2 };

export function runAudit(crawl: CrawlResult, ruleset: Rule[] = rules): AuditResult {
  const ctx = buildContext(crawl);
  const issues = ruleset
    .flatMap((r) => r.run(ctx))
    .sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);
  return { ...scoreIssues(issues, ruleset, ctx.htmlPages.length), issues };
}

export { buildContext, type AuditContext } from "./context";
export type { Rule, Finding } from "./rule";
export { CATEGORY_WEIGHT } from "./score";
export * from "./texts";
