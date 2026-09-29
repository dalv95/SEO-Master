"use client";

import { useActionState, useState } from "react";
import { signInWithPassword, signUp } from "../actions";
import { Button, inputClass } from "@/components/ui";

export function LoginForm() {
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
          Email
        </label>
        <input id="email" name="email" type="email" required autoComplete="email" className={inputClass} />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium" htmlFor="password">
          Password
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
        {isSignUp && <p className="mt-1 text-xs text-ink-soft">At least 8 characters.</p>}
      </div>
      {state?.error && <p className="text-sm text-critical">{state.error}</p>}
      {state?.info && <p className="rounded-md border border-rule bg-panel p-3 text-sm">{state.info}</p>}
      <Button disabled={pending} className="w-full">
        {isSignUp ? (pending ? "Creating account…" : "Create account") : pending ? "Signing in…" : "Sign in"}
      </Button>
      <p className="text-center text-sm text-ink-soft">
        {isSignUp ? "Already have an account?" : "New here?"}{" "}
        <button
          type="button"
          onClick={() => setMode(isSignUp ? "signin" : "signup")}
          className="font-medium text-signal hover:underline"
        >
          {isSignUp ? "Sign in" : "Create an account"}
        </button>
      </p>
    </form>
  );
}
