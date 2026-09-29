import Link from "next/link";
import { signOut } from "@/app/actions";
import { getT } from "@/lib/i18n";
import { LocaleSwitcher } from "./locale-switcher";

export function Brand() {
  return (
    <span className="text-lg font-bold tracking-tight">
      SEO<span className="text-signal">·</span>Master
    </span>
  );
}

export async function Shell({ email, children }: { email?: string; children: React.ReactNode }) {
  const { t } = await getT();
  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6">
      <header className="flex items-center justify-between gap-4 border-b border-rule py-4 print:hidden">
        <Link href="/">
          <Brand />
        </Link>
        <div className="flex items-center gap-4 text-sm text-ink-soft">
          <LocaleSwitcher />
          {email && (
            <form action={signOut} className="flex items-center gap-4">
              <span className="hidden sm:inline">{email}</span>
              <button className="rounded px-2 py-1 hover:text-ink">{t.signOut}</button>
            </form>
          )}
        </div>
      </header>
      <main className="py-8 sm:py-10 print:py-0">{children}</main>
    </div>
  );
}
