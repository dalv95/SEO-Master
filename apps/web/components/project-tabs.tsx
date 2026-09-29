import Link from "next/link";
import type { Dictionary } from "@/lib/i18n/en";

export function ProjectTabs({ projectId, active, t }: { projectId: string; active: "audits" | "gsc"; t: Dictionary }) {
  const tab = (href: string, label: string, on: boolean) => (
    <Link
      href={href}
      aria-current={on ? "page" : undefined}
      className={`-mb-px border-b-2 px-1 pb-2 text-sm font-medium ${
        on ? "border-signal text-ink" : "border-transparent text-ink-soft hover:text-ink"
      }`}
    >
      {label}
    </Link>
  );
  return (
    <nav className="mt-6 flex gap-6 border-b border-rule">
      {tab(`/projects/${projectId}`, t.gsc.auditsTab, active === "audits")}
      {tab(`/projects/${projectId}/search-console`, t.gsc.tab, active === "gsc")}
    </nav>
  );
}
