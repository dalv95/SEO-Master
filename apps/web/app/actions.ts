"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient, requireUser } from "@/lib/supabase/server";

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export type FormState = { error?: string; sent?: boolean } | undefined;

export async function sendMagicLink(_: FormState, form: FormData): Promise<FormState> {
  const email = z.string().email().safeParse(form.get("email"));
  if (!email.success) return { error: "Enter a valid email address." };
  const supabase = await createClient();
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const { error } = await supabase.auth.signInWithOtp({
    email: email.data,
    options: { emailRedirectTo: `${origin}/auth/callback` },
  });
  return error ? { error: error.message } : { sent: true };
}

const projectSchema = z.object({
  url: z
    .string()
    .trim()
    .transform((v) => (/^https?:\/\//i.test(v) ? v : `https://${v}`))
    .pipe(z.string().url()),
  name: z.string().trim().max(100).optional(),
});

export async function createProject(_: FormState, form: FormData): Promise<FormState> {
  const parsed = projectSchema.safeParse({ url: form.get("url"), name: form.get("name") || undefined });
  if (!parsed.success) return { error: "Enter a website address, e.g. example.com." };
  const url = new URL(parsed.data.url);
  const { supabase } = await requireUser();
  const { data, error } = await supabase
    .from("projects")
    .insert({ url: url.origin + url.pathname, name: parsed.data.name || url.hostname })
    .select("id")
    .single();
  if (error) return { error: error.message };
  // Queue the first audit right away so the user lands on something happening.
  await supabase.from("audits").insert({ project_id: data.id });
  redirect(`/projects/${data.id}`);
}

const auditSchema = z.object({
  projectId: z.string().uuid(),
  maxPages: z.coerce.number().int().min(1).max(5000),
});

export async function startAudit(form: FormData) {
  const parsed = auditSchema.parse({ projectId: form.get("projectId"), maxPages: form.get("maxPages") ?? 500 });
  const { supabase } = await requireUser();
  const { data, error } = await supabase
    .from("audits")
    .insert({ project_id: parsed.projectId, max_pages: parsed.maxPages })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  revalidatePath(`/projects/${parsed.projectId}`);
  redirect(`/audits/${data.id}`);
}
