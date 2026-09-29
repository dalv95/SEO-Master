import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL("/", request.url));
    // Most often "code verifier not found": the link was opened in another browser. /auth/confirm avoids this.
    console.error("auth/callback: exchangeCodeForSession failed:", error.message);
  }
  return NextResponse.redirect(new URL("/login?error=link", request.url));
}
