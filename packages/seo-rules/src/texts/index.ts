import type { IssueParams } from "@seo-master/shared";
import { en } from "./en";
import { pl } from "./pl";
import type { Locale, RuleText, RuleTexts } from "./types";

export const ruleTexts: Record<Locale, RuleTexts> = { pl, en };

export function ruleText(locale: Locale, ruleId: string): RuleText | undefined {
  return ruleTexts[locale][ruleId] ?? ruleTexts.en[ruleId];
}

/**
 * Localized issue message. Issues stored before messages became parametrized
 * have no params — fall back to their stored (English) message.
 */
export function issueMessage(locale: Locale, ruleId: string, params: IssueParams | null | undefined, fallback: string) {
  const t = ruleText(locale, ruleId);
  return t && params ? t.message(params) : fallback;
}

export { plural } from "./pl";
export { LOCALES, type Locale, type RuleText } from "./types";
