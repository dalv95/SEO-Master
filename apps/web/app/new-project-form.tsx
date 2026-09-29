"use client";

import { useActionState } from "react";
import { createProject } from "./actions";
import { Button, inputClass } from "@/components/ui";
import type { Dictionary } from "@/lib/i18n/en";

export function NewProjectForm({ t }: { t: Dictionary["dashboard"] }) {
  const [state, action, pending] = useActionState(createProject, undefined);
  return (
    <form action={action} className="mt-4 space-y-3">
      <div>
        <label htmlFor="url" className="mb-1 block text-sm text-ink-soft">
          {t.siteAddress}
        </label>
        <input id="url" name="url" required placeholder="example.com" className={`${inputClass} font-mono`} />
      </div>
      <div>
        <label htmlFor="name" className="mb-1 block text-sm text-ink-soft">
          {t.name} <span className="text-ink-soft/70">{t.optional}</span>
        </label>
        <input id="name" name="name" placeholder={t.namePlaceholder} className={inputClass} />
      </div>
      {state?.error && <p className="text-sm text-critical">{state.error}</p>}
      <Button disabled={pending} className="w-full">
        {pending ? t.adding : t.addAndRun}
      </Button>
    </form>
  );
}
