import type { CategoryScore, FixHint, IssueCategory, Severity } from "@seo-master/shared";

export type AuditStatus = "queued" | "running" | "completed" | "failed";

export interface ProjectRow {
  id: string;
  name: string;
  url: string;
  created_at: string;
}

export interface AuditRow {
  id: string;
  project_id: string;
  status: AuditStatus;
  max_pages: number;
  pages_crawled: number;
  score: number | null;
  category_scores: CategoryScore[] | null;
  crawl_summary: {
    robotsTxt: { found: boolean; disallowed: number };
    sitemap: { found: boolean; urls: number };
  } | null;
  error: string | null;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
}

export interface AuditPageRow {
  id: number;
  url: string;
  final_url: string;
  status: number;
  depth: number;
  is_html: boolean;
  title: string | null;
  word_count: number | null;
  response_time_ms: number | null;
}

export interface AuditIssueRow {
  id: number;
  url: string;
  rule_id: string;
  category: IssueCategory;
  severity: Severity;
  message: string;
  evidence: string | null;
  fix_hint: FixHint | null;
}
