import { describe, expect, it } from "vitest";
import { gsc } from "../src";

const qp = (query: string, page: string, clicks: number, impressions: number, position: number) => ({
  query,
  page,
  clicks,
  impressions,
  position,
});

describe("strikingDistance", () => {
  const rows = [
    qp("węzły betoniarskie", "/produkty/wezly", 12, 900, 6.2),
    qp("węzły betoniarskie", "/", 1, 100, 14),
    qp("mieszalnik do betonu", "/produkty/mieszalniki", 30, 300, 2.1), // already top 3
    qp("konstrukcje stalowe kraków", "/uslugi/konstrukcje", 0, 15, 9), // too few impressions
    qp("linie wetcast", "/produkty/wetcast", 2, 400, 25), // beyond page 2
    qp("automatyka przemysłowa", "/uslugi/automatyka", 3, 250, 11),
  ];

  it("keeps queries ranking 4–20 with demand, sorted by estimated gain", () => {
    const r = gsc.strikingDistance(rows);
    expect(r.map((o) => o.query)).toEqual(["węzły betoniarskie", "automatyka przemysłowa"]);
    expect(r[0]).toMatchObject({ impressions: 1000, clicks: 13, topPage: "/produkty/wezly", pages: 2 });
    expect(r[0]!.position).toBeCloseTo((6.2 * 900 + 14 * 100) / 1000);
    expect(r[0]!.potentialClicks).toBe(Math.round(1000 * 0.11 - 13));
  });
});

describe("decliningPages", () => {
  it("finds pages that lost ≥ 30% of clicks, biggest loss first, including vanished pages", () => {
    const prev = [
      { page: "/a", clicks: 100, impressions: 1000, position: 3 },
      { page: "/b", clicks: 40, impressions: 500, position: 5 },
      { page: "/c", clicks: 50, impressions: 600, position: 4 },
      { page: "/tiny", clicks: 5, impressions: 50, position: 9 },
    ];
    const cur = [
      { page: "/a", clicks: 60, impressions: 900, position: 4.5 },
      { page: "/c", clicks: 45, impressions: 600, position: 4 },
    ];
    const r = gsc.decliningPages(cur, prev);
    expect(r.map((p) => [p.page, p.clicks, Math.round(p.change * 100)])).toEqual([
      ["/a", 60, -40],
      ["/b", 0, -100],
    ]);
    expect(r[1]!.position).toBeNull();
  });
});

describe("cannibalization", () => {
  it("flags queries where several pages split impressions and none ranks top 3", () => {
    const rows = [
      qp("węzeł betoniarski cena", "/produkty/wezly", 2, 120, 8),
      qp("węzeł betoniarski cena", "/blog/ceny-wezlow", 1, 90, 11),
      qp("węzeł betoniarski cena", "/", 0, 5, 30), // < 10% share, ignored
      qp("mieszalnik", "/a", 10, 100, 2), // a page wins clearly
      qp("mieszalnik", "/b", 0, 60, 9),
      qp("rzadkie", "/x", 0, 8, 12),
      qp("rzadkie", "/y", 0, 7, 14), // too few impressions
    ];
    const r = gsc.cannibalization(rows);
    expect(r).toHaveLength(1);
    expect(r[0]!.query).toBe("węzeł betoniarski cena");
    expect(r[0]!.pages.map((p) => p.page)).toEqual(["/produkty/wezly", "/blog/ceny-wezlow"]);
  });
});

describe("totals", () => {
  it("sums a date range with impression-weighted position", () => {
    const daily = [
      { date: "2026-09-01", clicks: 10, impressions: 100, position: 5 },
      { date: "2026-09-02", clicks: 20, impressions: 300, position: 9 },
      { date: "2026-09-03", clicks: 99, impressions: 999, position: 1 },
    ];
    const t = gsc.totals(daily, "2026-09-01", "2026-09-02");
    expect(t).toMatchObject({ clicks: 30, impressions: 400, days: 2 });
    expect(t.ctr).toBeCloseTo(0.075);
    expect(t.position).toBeCloseTo((5 * 100 + 9 * 300) / 400);
  });
});
