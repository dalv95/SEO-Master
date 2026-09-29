import type { IssueCategory } from "@seo-master/shared";

export const CATEGORY_LABEL: Record<IssueCategory, string> = {
  indexability: "Indexability",
  meta: "Titles & meta",
  content: "Content",
  links: "Links",
  images: "Images",
  "structured-data": "Structured data",
  social: "Social",
  security: "Security",
  performance: "Performance",
};

export const displayUrl = (url: string) => url.replace(/^https?:\/\//, "").replace(/\/$/, "");

/** Path relative to the site root, for dense lists where the host is implied. */
export function pathOf(url: string): string {
  try {
    const u = new URL(url);
    return u.pathname + u.search;
  } catch {
    return url;
  }
}

const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
export function timeAgo(iso: string): string {
  const s = (new Date(iso).getTime() - Date.now()) / 1000;
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ["day", 86400],
    ["hour", 3600],
    ["minute", 60],
  ];
  for (const [unit, secs] of units) if (Math.abs(s) >= secs) return rtf.format(Math.round(s / secs), unit);
  return "just now";
}

export function scoreTone(score: number | null): "good" | "fair" | "poor" | "none" {
  if (score === null) return "none";
  return score >= 90 ? "good" : score >= 70 ? "fair" : "poor";
}
