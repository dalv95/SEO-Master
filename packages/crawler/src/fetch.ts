import type { RedirectHop } from "@seo-master/shared";

export const USER_AGENT = "Mozilla/5.0 (compatible; SEOMasterBot/0.1; +https://github.com/seo-master)";
const MAX_REDIRECTS = 10;
const MAX_BODY_BYTES = 5 * 1024 * 1024;

export interface FetchedResource {
  url: string;
  finalUrl: string;
  status: number;
  redirectChain: RedirectHop[];
  headers: Headers;
  body: string;
  bytes: number;
  responseTimeMs: number;
  error?: string;
}

/** GET that follows redirects manually so the full chain is recorded. Never throws. */
export async function fetchResource(url: string, timeoutMs = 15_000): Promise<FetchedResource> {
  const started = performance.now();
  const redirectChain: RedirectHop[] = [];
  let current = url;
  try {
    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      const res = await fetch(current, {
        redirect: "manual",
        headers: { "user-agent": USER_AGENT, accept: "text/html,application/xhtml+xml,*/*;q=0.8" },
        signal: AbortSignal.timeout(timeoutMs),
      });
      const location = res.headers.get("location");
      if (res.status >= 300 && res.status < 400 && location) {
        redirectChain.push({ url: current, status: res.status });
        await res.body?.cancel();
        current = new URL(location, current).toString();
        continue;
      }
      const buf = await readLimited(res);
      return {
        url,
        finalUrl: current,
        status: res.status,
        redirectChain,
        headers: res.headers,
        body: buf,
        bytes: Buffer.byteLength(buf),
        responseTimeMs: Math.round(performance.now() - started),
      };
    }
    throw new Error(`Too many redirects (>${MAX_REDIRECTS})`);
  } catch (e) {
    return {
      url,
      finalUrl: current,
      status: 0,
      redirectChain,
      headers: new Headers(),
      body: "",
      bytes: 0,
      responseTimeMs: Math.round(performance.now() - started),
      error: (e as Error).message,
    };
  }
}

async function readLimited(res: Response): Promise<string> {
  if (!res.body) return "";
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_BODY_BYTES) {
      await reader.cancel();
      break;
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks).toString("utf8");
}
