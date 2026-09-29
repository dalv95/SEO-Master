import type { IssueParams } from "@seo-master/shared";

export type Locale = "pl" | "en";
export const LOCALES: Locale[] = ["pl", "en"];

export interface RuleText {
  /** Short name, used as the group header in reports. */
  title: string;
  /** Renders the per-issue message from the params the rule produced. */
  message: (p: IssueParams) => string;
  /** Why it matters and how to fix it. */
  help: string;
}

export type RuleTexts = Record<string, RuleText>;
