import type { CategoryScore, CrawlResult, FixHint, IssueCategory, IssueParams, PageSpeedResult, RenderMode, Severity } from "@seo-master/shared";

export type AuditStatus = "queued" | "running" | "completed" | "failed";

export interface ProjectRow {
  id: string;
  name: string;
  url: string;
  created_at: string;
  gsc_property: string | null;
  gsc_synced_at: string | null;
  gsc_sync_error: string | null;
}

export interface AuditRow {
  id: string;
  project_id: string;
  status: AuditStatus;
  max_pages: number;
  render_mode: RenderMode;
  pages_crawled: number;
  score: number | null;
  category_scores: CategoryScore[] | null;
  pagespeed: PageSpeedResult[] | null;
  crawl_summary: {
    /** While running: the worker has finished crawling and is testing speed. */
    stage?: "pagespeed";
    robotsTxt: { found: boolean; disallowed: number };
    sitemap: { found: boolean; urls: number };
    /** Missing on audits run before JS rendering existed. */
    rendering?: CrawlResult["rendering"];
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
  /** null for issues stored before messages became parametrized. */
  params: IssueParams | null;
  evidence: string | null;
  fix_hint: FixHint | null;
}
