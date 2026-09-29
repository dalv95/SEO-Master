"use client";

import { useEffect, useId, useRef, useState } from "react";

export interface TrendPoint {
  /** ISO date (day, or first day of the week for weekly series). */
  date: string;
  value: number;
  /** Server-formatted labels: Node and the browser ship different ICU data, so formatting
   *  dates on both sides would cause hydration mismatches. */
  label: string;
  tick: string;
}

/** Deterministic grouping (same output on server and client, unlike Intl across ICU versions). */
function groupDigits(v: number, sep: string): string {
  return Math.round(v)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, sep);
}

function compact(v: number, sep: string, decimal: string): string {
  const fmt = (n: number, unit: string) => `${(Math.round(n * 10) / 10).toString().replace(".", decimal)}${unit}`;
  if (v >= 1e6) return fmt(v / 1e6, "M");
  if (v >= 1e4) return fmt(v / 1e3, "k");
  return groupDigits(v, sep);
}

const H = 200;
const PAD = { top: 12, right: 12, bottom: 26, left: 48 };

/** 1-2-5 "nice" axis maximum and ticks. */
function niceTicks(max: number, count = 4): number[] {
  if (max <= 0) return [0, 1];
  const raw = max / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 5, 10].map((m) => m * mag).find((s) => s >= raw)!;
  return Array.from({ length: Math.ceil(max / step) + 1 }, (_, i) => i * step);
}

/**
 * Single-series line chart (one measure → no legend; the title names it) with a crosshair
 * tooltip, keyboard stepping and a data table fallback.
 */
export function TrendChart({
  points,
  title,
  subtitle,
  separators,
  weekly,
  tableLabel,
  dateLabel,
}: {
  points: TrendPoint[];
  title: string;
  subtitle: string;
  /** [thousands, decimal], e.g. [" ", ","] for Polish. */
  separators: [string, string];
  weekly: boolean;
  tableLabel: string;
  dateLabel: string;
}) {
  const [active, setActive] = useState<number | null>(null);
  const gradientId = useId();
  // Draw at the real pixel width so axis text stays 11px on phones instead of scaling down.
  const box = useRef<HTMLDivElement>(null);
  const [W, setW] = useState(640);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => e && setW(Math.max(260, Math.round(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const [sep, decimal] = separators;
  const num = (v: number) => groupDigits(v, sep);

  const ticks = niceTicks(Math.max(...points.map((p) => p.value), 0));
  const yMax = ticks.at(-1)!;
  const iw = W - PAD.left - PAD.right;
  const ih = H - PAD.top - PAD.bottom;
  const x = (i: number) => PAD.left + (points.length <= 1 ? iw / 2 : (i * iw) / (points.length - 1));
  const y = (v: number) => PAD.top + ih - (v / yMax) * ih;

  const line = points.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join("");
  const area = points.length ? `${line}L${x(points.length - 1)},${y(0)}L${x(0)},${y(0)}Z` : "";
  const xTicks = (W < 420 ? [0, 0.5, 1] : [0, 0.25, 0.5, 0.75, 1]).map((f) => Math.round(f * (points.length - 1))).filter((v, i, a) => a.indexOf(v) === i);

  const pick = (clientX: number, rect: DOMRect) => {
    const svgX = ((clientX - rect.left) / rect.width) * W;
    const i = Math.round(((svgX - PAD.left) / iw) * (points.length - 1));
    setActive(Math.min(points.length - 1, Math.max(0, i)));
  };
  const a = active === null ? null : points[active];

  return (
    <figure className="min-w-0">
      <figcaption className="flex items-baseline justify-between gap-2">
        <span className="font-semibold">{title}</span>
        <span className="text-xs text-ink-soft">{subtitle}</span>
      </figcaption>
      <div ref={box} className="relative mt-2">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="h-auto w-full touch-none outline-none focus-visible:ring-2 focus-visible:ring-signal"
          role="img"
          aria-label={`${title}, ${subtitle}`}
          tabIndex={0}
          onPointerMove={(e) => pick(e.clientX, e.currentTarget.getBoundingClientRect())}
          onPointerLeave={() => setActive(null)}
          onKeyDown={(e) => {
            if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
              e.preventDefault();
              const d = e.key === "ArrowRight" ? 1 : -1;
              setActive((i) => Math.min(points.length - 1, Math.max(0, (i ?? (d > 0 ? -1 : points.length)) + d)));
            }
          }}
          onBlur={() => setActive(null)}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor="var(--chart)" stopOpacity="0.14" />
              <stop offset="1" stopColor="var(--chart)" stopOpacity="0.02" />
            </linearGradient>
          </defs>
          {ticks.map((v) => (
            <g key={v}>
              <line x1={PAD.left} x2={W - PAD.right} y1={y(v)} y2={y(v)} stroke="var(--rule)" strokeWidth="1" />
              <text x={PAD.left - 8} y={y(v)} textAnchor="end" dominantBaseline="middle" className="fill-ink-soft text-[11px] tabular-nums">
                {compact(v, sep, decimal)}
              </text>
            </g>
          ))}
          {xTicks.map((i) => (
            <text key={i} x={x(i)} y={H - 6} textAnchor={i === 0 ? "start" : i === points.length - 1 ? "end" : "middle"} className="fill-ink-soft text-[11px]">
              {points[i]!.tick}
            </text>
          ))}
          <path d={area} fill={`url(#${gradientId})`} />
          <path d={line} fill="none" stroke="var(--chart)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
          {a && active !== null && (
            <g pointerEvents="none">
              <line x1={x(active)} x2={x(active)} y1={PAD.top} y2={y(0)} stroke="var(--ink-soft)" strokeWidth="1" />
              <circle cx={x(active)} cy={y(a.value)} r="5" fill="var(--chart)" stroke="var(--panel)" strokeWidth="2" />
            </g>
          )}
        </svg>
        {a && active !== null && (
          <div
            role="status"
            className="pointer-events-none absolute top-0 -translate-x-1/2 rounded-md border border-rule bg-panel px-2.5 py-1.5 text-xs shadow-sm"
            style={{ left: `${Math.min(88, Math.max(12, (x(active) / W) * 100))}%` }}
          >
            <span className="text-ink-soft">
              {weekly ? "≥ " : ""}
              {a.label}
            </span>{" "}
            <span className="font-semibold tabular-nums">{num(a.value)}</span>
          </div>
        )}
      </div>
      <details className="mt-1 text-xs">
        <summary className="cursor-pointer text-ink-soft hover:text-ink">{tableLabel}</summary>
        <div className="mt-2 max-h-48 overflow-y-auto">
          <table className="w-full">
            <thead className="text-left text-ink-soft">
              <tr>
                <th className="py-1 font-medium">{dateLabel}</th>
                <th className="py-1 text-right font-medium">{title}</th>
              </tr>
            </thead>
            <tbody>
              {points.map((p) => (
                <tr key={p.date} className="border-t border-rule">
                  <td className="py-1">{p.label}</td>
                  <td className="py-1 text-right tabular-nums">{num(p.value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  );
}
