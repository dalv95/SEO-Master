"use client";

import { useActionState, useState } from "react";
import { signInWithPassword, signUp } from "../actions";
import { Button, inputClass } from "@/components/ui";
import type { Dictionary } from "@/lib/i18n/en";

export function LoginForm({ t }: { t: Dictionary["login"] }) {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [signInState, signInAction, signingIn] = useActionState(signInWithPassword, undefined);
  const [signUpState, signUpAction, signingUp] = useActionState(signUp, undefined);
  const isSignUp = mode === "signup";
  const state = isSignUp ? signUpState : signInState;
  const pending = signingIn || signingUp;

  return (
    <form action={isSignUp ? signUpAction : signInAction} className="space-y-3">
      <div>
        <label className="mb-1 block text-sm font-medium" htmlFor="email">
          {t.email}
        </label>
        <input id="email" name="email" type="email" required autoComplete="email" className={inputClass} />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium" htmlFor="password">
          {t.password}
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete={isSignUp ? "new-password" : "current-password"}
          className={inputClass}
        />
        {isSignUp && <p className="mt-1 text-xs text-ink-soft">{t.passwordHint}</p>}
      </div>
      {state?.error && <p className="text-sm text-critical">{state.error}</p>}
      {state?.info && <p className="rounded-md border border-rule bg-panel p-3 text-sm">{state.info}</p>}
      <Button disabled={pending} className="w-full">
        {isSignUp ? (pending ? t.creatingAccount : t.createAccount) : pending ? t.signingIn : t.signIn}
      </Button>
      <p className="text-center text-sm text-ink-soft">
        {isSignUp ? t.haveAccount : t.newHere}{" "}
        <button
          type="button"
          onClick={() => setMode(isSignUp ? "signin" : "signup")}
          className="font-medium text-signal hover:underline"
        >
          {isSignUp ? t.toSignIn : t.toSignUp}
        </button>
      </p>
    </form>
  );
}
