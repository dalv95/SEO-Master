"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { linkProperty, listUserSites } from "@/lib/google";
import { requireUser } from "@/lib/supabase/server";

const projectId = z.string().uuid();

export async function linkGscProperty(form: FormData) {
  const id = projectId.parse(form.get("projectId"));
  const property = z.string().min(1).parse(form.get("property"));
  const { user } = await requireUser();
  // Only properties the connected Google account can actually read.
  const sites = await listUserSites(user.id);
  if (!sites.some((s) => s.siteUrl === property)) throw new Error("Property not available for this Google account");
  await linkProperty(id, user.id, property);
  revalidatePath(`/projects/${id}`, "layout");
}

export async function unlinkGscProperty(form: FormData) {
  const id = projectId.parse(form.get("projectId"));
  const { user } = await requireUser();
  await linkProperty(id, user.id, null);
  revalidatePath(`/projects/${id}`, "layout");
}

export async function resyncGsc(form: FormData) {
  const id = projectId.parse(form.get("projectId"));
  const { supabase } = await requireUser();
  // The worker picks up projects with gsc_synced_at = null within a minute.
  await supabase.from("projects").update({ gsc_synced_at: null, gsc_sync_error: null }).eq("id", id);
  revalidatePath(`/projects/${id}`, "layout");
}

export async function disconnectGoogle(form: FormData) {
  const id = projectId.parse(form.get("projectId"));
  const { supabase, user } = await requireUser();
  await supabase.from("google_connections").delete().eq("user_id", user.id);
  revalidatePath(`/projects/${id}`, "layout");
}
