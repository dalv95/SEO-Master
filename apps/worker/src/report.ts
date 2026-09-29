import { issueMessage, ruleText, type Locale } from "@seo-master/seo-rules";
import type { AuditResult, CrawlResult, Issue } from "@seo-master/shared";

const ICON = { critical: "✖", warning: "▲", notice: "•" } as const;

/** Plain-text report for the CLI. */
export function formatReport(crawl: CrawlResult, audit: AuditResult, locale: Locale = "en", maxUrlsPerRule = 5): string {
  const lines: string[] = [];
  lines.push(`\nSEO audit: ${crawl.startUrl}`);
  lines.push(`Pages crawled: ${crawl.pages.length} · robots.txt: ${crawl.robotsTxt.found ? "yes" : "no"} · sitemap: ${crawl.sitemap.found ? `${crawl.sitemap.urls.length} URLs` : "no"} · JS rendering: ${crawl.rendering.used ? "yes" : `no${crawl.rendering.reason ? ` (${crawl.rendering.reason})` : ""}`}`);
  for (const r of crawl.pageSpeed ?? []) {
    lines.push(
      r.error
        ? `PageSpeed ${r.strategy} ${r.url}: failed (${r.error})`
        : `PageSpeed ${r.strategy.padEnd(7)} ${String(r.score ?? "–").padStart(3)}/100  LCP ${((r.field?.lcpMs ?? r.lab.lcpMs ?? 0) / 1000).toFixed(1)} s  CLS ${(r.field?.cls ?? r.lab.cls ?? 0).toFixed(2)}${r.field?.inpMs ? `  INP ${r.field.inpMs} ms` : ""}${r.field ? " (real users)" : " (lab)"}  ${r.url}`,
    );
  }
  lines.push(`\nOverall score: ${audit.score}/100\n`);
  for (const c of audit.categories) {
    lines.push(`  ${c.category.padEnd(16)} ${String(c.score).padStart(3)}  ${"█".repeat(Math.round(c.score / 5)).padEnd(20, "░")}  ${c.issues} issue(s)`);
  }

  const byRule = new Map<string, Issue[]>();
  for (const i of audit.issues) byRule.set(i.ruleId, [...(byRule.get(i.ruleId) ?? []), i]);

  lines.push(`\nIssues (${audit.issues.length}):`);
  for (const [ruleId, issues] of byRule) {
    const text = ruleText(locale, ruleId);
    const first = issues[0]!;
    lines.push(`\n${ICON[first.severity]} [${first.severity}] ${text?.title ?? ruleId} (${ruleId}) — ${issues.length}×`);
    for (const i of issues.slice(0, maxUrlsPerRule)) {
      lines.push(`    ${i.url}\n      ${issueMessage(locale, i.ruleId, i.params, i.message)}${i.evidence ? `\n      ↳ ${i.evidence}` : ""}`);
    }
    if (issues.length > maxUrlsPerRule) lines.push(`    … and ${issues.length - maxUrlsPerRule} more`);
  }
  return lines.join("\n");
}
