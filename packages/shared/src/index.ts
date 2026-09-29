import { z } from "zod";

export type Severity = "critical" | "warning" | "notice";

export const ISSUE_CATEGORIES = [
  "meta",
  "content",
  "indexability",
  "links",
  "images",
  "structured-data",
  "social",
  "security",
  "performance",
] as const;

export type IssueCategory = (typeof ISSUE_CATEGORIES)[number];

/** Machine-readable description of a fix; consumed later by the auto-fix module (stage 4). */
export interface FixHint {
  action: "set" | "add" | "remove" | "replace";
  target: string; // e.g. "head > title", "img[src='...'] @alt"
  value?: string;
}

/** Values a rule fills into its localized message template (see seo-rules/src/texts). */
export type IssueParams = Record<string, string | number | boolean | undefined>;

export interface Issue {
  ruleId: string;
  category: IssueCategory;
  severity: Severity;
  url: string;
  /** English message, kept for the CLI and as a fallback. */
  message: string;
  params: IssueParams;
  evidence?: string;
  fixHint?: FixHint;
}

export interface RedirectHop {
  url: string;
  status: number;
}

export interface PageLink {
  /** Absolute URL without fragment. */
  href: string;
  text: string;
  rel: string;
  internal: boolean;
}

export interface PageImage {
  src: string;
  /** `null` when the attribute is missing, `""` when explicitly empty (decorative). */
  alt: string | null;
}

export interface JsonLdBlock {
  raw: string;
  types: string[];
  error?: string;
}

/** Everything the audit rules need to know about one fetched URL. */
export interface ParsedPage {
  url: string;
  finalUrl: string;
  status: number;
  redirectChain: RedirectHop[];
  contentType: string | null;
  responseTimeMs: number;
  bytes: number;
  isHtml: boolean;
  /** Crawl depth from the start URL (0 = start URL). */
  depth: number;
  error?: string;

  title: string | null;
  metaDescription: string | null;
  metaRobots: string | null;
  xRobotsTag: string | null;
  canonical: string | null;
  lang: string | null;
  hasViewport: boolean;
  hreflang: { lang: string; href: string }[];
  headings: { level: number; text: string }[];
  images: PageImage[];
  links: PageLink[];
  jsonLd: JsonLdBlock[];
  openGraph: Record<string, string>;
  twitter: Record<string, string>;
  wordCount: number;
  /** http:// subresources referenced from an https page. */
  mixedContent: string[];
  /** Set when the page was rendered with JavaScript: what the raw HTML (no JS) contained. */
  raw?: { title: string | null; wordCount: number; linkCount: number };
}

export type PageSpeedStrategy = "mobile" | "desktop";

/** Google PageSpeed Insights result for one URL and device. */
export interface PageSpeedResult {
  url: string;
  strategy: PageSpeedStrategy;
  /** Lighthouse performance score 0–100. */
  score: number | null;
  /** Lighthouse lab measurements. */
  lab: { lcpMs: number | null; cls: number | null; tbtMs: number | null; fcpMs: number | null; siMs: number | null };
  /** Chrome UX Report (real users, p75) for this URL, or the whole origin as fallback; null for low-traffic sites. */
  field: {
    source: "url" | "origin";
    lcpMs: number | null;
    inpMs: number | null;
    cls: number | null;
    category: "FAST" | "AVERAGE" | "SLOW" | null;
  } | null;
  /** Failing Lighthouse insights, biggest estimated savings first. */
  opportunities: { id: string; title: string; savingsMs: number; displayValue?: string }[];
  error?: string;
}

export type RenderMode = "auto" | "always" | "never";
export const RENDER_MODES: RenderMode[] = ["auto", "always", "never"];

export interface CrawlResult {
  startUrl: string;
  origin: string;
  pages: ParsedPage[];
  robotsTxt: { found: boolean; disallowedUrls: string[] };
  sitemap: { found: boolean; urls: string[] };
  /** True when the crawl stopped at maxPages with URLs still queued. */
  truncated: boolean;
  /** PageSpeed Insights results for the most important pages (absent when no API key is configured). */
  pageSpeed?: PageSpeedResult[];
  /** Whether pages were rendered with JavaScript, and why (for "auto"). */
  rendering: { mode: RenderMode; used: boolean; reason?: string };
  startedAt: string;
  finishedAt: string;
}

export interface CategoryScore {
  category: IssueCategory;
  score: number;
  issues: number;
}

export interface AuditResult {
  score: number;
  categories: CategoryScore[];
  issues: Issue[];
}

export const auditJobSchema = z.object({
  auditId: z.string().uuid(),
  url: z.string().url(),
  maxPages: z.number().int().min(1).max(5000).default(500),
  renderMode: z.enum(["auto", "always", "never"]).default("auto"),
});

export type AuditJob = z.infer<typeof auditJobSchema>;

export const AUDIT_QUEUE = "audit";
