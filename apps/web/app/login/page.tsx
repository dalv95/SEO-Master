import { signInWithGoogle } from "../actions";
import { LoginForm } from "./login-form";

const ERRORS: Record<string, string> = {
  google: "Google sign-in didn't complete. Try again, or use email and password.",
  link: "That confirmation link has already been used or has expired. Try signing in.",
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-4">
      <p className="text-lg font-bold tracking-tight">
        SEO<span className="text-signal">·</span>Master
      </p>
      <h1 className="mt-6 text-3xl font-bold tracking-tight">Sign in</h1>
      {error && <p className="mt-4 text-sm text-critical">{ERRORS[error] ?? ERRORS.link}</p>}

      <form action={signInWithGoogle} className="mt-8">
        <button className="flex w-full items-center justify-center gap-3 rounded-md border border-rule bg-panel px-4 py-2 text-sm font-semibold hover:border-signal">
          <svg aria-hidden viewBox="0 0 48 48" className="size-4">
            <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
            <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
            <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
            <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
          </svg>
          Continue with Google
        </button>
      </form>

      <div className="my-6 flex items-center gap-3 text-xs text-ink-soft">
        <span className="h-px flex-1 bg-rule" />
        or with email
        <span className="h-px flex-1 bg-rule" />
      </div>

      <LoginForm />
    </main>
  );
}
