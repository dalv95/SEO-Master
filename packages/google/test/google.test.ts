import { randomBytes } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { buildAuthUrl, decryptSecret, encryptSecret, matchProperty, PAGE_SIZE, querySearchAnalytics } from "../src";

describe("encryptSecret", () => {
  const key = randomBytes(32).toString("base64");

  it("round-trips and uses a fresh IV each time", () => {
    const a = encryptSecret("1//refresh-token", key);
    const b = encryptSecret("1//refresh-token", key);
    expect(a).not.toBe(b);
    expect(decryptSecret(a, key)).toBe("1//refresh-token");
  });

  it("rejects tampering and wrong keys", () => {
    const enc = encryptSecret("secret", key);
    const parts = enc.split(".");
    parts[3] = Buffer.from("tampered").toString("base64url");
    expect(() => decryptSecret(parts.join("."), key)).toThrow();
    expect(() => decryptSecret(enc, randomBytes(32).toString("base64"))).toThrow();
    expect(() => encryptSecret("x", "short")).toThrow("32 bytes");
  });
});

describe("buildAuthUrl", () => {
  it("asks for offline Search Console read access", () => {
    const u = new URL(buildAuthUrl({ clientId: "id", clientSecret: "s", redirectUri: "http://localhost:3000/cb" }, "st"));
    expect(u.searchParams.get("access_type")).toBe("offline");
    expect(u.searchParams.get("prompt")).toBe("consent");
    expect(u.searchParams.get("scope")).toContain("webmasters.readonly");
    expect(u.searchParams.get("state")).toBe("st");
    expect(u.searchParams.has("client_secret")).toBe(false);
  });
});

describe("matchProperty", () => {
  const sites = [
    { siteUrl: "sc-domain:goup24.com.pl", permissionLevel: "siteOwner" },
    { siteUrl: "https://shop.example.com/", permissionLevel: "siteFullUser" },
    { siteUrl: "https://shop.example.com/pl/", permissionLevel: "siteFullUser" },
    { siteUrl: "sc-domain:example.com", permissionLevel: "siteOwner" },
  ];
  it.each([
    ["https://goup24.com.pl/", "sc-domain:goup24.com.pl"],
    ["https://www.goup24.com.pl/", "sc-domain:goup24.com.pl"],
    ["https://shop.example.com/pl/", "https://shop.example.com/pl/"],
    ["https://shop.example.com/", "https://shop.example.com/"],
    ["https://blog.example.com/", "sc-domain:example.com"],
    ["http://shop.example.com/", "https://shop.example.com/"],
    ["https://other.pl/", null],
  ])("%s → %s", (url, expected) => {
    expect(matchProperty(sites, url)).toBe(expected);
  });
});

describe("querySearchAnalytics", () => {
  const row = (i: number) => ({ keys: [`q${i}`], clicks: 1, impressions: 2, ctr: 0.5, position: 3 });
  const reply = (rows: unknown[]) => new Response(JSON.stringify({ rows }), { status: 200 });

  it("pages until a short page and encodes the property in the path", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(reply(Array.from({ length: PAGE_SIZE }, (_, i) => row(i))))
      .mockResolvedValueOnce(reply([row(1), row(2)]));
    const rows = await querySearchAnalytics(
      "tok",
      "sc-domain:goup24.com.pl",
      { startDate: "2026-01-01", endDate: "2026-01-31", dimensions: ["query"] },
      fetchImpl,
    );
    expect(rows).toHaveLength(PAGE_SIZE + 2);
    expect(fetchImpl.mock.calls[0]![0]).toContain("/sites/sc-domain%3Agoup24.com.pl/searchAnalytics/query");
    expect(JSON.parse(fetchImpl.mock.calls[1]![1].body).startRow).toBe(PAGE_SIZE);
    expect(fetchImpl.mock.calls[0]![1].headers.authorization).toBe("Bearer tok");
  });

  it("retries on 429 and surfaces other errors", async () => {
    vi.useFakeTimers();
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(new Response("{}", { status: 429 }))
      .mockResolvedValueOnce(reply([row(1)]));
    const p = querySearchAnalytics("tok", "https://a.pl/", { startDate: "a", endDate: "b", dimensions: ["date"] }, fetchImpl);
    await vi.runAllTimersAsync();
    expect(await p).toHaveLength(1);
    vi.useRealTimers();

    const denied = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: { message: "User does not have sufficient permission" } }), { status: 403 }),
    );
    await expect(
      querySearchAnalytics("tok", "https://a.pl/", { startDate: "a", endDate: "b", dimensions: ["date"] }, denied),
    ).rejects.toThrow("sufficient permission");
  });
});
