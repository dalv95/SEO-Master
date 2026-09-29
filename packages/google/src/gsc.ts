const API = "https://www.googleapis.com/webmasters/v3";
/** Maximum rows per Search Analytics request. */
export const PAGE_SIZE = 25_000;

export interface GscSite {
  siteUrl: string;
  permissionLevel: string;
}

export interface GscRow {
  keys: string[];
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export class GscApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

type Fetch = typeof fetch;

async function call<T>(accessToken: string, path: string, init: RequestInit = {}, fetchImpl: Fetch = fetch): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    const res = await fetchImpl(`${API}${path}`, {
      ...init,
      headers: { authorization: `Bearer ${accessToken}`, "content-type": "application/json", ...init.headers },
      signal: AbortSignal.timeout(60_000),
    });
    if (res.ok) return (await res.json()) as T;
    // Quota / transient errors: back off and retry a few times.
    if ((res.status === 429 || res.status >= 500) && attempt < 3) {
      await new Promise((r) => setTimeout(r, 1000 * 2 ** attempt));
      continue;
    }
    const body = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
    throw new GscApiError(body.error?.message ?? `HTTP ${res.status}`, res.status);
  }
}

/** Properties the connected Google account can read (unverified ones excluded). */
export async function listSites(accessToken: string, fetchImpl?: Fetch): Promise<GscSite[]> {
  const r = await call<{ siteEntry?: GscSite[] }>(accessToken, "/sites", {}, fetchImpl);
  return (r.siteEntry ?? []).filter((s) => s.permissionLevel !== "siteUnverifiedUser");
}

export interface QueryOptions {
  startDate: string;
  endDate: string;
  dimensions: ("date" | "query" | "page" | "country" | "device")[];
  /** Safety cap for very large properties. */
  maxRows?: number;
}

/** Search Analytics query with paging. Includes fresh (not yet final) data. */
export async function querySearchAnalytics(
  accessToken: string,
  siteUrl: string,
  opts: QueryOptions,
  fetchImpl?: Fetch,
): Promise<GscRow[]> {
  const rows: GscRow[] = [];
  const max = opts.maxRows ?? 200_000;
  for (let startRow = 0; rows.length < max; startRow += PAGE_SIZE) {
    const r = await call<{ rows?: GscRow[] }>(
      accessToken,
      `/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`,
      {
        method: "POST",
        body: JSON.stringify({
          startDate: opts.startDate,
          endDate: opts.endDate,
          dimensions: opts.dimensions,
          type: "web",
          dataState: "all",
          rowLimit: PAGE_SIZE,
          startRow,
        }),
      },
      fetchImpl,
    );
    const page = r.rows ?? [];
    rows.push(...page);
    if (page.length < PAGE_SIZE) break;
  }
  return rows.slice(0, max);
}

const hostOf = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return url.replace(/^sc-domain:/, "").toLowerCase();
  }
};

/**
 * Best property for a site URL: the longest URL-prefix property that contains it; else a
 * prefix property on the same host (e.g. http/https or www variants), shortest first;
 * else a domain property (sc-domain:) for the same or a parent domain.
 */
export function matchProperty(sites: GscSite[], siteUrl: string): string | null {
  const url = siteUrl.toLowerCase();
  const host = hostOf(siteUrl);
  const prefixes = sites.filter((s) => !s.siteUrl.startsWith("sc-domain:"));
  const containing = prefixes
    .filter((s) => url.startsWith(s.siteUrl.toLowerCase()))
    .sort((a, b) => b.siteUrl.length - a.siteUrl.length)[0];
  if (containing) return containing.siteUrl;
  const sameHost = prefixes
    .filter((s) => hostOf(s.siteUrl) === host)
    .sort((a, b) => a.siteUrl.length - b.siteUrl.length)[0];
  if (sameHost) return sameHost.siteUrl;
  const domain = sites
    .filter((s) => s.siteUrl.startsWith("sc-domain:"))
    .find((s) => {
      const d = s.siteUrl.slice("sc-domain:".length).toLowerCase();
      return host === d || host.endsWith(`.${d}`);
    });
  return domain?.siteUrl ?? null;
}
