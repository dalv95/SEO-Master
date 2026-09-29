import Link from "next/link";
import type { IssueCategory } from "@seo-master/shared";
import type { Locale } from "@seo-master/seo-rules";
import { Score } from "@/components/ui";
import { displayUrl, formatDate, scoreTone } from "@/lib/format";
import type { Dictionary } from "@/lib/i18n/en";
import type { AuditRow, ProjectRow } from "@/lib/types";

const BAR = { good: "bg-good", fair: "bg-warning", poor: "bg-critical", none: "" } as const;

/** Big score, crawl facts and per-category score bars. Categories link to a filter when `categoryHref` is given. */
export function ReportSummary({
  audit,
  project,
  t,
  locale,
  activeCategory,
  categoryHref,
}: {
  audit: AuditRow;
  project: ProjectRow;
  t: Dictionary;
  locale: Locale;
  activeCategory?: IssueCategory;
  categoryHref?: (c: IssueCategory) => string;
}) {
  const summary = audit.crawl_summary;
  return (
    <div className="grid gap-6 lg:grid-cols-[auto_1fr] lg:items-center">
      <div className="flex items-baseline gap-4">
        <Score value={audit.score} className="text-7xl font-bold leading-none tracking-tighter sm:text-8xl" />
        <div>
          <p className="font-mono text-sm text-ink-soft">{displayUrl(project.url)}</p>
          <p className="text-sm text-ink-soft">
            {t.audit.pages(audit.pages_crawled)} · {formatDate(audit.created_at, locale)}
          </p>
          <p className="mt-1 text-xs text-ink-soft">
            robots.txt {summary?.robotsTxt.found ? "✓" : "✗"} · sitemap{" "}
            {summary?.sitemap.found ? `✓ ${t.audit.sitemapUrls(summary.sitemap.urls)}` : "✗"}
            {summary?.rendering && (
              <>
                {" · "}
                {summary.rendering.used
                  ? t.audit.rendering.used
                  : summary.rendering.mode === "never"
                    ? t.audit.rendering.off
                    : summary.rendering.reason === "unavailable"
                      ? t.audit.rendering.unavailable
                      : t.audit.rendering["not-needed"]}
              </>
            )}
          </p>
        </div>
      </div>
      <ul className="grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-3">
        {audit.category_scores?.map((c) => {
          const body = (
            <>
              <div className="flex justify-between gap-2 text-sm">
                <span className={activeCategory === c.category ? "font-semibold text-signal" : "group-hover:text-signal"}>
                  {t.category[c.category]}
                </span>
                <Score value={c.score} className="font-semibold" />
              </div>
              <div className="mt-1 h-1 rounded-full bg-rule print:[print-color-adjust:exact]">
                <div className={`h-full rounded-full ${BAR[scoreTone(c.score)]}`} style={{ width: `${c.score}%` }} />
              </div>
            </>
          );
          return (
            <li key={c.category}>
              {categoryHref ? (
                <Link href={categoryHref(c.category)} className="group block">
                  {body}
                </Link>
              ) : (
                body
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
