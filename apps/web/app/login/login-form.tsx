"use client";

import { useActionState } from "react";
import { sendMagicLink } from "../actions";
import { Button, inputClass } from "@/components/ui";

export function LoginForm() {
  const [state, action, pending] = useActionState(sendMagicLink, undefined);
  if (state?.sent)
    return (
      <p className="mt-8 rounded-md border border-rule bg-panel p-4 text-sm">
        Check your inbox and open the sign-in link. You can close this tab.
      </p>
    );
  return (
    <form action={action} className="mt-8 space-y-3">
      <label className="block text-sm font-medium" htmlFor="email">
        Email
      </label>
      <input id="email" name="email" type="email" required autoComplete="email" className={inputClass} />
      {state?.error && <p className="text-sm text-critical">{state.error}</p>}
      <Button disabled={pending} className="w-full">
        {pending ? "Sending…" : "Email me a sign-in link"}
      </Button>
    </form>
  );
}
