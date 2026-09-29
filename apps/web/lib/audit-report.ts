import { issueMessage, ruleText, type Locale } from "@seo-master/seo-rules";
import type { IssueCategory, Severity } from "@seo-master/shared";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { SpectrumPage } from "@/components/crawl-spectrum";
import type { AuditIssueRow, AuditPageRow, AuditRow, ProjectRow } from "./types";

export const SEVERITIES: Severity[] = ["critical", "warning", "notice"];
export const SEVERITY_RANK: Record<Severity, number> = { critical: 0, warning: 1, notice: 2 };

export async function loadAudit(supabase: SupabaseClient, id: string) {
  const { data: audit } = await supabase.from("audits").select("*").eq("id", id).maybeSingle<AuditRow>();
  if (!audit) return null;
  const { data: project } = await supabase
    .from("projects")
    .select("*")
    .eq("id", audit.project_id)
    .single<ProjectRow>();
  return { audit, project: project! };
}

export async function loadAuditDetails(supabase: SupabaseClient, auditId: string) {
  const [{ data: issues }, { data: pages }] = await Promise.all([
    supabase.from("audit_issues").select("*").eq("audit_id", auditId).limit(20000).returns<AuditIssueRow[]>(),
    supabase
      .from("audit_pages")
      .select("id, url, final_url, status, depth, is_html, title, word_count, response_time_ms")
      .eq("audit_id", auditId)
      .order("id")
      .limit(5000)
      .returns<AuditPageRow[]>(),
  ]);
  return { issues: issues ?? [], pages: pages ?? [] };
}

/** Worst severity and issue count per URL. */
export function issuesPerUrl(issues: AuditIssueRow[]) {
  const perUrl = new Map<string, { worst: Severity; n: number }>();
  for (const i of issues) {
    const cur = perUrl.get(i.url);
    if (!cur) perUrl.set(i.url, { worst: i.severity, n: 1 });
    else {
      cur.n++;
      if (SEVERITY_RANK[i.severity] < SEVERITY_RANK[cur.worst]) cur.worst = i.severity;
    }
  }
  return perUrl;
}

export function buildSpectrum(pages: AuditPageRow[], perUrl: ReturnType<typeof issuesPerUrl>): SpectrumPage[] {
  const seenFinal = new Set<string>();
  return pages.flatMap((p): SpectrumPage[] => {
    // A redirecting URL and its target are one document: show it once.
    if (p.is_html && p.status === 200) {
      if (seenFinal.has(p.final_url)) return [];
      seenFinal.add(p.final_url);
    }
    const s = perUrl.get(p.final_url) ?? perUrl.get(p.url);
    if (p.status === 0 || p.status >= 400) return [{ url: p.url, worst: "error", issues: s?.n ?? 1 }];
    return [{ url: p.final_url, worst: s?.worst ?? "clean", issues: s?.n ?? 0 }];
  });
}

export interface IssueGroup {
  ruleId: string;
  severity: Severity;
  category: IssueCategory;
  title: string;
  help: string;
  issues: (AuditIssueRow & { text: string })[];
  pagesAffected: number;
}

/** Issues grouped by rule, most severe and most frequent first, with localized texts. */
export function groupIssues(issues: AuditIssueRow[], locale: Locale): IssueGroup[] {
  return [...Map.groupBy(issues, (i) => i.rule_id).entries()]
    .map(([ruleId, list]) => {
      const text = ruleText(locale, ruleId);
      return {
        ruleId,
        severity: list[0]!.severity,
        category: list[0]!.category,
        title: text?.title ?? ruleId,
        help: text?.help ?? "",
        issues: list.map((i) => ({ ...i, text: issueMessage(locale, i.rule_id, i.params, i.message) })),
        pagesAffected: new Set(list.map((i) => i.url)).size,
      };
    })
    .sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity] || b.issues.length - a.issues.length);
}
