import Link from "next/link";
import { notFound } from "next/navigation";
import { CrawlSpectrum } from "@/components/crawl-spectrum";
import { PrintButton, PrintOnLoad } from "@/components/print-on-load";
import { ReportSummary } from "@/components/report-summary";
import { Brand } from "@/components/shell";
import { SeverityDot } from "@/components/ui";
import { buildSpectrum, groupIssues, issuesPerUrl, loadAudit, loadAuditDetails } from "@/lib/audit-report";
import { formatDate } from "@/lib/format";
import { getT } from "@/lib/i18n";
import { requireUser } from "@/lib/supabase/server";

/** Keeps the PDF readable; the CSV export has everything. */
const URLS_PER_RULE = 25;

export const metadata = { title: "SEO audit report" };

export default async function PrintReport({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, { supabase }, { t, locale }] = await Promise.all([params, requireUser(), getT()]);
  const loaded = await loadAudit(supabase, id);
  if (!loaded || loaded.audit.status !== "completed") notFound();
  const { audit, project } = loaded;
  const { issues, pages } = await loadAuditDetails(supabase, id);
  const groups = groupIssues(issues, locale);

  return (
    <div className="mx-auto max-w-4xl bg-paper px-6 py-8 print:max-w-none print:bg-white print:p-0">
      <PrintOnLoad />
      <style>{`@page { size: A4; margin: 14mm 12mm; } @media print { :root { --paper: #fff; --panel: #fff; } }`}</style>

      <div className="mb-8 flex flex-wrap items-center justify-between gap-3 rounded-md border border-rule bg-panel p-4 print:hidden">
        <p className="text-sm text-ink-soft">{t.print.hint}</p>
        <div className="flex items-center gap-3">
          <Link href={`/audits/${id}`} className="text-sm text-ink-soft hover:text-ink">
            {t.print.back}
          </Link>
          <PrintButton>{t.print.save}</PrintButton>
        </div>
      </div>

      <header className="flex items-end justify-between border-b border-rule pb-4">
        <div>
          <Brand />
          <h1 className="mt-1 text-2xl font-bold tracking-tight">
            {t.print.title}: {project.name}
          </h1>
        </div>
        <p className="text-xs text-ink-soft">{t.print.generated(formatDate(new Date().toISOString(), locale, true))}</p>
      </header>

      <section className="mt-6 break-inside-avoid">
        <ReportSummary audit={audit} project={project} t={t} locale={locale} />
      </section>

      <section className="mt-6 break-inside-avoid rounded-lg border border-rule p-4 print:[print-color-adjust:exact]">
        <CrawlSpectrum pages={buildSpectrum(pages, issuesPerUrl(issues))} t={t.spectrum} />
      </section>

      <h2 className="mt-8 text-xl font-bold tracking-tight">{t.audit.whatToFix}</h2>
      {groups.map((g) => (
        <section key={g.ruleId} className="mt-5 border-t border-rule pt-4">
          <div className="flex items-center gap-2 break-after-avoid print:[print-color-adjust:exact]">
            <SeverityDot severity={g.severity} />
            <h3 className="flex-1 font-semibold">{g.title}</h3>
            <span className="text-xs text-ink-soft">
              {t.severity[g.severity]} · {t.category[g.category]} · {t.audit.pages(g.pagesAffected)}
            </span>
          </div>
          <p className="mt-1 text-sm text-ink-soft break-after-avoid">
            <span className="font-semibold text-ink">{t.audit.howToFix}:</span> {g.help}
          </p>
          <ul className="mt-2 space-y-1.5">
            {g.issues.slice(0, URLS_PER_RULE).map((i) => (
              <li key={i.id} className="break-inside-avoid border-l-2 border-rule pl-3 text-xs">
                <span className="break-all font-mono">{i.url}</span>
                <span className="text-ink-soft"> — {i.text}</span>
                {i.evidence && <span className="block break-all text-ink-soft">↳ {i.evidence}</span>}
              </li>
            ))}
          </ul>
          {g.issues.length > URLS_PER_RULE && (
            <p className="mt-2 text-xs text-ink-soft">{t.print.moreInCsv(g.issues.length - URLS_PER_RULE)}</p>
          )}
        </section>
      ))}
    </div>
  );
}
