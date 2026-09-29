import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Target of the signup confirmation email link (template uses `token_hash`).
 * Unlike the PKCE `code` flow, this works when the link is opened in a different
 * browser or device than the one that requested it.
 */
export async function GET(request: NextRequest) {
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type") as EmailOtpType | null;
  if (tokenHash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) return NextResponse.redirect(new URL("/", request.url));
    console.error("auth/confirm: verifyOtp failed:", error.message);
  }
  return NextResponse.redirect(new URL("/login?error=link", request.url));
}
