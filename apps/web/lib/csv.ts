/** RFC 4180 field quoting. Also neutralizes spreadsheet formula injection from crawled content. */
export function csvField(value: unknown, sep: string): string {
  let s = value === null || value === undefined ? "" : String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return s.includes(sep) || /["\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(rows: unknown[][], sep: string): string {
  // BOM so Excel detects UTF-8 (Polish characters).
  return "﻿" + rows.map((r) => r.map((v) => csvField(v, sep)).join(sep)).join("\r\n") + "\r\n";
}
