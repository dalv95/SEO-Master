import { ISSUE_CATEGORIES, type CategoryScore, type Issue, type IssueCategory, type Severity } from "@seo-master/shared";
import type { Rule } from "./rule";

/** Max points a single rule can take off its category when it affects every page. */
const RULE_PENALTY: Record<Severity, number> = { critical: 35, warning: 15, notice: 5 };

/** Weight of each category in the overall score. */
export const CATEGORY_WEIGHT: Record<IssueCategory, number> = {
  indexability: 3,
  meta: 2,
  content: 2,
  links: 2,
  security: 2,
  performance: 1.5,
  images: 1,
  "structured-data": 1,
  social: 0.5,
};

/**
 * Each rule's penalty scales with the share of pages it affects (site-wide rules count as 100%),
 * so a single bad page on a large site doesn't tank the score.
 */
export function scoreIssues(issues: Issue[], rules: Rule[], population: (rule: Rule) => number) {
  const affected = new Map<string, Set<string>>();
  for (const i of issues) {
    if (!affected.has(i.ruleId)) affected.set(i.ruleId, new Set());
    affected.get(i.ruleId)!.add(i.url);
  }

  const penalty = new Map<IssueCategory, number>();
  for (const rule of rules) {
    const urls = affected.get(rule.id);
    if (!urls) continue;
    const share = Math.min(1, urls.size / Math.max(1, population(rule)));
    // Floor at 20% of the penalty so any occurrence is visible in the score.
    const p = RULE_PENALTY[rule.severity] * Math.max(0.2, share);
    penalty.set(rule.category, (penalty.get(rule.category) ?? 0) + p);
  }

  const categories: CategoryScore[] = ISSUE_CATEGORIES.map((category) => ({
    category,
    score: Math.max(0, Math.round(100 - (penalty.get(category) ?? 0))),
    issues: issues.filter((i) => i.category === category).length,
  }));

  const totalWeight = categories.reduce((s, c) => s + CATEGORY_WEIGHT[c.category], 0);
  const score = Math.round(categories.reduce((s, c) => s + c.score * CATEGORY_WEIGHT[c.category], 0) / totalWeight);
  return { score, categories };
}
