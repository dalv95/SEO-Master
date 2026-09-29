"use client";

import { useActionState } from "react";
import { createProject } from "./actions";
import { Button, inputClass } from "@/components/ui";

export function NewProjectForm() {
  const [state, action, pending] = useActionState(createProject, undefined);
  return (
    <form action={action} className="mt-4 space-y-3">
      <div>
        <label htmlFor="url" className="mb-1 block text-sm text-ink-soft">
          Website address
        </label>
        <input id="url" name="url" required placeholder="example.com" className={`${inputClass} font-mono`} />
      </div>
      <div>
        <label htmlFor="name" className="mb-1 block text-sm text-ink-soft">
          Name <span className="text-ink-soft/70">(optional)</span>
        </label>
        <input id="name" name="name" placeholder="My shop" className={inputClass} />
      </div>
      {state?.error && <p className="text-sm text-critical">{state.error}</p>}
      <Button disabled={pending} className="w-full">
        {pending ? "Adding…" : "Add site and run audit"}
      </Button>
    </form>
  );
}
