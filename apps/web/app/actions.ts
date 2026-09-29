"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getT, LOCALE_COOKIE } from "@/lib/i18n";
import { createClient, requireUser } from "@/lib/supabase/server";

export async function setLocale(form: FormData) {
  const locale = form.get("locale") === "en" ? "en" : "pl";
  (await cookies()).set(LOCALE_COOKIE, locale, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  revalidatePath("/", "layout");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export type FormState = { error?: string; info?: string } | undefined;

const siteUrl = () => process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

async function parseCredentials(form: FormData) {
  const { t } = await getT();
  const parsed = z
    .object({
      email: z.string().trim().email(t.errors.invalidEmail),
      password: z.string().min(8, t.errors.passwordTooShort),
    })
    .safeParse({ email: form.get("email"), password: form.get("password") });
  return { t, parsed };
}

export async function signInWithPassword(_: FormState, form: FormData): Promise<FormState> {
  const { t, parsed } = await parseCredentials(form);
  if (!parsed.success) return { error: parsed.error.issues[0]!.message };
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    if (error.code === "email_not_confirmed") return { error: t.errors.emailNotConfirmed };
    if (error.code === "invalid_credentials") return { error: t.errors.wrongCredentials };
    return { error: error.message };
  }
  redirect("/");
}

export async function signUp(_: FormState, form: FormData): Promise<FormState> {
  const { t, parsed } = await parseCredentials(form);
  if (!parsed.success) return { error: parsed.error.issues[0]!.message };
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    ...parsed.data,
    options: { emailRedirectTo: `${siteUrl()}/auth/confirm` },
  });
  if (error) return { error: error.code === "weak_password" ? t.errors.weakPassword : error.message };
  // With "Confirm email" disabled in Supabase the user is signed in straight away.
  if (data.session) redirect("/");
  return { info: t.errors.accountCreated };
}

export async function signInWithGoogle() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${siteUrl()}/auth/callback` },
  });
  if (error || !data.url) redirect("/login?error=google");
  redirect(data.url);
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
  if (!parsed.success) return { error: (await getT()).t.errors.invalidSite };
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
