import type { Severity } from "@seo-master/shared";
import { scoreTone } from "@/lib/format";

const TONE_TEXT = { good: "text-good", fair: "text-warning", poor: "text-critical", none: "text-ink-soft" } as const;

export function Score({ value, className = "" }: { value: number | null; className?: string }) {
  return <span className={`tabular-nums ${TONE_TEXT[scoreTone(value)]} ${className}`}>{value ?? "–"}</span>;
}

export const SEVERITY_BG: Record<Severity, string> = {
  critical: "bg-critical",
  warning: "bg-warning",
  notice: "bg-notice",
};

export function SeverityDot({ severity }: { severity: Severity }) {
  return <span aria-hidden className={`inline-block size-2 shrink-0 rounded-full ${SEVERITY_BG[severity]}`} />;
}

export function Panel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <section className={`rounded-lg border border-rule bg-panel ${className}`}>{children}</section>;
}

export function Button({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={`rounded-md bg-signal px-4 py-2 text-sm font-semibold text-signal-ink transition-opacity hover:opacity-90 disabled:opacity-50 ${props.className ?? ""}`}
    >
      {children}
    </button>
  );
}

export const inputClass =
  "w-full rounded-md border border-rule bg-panel px-3 py-2 text-sm placeholder:text-ink-soft/70 focus:border-signal focus:outline-none";
