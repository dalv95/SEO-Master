export type Severity = "critical" | "warning" | "notice";

export type IssueCategory =
  | "meta"
  | "content"
  | "indexability"
  | "links"
  | "images"
  | "structured-data"
  | "social"
  | "security"
  | "performance";

/** Machine-readable description of a fix; consumed later by the auto-fix module (stage 4). */
export interface FixHint {
  action: "set" | "add" | "remove" | "replace";
  target: string; // e.g. "head > title", "img[src='...'] @alt"
  value?: string;
}

export interface Issue {
  ruleId: string;
  category: IssueCategory;
  severity: Severity;
  url: string;
  message: string;
  evidence?: string;
  fixHint?: FixHint;
}
