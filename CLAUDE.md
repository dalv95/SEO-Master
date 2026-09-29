# CLAUDE.md

Guidance for Claude Code when working in this repository.

## Product
SEO Master ("AutoSEO") — a web app that crawls a website / web app, audits it for SEO problems, scores it and gives prioritized recommendations.
- **Now (stages 1–3):** analysis only — crawl, audit rules, scoring, reports, AI summary, audit history, Google Search Console.
- **Later (stage 4):** applying fixes automatically. The delivery channel (GitHub PR / WordPress REST / JS snippet or edge worker) is **not decided yet** — do not build fix-application code until it is. Keep emitting structured `fixHint`s so that module can be added without changing the rules.

Full roadmap: `docs/PLAN.md`.

## Stack
- pnpm workspaces monorepo, TypeScript (strict) everywhere
- `apps/web` — Next.js (App Router), Tailwind CSS + shadcn/ui, Supabase Auth
- `apps/worker` — Node process consuming crawl/audit jobs from pg-boss (Postgres-backed queue)
- `packages/crawler` — fetching (undici/fetch), robots.txt, sitemap.xml, URL frontier; Playwright for JS-rendered pages
- `packages/seo-rules` — audit rules
- `packages/shared` — shared types (`Issue`, `Severity`, `FixHint`, …) and zod schemas
- Supabase (Postgres + Auth + RLS); SQL migrations in `supabase/migrations/`
- PageSpeed Insights API for Core Web Vitals
- Claude API (`claude-sonnet-5-5`) for issue prioritization and plain-language recommendations
- Vitest for tests, ESLint + Prettier

## Commands
```bash
pnpm install
pnpm dev                        # run web + worker
pnpm --filter @seo-master/web dev
pnpm --filter @seo-master/worker dev
pnpm test                       # vitest in all packages
pnpm lint
pnpm typecheck
```

## Conventions
- **Audit rules are pure functions**: `(page: ParsedPage, ctx: SiteContext) => Issue[]`. No network or DB access inside a rule. One file per rule in `packages/seo-rules/src/rules/`, each with a Vitest test using HTML fixtures.
- Every `Issue` has a stable `ruleId` (kebab-case, e.g. `meta-title-missing`), a `category`, a `severity`, and a `fixHint` whenever the fix is mechanical.
- Shared types live only in `packages/shared` — do not redefine them in apps.
- Validate all external input (API routes, job payloads, crawled data boundaries) with zod.
- Database access for user data goes through Supabase with RLS enabled on every table; the service role key is used only in the worker.
- Secrets only in `.env.local` (never commit). Update `.env.example` when adding a variable.
- Code, identifiers and comments in English; UI copy should be translatable (PL/EN).

## Crawler rules
- Always respect `robots.txt` and `Crawl-delay`; identify as `SEOMasterBot` User-Agent.
- Rate-limit per host (default max 2 concurrent requests); hard page limit per audit (default 500).
- Only crawl domains the user added to a project; stay on the same registrable domain.
- Store raw HTML only when needed for evidence; prefer extracted fields.
