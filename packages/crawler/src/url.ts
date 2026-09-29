/** Resolve `href` against `base`, drop the fragment, keep only http(s). Returns null for anything else. */
export function normalizeUrl(href: string, base?: string): string | null {
  try {
    const u = new URL(href.trim(), base);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    u.hash = "";
    return u.toString();
  } catch {
    return null;
  }
}

const stripWww = (host: string) => host.replace(/^www\./i, "").toLowerCase();

/** Same site = same hostname, ignoring a leading "www.". */
export function isSameSite(a: string, b: string): boolean {
  try {
    return stripWww(new URL(a).hostname) === stripWww(new URL(b).hostname);
  } catch {
    return false;
  }
}
