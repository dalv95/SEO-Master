import robotsParser from "robots-parser";
import { fetchResource, USER_AGENT } from "./fetch";

export interface Robots {
  found: boolean;
  isAllowed(url: string): boolean;
  crawlDelayMs: number | undefined;
  sitemaps: string[];
}

export async function loadRobots(origin: string): Promise<Robots> {
  const robotsUrl = new URL("/robots.txt", origin).toString();
  const res = await fetchResource(robotsUrl);
  const found = res.status >= 200 && res.status < 300;
  const robots = robotsParser(robotsUrl, found ? res.body : "");
  const delay = robots.getCrawlDelay(USER_AGENT);
  return {
    found,
    isAllowed: (url) => robots.isAllowed(url, USER_AGENT) !== false,
    crawlDelayMs: delay === undefined ? undefined : delay * 1000,
    sitemaps: robots.getSitemaps(),
  };
}
