import Link from "next/link";
import { signOut } from "@/app/actions";

export function Shell({ email, children }: { email?: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6">
      <header className="flex items-center justify-between border-b border-rule py-4">
        <Link href="/" className="text-lg font-bold tracking-tight">
          SEO<span className="text-signal">·</span>Master
        </Link>
        {email && (
          <form action={signOut} className="flex items-center gap-4 text-sm text-ink-soft">
            <span className="hidden sm:inline">{email}</span>
            <button className="rounded px-2 py-1 hover:text-ink">Sign out</button>
          </form>
        )}
      </header>
      <main className="py-8 sm:py-10">{children}</main>
    </div>
  );
}
