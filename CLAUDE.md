# CLAUDE.md

Guidance for Claude Code when working in this repository.

## Product
SEO Master ("AutoSEO") — a web app that crawls a website / web app, audits it for SEO problems, scores it and gives prioritized recommendations.
- **Now (stages 1–3):** analysis only — crawl, audit rules, scoring, reports, AI summary, audit history, Google Search Console.
- **Later (stage 4):** applying fixes automatically. The delivery channel (GitHub PR / WordPress REST / JS snippet or edge worker) is **not decided yet** — do not build fix-application code until it is. Keep emitting structured `fixHint`s so that module can be added without changing the rules.

Full roadmap: `docs/PLAN.md`.

## Stack
- pnpm workspaces monorepo, TypeScript (strict) everywhere
- `apps/web` — Next.js 15 (App Router, server components + server actions), Tailwind CSS v4, Supabase Auth (magic link) via `@supabase/ssr`
- `apps/worker` — Node process (run with `tsx`) that claims queued rows from the `audits` table (`for update skip locked` — the table *is* the job queue), crawls, audits and writes results with `postgres`. Also has a DB-free CLI.
- `packages/crawler` — fetch with manual redirect tracking, robots.txt, sitemap.xml, link-first BFS then sitemap URLs. (Playwright rendering for JS sites: planned.)
- `packages/seo-rules` — audit rules + scoring
- `packages/shared` — shared types (`Issue`, `Severity`, `FixHint`, …) and zod schemas
- Supabase (Postgres + Auth + RLS); SQL migrations in `supabase/migrations/`. Project: `seo-master`, ref `bwaospsabqcpwddrrrhq` (eu-central-1, free plan) — apply new migrations there via the Supabase MCP `apply_migration`, then check `get_advisors`.
- PageSpeed Insights API for Core Web Vitals
- Claude API (`claude-sonnet-5-5`) for issue prioritization and plain-language recommendations
- Vitest for tests, ESLint + Prettier

Packages export TypeScript source directly (`main: src/index.ts`) — no build step; Next transpiles them via `transpilePackages`, the worker runs them with `tsx`.

## Commands
```bash
pnpm install
pnpm dev                                  # web (localhost:3000) + worker
pnpm audit:cli https://example.com --max 50 [--json out.json]   # audit without DB/UI
pnpm test                                 # vitest (crawler + seo-rules)
pnpm typecheck
pnpm --filter @seo-master/web build
```
Env: a single `.env.local` at the repo root (see `.env.example`), loaded by both the web app (`next.config.ts`) and the worker (`--env-file-if-exists`).

## Conventions
- **Audit rules are pure functions** defined with `pageRule` (per 200 HTML page), `anyPageRule` (every URL incl. errors) or `siteRule` from `packages/seo-rules/src/rule.ts`. No network or DB access inside a rule. Rules are grouped by category in `packages/seo-rules/src/rules/*.ts` and registered in `src/index.ts`. Test new rules in `test/rules.test.ts` using the `goodHtml`/`htmlPage`/`site` helpers (a clean site must keep producing zero issues and score 100).
- Rules that depend on seeing the whole site (e.g. orphan pages) must check `ctx.crawl.truncated`.
- `ctx.htmlPages` is deduplicated by final URL — a redirecting URL and its target are one document.
- Every `Issue` has a stable `ruleId` (kebab-case, e.g. `meta-title-missing`), a `category`, a `severity`, and a `fixHint` whenever the fix is mechanical.
- Shared types live only in `packages/shared` — do not redefine them in apps.
- Validate all external input (API routes, job payloads, crawled data boundaries) with zod.
- Database: schema changes only as new files in `supabase/migrations/`. RLS on every table; users can read their data and insert `queued` audits only — status/results are written by the worker, which connects directly via `DATABASE_URL` (bypasses RLS).
- DB row types for the web app live in `apps/web/lib/types.ts` (replace with generated Supabase types once a project is linked).
- Secrets only in `.env.local` (never commit). Update `.env.example` when adding a variable.
- Code, identifiers, comments and rule messages in English; UI copy is English for now, PL translation planned.
- UI design tokens (colors as CSS variables with dark mode) are in `apps/web/app/globals.css`; use the Tailwind names (`bg-panel`, `text-ink-soft`, `text-critical`, …) instead of raw colors.

## Crawler rules
- Always respect `robots.txt` and `Crawl-delay`; identify as `SEOMasterBot` User-Agent.
- Rate-limit per host (default max 2 concurrent requests); hard page limit per audit (default 500).
- Only crawl domains the user added to a project; stay on the same registrable domain.
- Store raw HTML only when needed for evidence; prefer extracted fields.
