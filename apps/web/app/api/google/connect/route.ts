import { randomBytes } from "node:crypto";
import { buildAuthUrl } from "@seo-master/google";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { googleConfig, OAUTH_COOKIE } from "@/lib/google";
import { requireUser } from "@/lib/supabase/server";

/** Starts the Google consent flow for Search Console access. */
export async function GET(request: NextRequest) {
  await requireUser();
  const cfg = googleConfig();
  if (!cfg) return new NextResponse("Google Search Console is not configured", { status: 503 });

  // Only same-site paths, so the callback can't be used as an open redirect.
  const returnTo = request.nextUrl.searchParams.get("returnTo") ?? "/";
  const safeReturn = returnTo.startsWith("/") && !returnTo.startsWith("//") ? returnTo : "/";
  const state = randomBytes(24).toString("base64url");
  (await cookies()).set(OAUTH_COOKIE, JSON.stringify({ state, returnTo: safeReturn }), {
    httpOnly: true,
    sameSite: "lax",
    secure: request.nextUrl.protocol === "https:",
    path: "/api/google",
    maxAge: 600,
  });
  return NextResponse.redirect(buildAuthUrl(cfg.client, state));
}
