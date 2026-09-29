import type { Browser, BrowserContext } from "playwright";
import { USER_AGENT } from "./fetch";

const NAV_TIMEOUT_MS = 20_000;
/** After DOMContentLoaded, wait at most this long for the network to go quiet (SPA data fetching). */
const SETTLE_TIMEOUT_MS = 5_000;
const BLOCKED_RESOURCES = new Set(["image", "media", "font"]);

export interface Renderer {
  render(url: string): Promise<string>;
  close(): Promise<void>;
}

/**
 * Headless Chromium for JavaScript-rendered sites. Tries Playwright's bundled Chromium first
 * (servers / CI), then the locally installed Google Chrome (e.g. macOS versions the bundled
 * build no longer supports), or CHROME_PATH if set.
 */
export async function launchRenderer(): Promise<Renderer> {
  const { chromium } = await import("playwright");
  const attempts = [
    ...(process.env.CHROME_PATH ? [{ executablePath: process.env.CHROME_PATH }] : []),
    {},
    { channel: "chrome" },
  ];
  let browser: Browser | undefined;
  const errors: string[] = [];
  for (const opts of attempts) {
    try {
      browser = await chromium.launch({ headless: true, ...opts });
      break;
    } catch (e) {
      errors.push((e as Error).message.split("\n")[0]!);
    }
  }
  if (!browser) throw new Error(`No Chromium available for JavaScript rendering: ${errors.join(" | ")}`);

  const context: BrowserContext = await browser.newContext({ userAgent: USER_AGENT, viewport: { width: 1280, height: 900 } });
  await context.route("**/*", (route) =>
    BLOCKED_RESOURCES.has(route.request().resourceType()) ? route.abort() : route.continue(),
  );

  return {
    async render(url) {
      const page = await context.newPage();
      try {
        await page.goto(url, { waitUntil: "domcontentloaded", timeout: NAV_TIMEOUT_MS });
        await page.waitForLoadState("networkidle", { timeout: SETTLE_TIMEOUT_MS }).catch(() => {});
        return await page.content();
      } finally {
        await page.close();
      }
    },
    async close() {
      await browser.close();
    },
  };
}
