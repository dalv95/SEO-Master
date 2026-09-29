import type { Locale } from "@seo-master/seo-rules";
import { INTL_LOCALE } from "./i18n/intl";

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

export function timeAgo(iso: string, locale: Locale): string {
  const rtf = new Intl.RelativeTimeFormat(INTL_LOCALE[locale], { numeric: "auto" });
  const s = (new Date(iso).getTime() - Date.now()) / 1000;
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ["day", 86400],
    ["hour", 3600],
    ["minute", 60],
  ];
  for (const [unit, secs] of units) if (Math.abs(s) >= secs) return rtf.format(Math.round(s / secs), unit);
  return rtf.format(0, "second");
}

export const formatDate = (iso: string, locale: Locale, time = false) =>
  new Date(iso).toLocaleString(INTL_LOCALE[locale], time ? { dateStyle: "medium", timeStyle: "short" } : { dateStyle: "medium" });

export function scoreTone(score: number | null): "good" | "fair" | "poor" | "none" {
  if (score === null) return "none";
  return score >= 90 ? "good" : score >= 70 ? "fair" : "poor";
}
