const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";

export const GSC_SCOPES = ["openid", "email", "https://www.googleapis.com/auth/webmasters.readonly"];

export interface OAuthClient {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export class GoogleAuthError extends Error {
  constructor(
    message: string,
    /** Google's error code, e.g. "invalid_grant" when the user revoked access. */
    readonly code?: string,
  ) {
    super(message);
  }
}

/** Consent URL. `prompt=consent` makes Google return a refresh token even on repeat connects. */
export function buildAuthUrl(client: OAuthClient, state: string): string {
  const u = new URL(AUTH_URL);
  u.search = new URLSearchParams({
    client_id: client.clientId,
    redirect_uri: client.redirectUri,
    response_type: "code",
    scope: GSC_SCOPES.join(" "),
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    state,
  }).toString();
  return u.toString();
}

interface TokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  scope: string;
  id_token?: string;
  error?: string;
  error_description?: string;
}

async function tokenRequest(params: Record<string, string>): Promise<TokenResponse> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(params),
  });
  const json = (await res.json()) as TokenResponse;
  if (!res.ok || json.error) throw new GoogleAuthError(json.error_description ?? json.error ?? `HTTP ${res.status}`, json.error);
  return json;
}

/** Email from the ID token. It comes straight from Google's token endpoint over TLS, so the signature isn't re-verified. */
function emailFromIdToken(idToken: string | undefined): string | null {
  const payload = idToken?.split(".")[1];
  if (!payload) return null;
  try {
    return (JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { email?: string }).email ?? null;
  } catch {
    return null;
  }
}

export async function exchangeCode(client: OAuthClient, code: string) {
  const t = await tokenRequest({
    code,
    client_id: client.clientId,
    client_secret: client.clientSecret,
    redirect_uri: client.redirectUri,
    grant_type: "authorization_code",
  });
  if (!t.refresh_token) throw new GoogleAuthError("Google did not return a refresh token");
  if (!t.scope.split(" ").includes("https://www.googleapis.com/auth/webmasters.readonly"))
    throw new GoogleAuthError("Search Console access was not granted", "scope_missing");
  return { refreshToken: t.refresh_token, accessToken: t.access_token, email: emailFromIdToken(t.id_token) };
}

export async function refreshAccessToken(client: Omit<OAuthClient, "redirectUri">, refreshToken: string) {
  const t = await tokenRequest({
    refresh_token: refreshToken,
    client_id: client.clientId,
    client_secret: client.clientSecret,
    grant_type: "refresh_token",
  });
  return t.access_token;
}
