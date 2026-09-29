import postgres from "postgres";
import type { AuditResult, CrawlResult, RenderMode } from "@seo-master/shared";
import { env } from "./env";

export const sql = postgres(env.DATABASE_URL, { max: 5, prepare: false });

export interface ClaimedAudit {
  id: string;
  url: string;
  max_pages: number;
  render_mode: RenderMode;
}

/** Atomically take the oldest queued audit (safe with multiple workers). */
export async function claimNextAudit(): Promise<ClaimedAudit | null> {
  const rows = await sql<ClaimedAudit[]>`
    update audits a set status = 'running', started_at = now()
    from projects p
    where p.id = a.project_id and a.id = (
      select id from audits where status = 'queued' order by created_at
      for update skip locked limit 1
    )
    returning a.id, p.url, a.max_pages, a.render_mode`;
  return rows[0] ?? null;
}

export async function updateProgress(auditId: string, pagesCrawled: number) {
  await sql`update audits set pages_crawled = ${pagesCrawled} where id = ${auditId}`;
}

const CHUNK = 500;

export async function saveResults(auditId: string, crawl: CrawlResult, audit: AuditResult) {
  await sql.begin(async (tx) => {
    const pages = crawl.pages.map(
      ({ url, finalUrl, status, depth, isHtml, title, metaDescription, wordCount, responseTimeMs, bytes, ...data }) => ({
        audit_id: auditId,
        url,
        final_url: finalUrl,
        status,
        depth,
        is_html: isHtml,
        title,
        meta_description: metaDescription,
        word_count: wordCount,
        response_time_ms: responseTimeMs,
        bytes,
        data: tx.json(data as never),
      }),
    );
    for (let i = 0; i < pages.length; i += CHUNK) await tx`insert into audit_pages ${tx(pages.slice(i, i + CHUNK))}`;

    const issues = audit.issues.map((i) => ({
      audit_id: auditId,
      url: i.url,
      rule_id: i.ruleId,
      category: i.category,
      severity: i.severity,
      message: i.message,
      params: tx.json(i.params as never),
      evidence: i.evidence ?? null,
      fix_hint: i.fixHint ? tx.json(i.fixHint as never) : null,
    }));
    for (let i = 0; i < issues.length; i += CHUNK) await tx`insert into audit_issues ${tx(issues.slice(i, i + CHUNK))}`;

    await tx`
      update audits set
        status = 'completed',
        finished_at = now(),
        pages_crawled = ${crawl.pages.length},
        score = ${audit.score},
        category_scores = ${tx.json(audit.categories as never)},
        crawl_summary = ${tx.json({
          robotsTxt: { found: crawl.robotsTxt.found, disallowed: crawl.robotsTxt.disallowedUrls.length },
          sitemap: { found: crawl.sitemap.found, urls: crawl.sitemap.urls.length },
          rendering: crawl.rendering,
        })}
      where id = ${auditId}`;
  });
}

export async function failAudit(auditId: string, error: string) {
  await sql`update audits set status = 'failed', error = ${error}, finished_at = now() where id = ${auditId}`;
}

/** Audits left 'running' by a crashed worker are re-queued on startup. */
export async function requeueStale() {
  await sql`update audits set status = 'queued', started_at = null, pages_crawled = 0
            where status = 'running' and started_at < now() - interval '1 hour'`;
}
