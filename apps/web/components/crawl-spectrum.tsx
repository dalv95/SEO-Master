import type { Severity } from "@seo-master/shared";
import { pathOf } from "@/lib/format";
import type { Dictionary } from "@/lib/i18n/en";

export interface SpectrumPage {
  url: string;
  worst: Severity | "clean" | "error";
  issues: number;
}

const FILL: Record<SpectrumPage["worst"], string> = {
  error: "var(--critical)",
  critical: "var(--critical)",
  warning: "var(--warning)",
  notice: "var(--notice)",
  clean: "var(--good)",
};

const LEGEND = ["critical", "warning", "notice", "clean"] as const;

/**
 * Every crawled page as one vertical bar, in crawl order, coloured by its worst issue.
 * Bar height encodes issue count so problem clusters stand out.
 */
export function CrawlSpectrum({ pages, t }: { pages: SpectrumPage[]; t: Dictionary["spectrum"] }) {
  const max = Math.max(1, ...pages.map((p) => p.issues));
  const counts = pages.reduce<Record<string, number>>((acc, p) => {
    const k = p.worst === "error" ? "critical" : p.worst;
    acc[k] = (acc[k] ?? 0) + 1;
    return acc;
  }, {});
  return (
    <figure>
      <svg
        viewBox={`0 0 ${pages.length} 100`}
        preserveAspectRatio="none"
        className="h-20 w-full"
        role="img"
        aria-label={t.aria(pages.length)}
      >
        {pages.map((p, i) => {
          const h = p.worst === "clean" ? 30 : 30 + (70 * p.issues) / max;
          return (
            <rect key={p.url} x={i + 0.08} y={100 - h} width={0.84} height={h} fill={FILL[p.worst]}>
              <title>{`${pathOf(p.url)} — ${p.worst === "clean" ? t.noIssues : t.issues(p.issues)}`}</title>
            </rect>
          );
        })}
      </svg>
      <figcaption className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-ink-soft">
        <span>{t.caption}</span>
        {LEGEND.map((k) => (
          <span key={k} className="inline-flex items-center gap-1.5">
            <span className="inline-block h-3 w-1.5 print:[print-color-adjust:exact]" style={{ background: FILL[k] }} />
            {t.legend[k]} <span className="tabular-nums text-ink">{counts[k] ?? 0}</span>
          </span>
        ))}
      </figcaption>
    </figure>
  );
}
