import { exchangeCode, GoogleAuthError } from "@seo-master/google";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { googleConfig, OAUTH_COOKIE, saveGoogleConnection } from "@/lib/google";
import { requireUser } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { user } = await requireUser();
  const jar = await cookies();
  const saved = jar.get(OAUTH_COOKIE)?.value;
  jar.delete({ name: OAUTH_COOKIE, path: "/api/google" });

  let returnTo = "/";
  const back = (result: string) => {
    const url = new URL(returnTo, request.url);
    url.searchParams.set("google", result);
    return NextResponse.redirect(url);
  };

  try {
    const { state, returnTo: r } = JSON.parse(saved ?? "{}") as { state?: string; returnTo?: string };
    returnTo = r ?? "/";
    const params = request.nextUrl.searchParams;
    if (!state || params.get("state") !== state) return back("error");
    if (params.get("error")) return back(params.get("error") === "access_denied" ? "denied" : "error");
    const code = params.get("code");
    const cfg = googleConfig();
    if (!code || !cfg) return back("error");

    const { refreshToken, email } = await exchangeCode(cfg.client, code);
    await saveGoogleConnection(user.id, email, refreshToken);
    return back("connected");
  } catch (e) {
    console.error("google callback:", (e as Error).message);
    return back(e instanceof GoogleAuthError && e.code === "scope_missing" ? "scope" : "error");
  }
}
