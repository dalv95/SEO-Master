import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** OAuth (Google) redirect target: exchanges the PKCE code for a session. */
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL("/", request.url));
    console.error("auth/callback: exchangeCodeForSession failed:", error.message);
  }
  return NextResponse.redirect(new URL("/login?error=google", request.url));
}
