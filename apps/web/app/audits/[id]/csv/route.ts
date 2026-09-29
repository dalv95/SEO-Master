import { NextResponse, type NextRequest } from "next/server";
import { groupIssues, loadAudit, loadAuditDetails } from "@/lib/audit-report";
import { toCsv } from "@/lib/csv";
import { getT } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/server";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [supabase, { t, locale }] = await Promise.all([createClient(), getT()]);
  const loaded = await loadAudit(supabase, id); // RLS: only the owner gets a row
  if (!loaded || loaded.audit.status !== "completed") return new NextResponse("Not found", { status: 404 });

  const { issues } = await loadAuditDetails(supabase, id);
  const rows: unknown[][] = [
    [t.csv.severity, t.csv.category, t.csv.rule, t.csv.url, t.csv.message, t.csv.evidence, t.csv.howToFix, t.csv.ruleId],
  ];
  for (const g of groupIssues(issues, locale))
    for (const i of g.issues)
      rows.push([t.severity[g.severity], t.category[g.category], g.title, i.url, i.text, i.evidence, g.help, g.ruleId]);

  // Polish Excel splits columns on ";" (comma is the decimal separator there).
  const body = toCsv(rows, locale === "pl" ? ";" : ",");
  const host = new URL(loaded.project.url).hostname;
  const date = loaded.audit.created_at.slice(0, 10);
  return new NextResponse(body, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="seo-audit-${host}-${date}.csv"`,
    },
  });
}
