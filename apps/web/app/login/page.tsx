import { LoginForm } from "./login-form";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-4">
      <p className="text-lg font-bold tracking-tight">
        SEO<span className="text-signal">·</span>Master
      </p>
      <h1 className="mt-6 text-3xl font-bold tracking-tight">Sign in</h1>
      <p className="mt-2 text-ink-soft">We&apos;ll email you a link — no password needed.</p>
      {error && (
        <p className="mt-4 text-sm text-critical">That sign-in link is invalid or has expired. Request a new one.</p>
      )}
      <LoginForm />
    </main>
  );
}
