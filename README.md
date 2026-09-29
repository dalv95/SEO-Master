# SEO Master (AutoSEO)

Web app that crawls websites and web apps, audits them for SEO issues and shows what to fix first — and, in a later stage, applies fixes automatically.

See [docs/PLAN.md](docs/PLAN.md) for the roadmap and [CLAUDE.md](CLAUDE.md) for development conventions.

## Quick audit (no database needed)

```bash
pnpm install
pnpm audit:cli https://example.com --max 50
```

## Full app

1. Create a Supabase project and run `supabase/migrations/*.sql` (SQL editor or `supabase db push`).
2. In Supabase → Authentication → URL Configuration, add `http://localhost:3000/auth/callback` as a redirect URL.
3. `cp .env.example .env.local` and fill in the Supabase URL, anon key and `DATABASE_URL`.
4. `pnpm dev` — web app on http://localhost:3000 plus the crawler worker.

## Layout

| Path | What |
| --- | --- |
| `apps/web` | Next.js dashboard and reports |
| `apps/worker` | Crawl/audit worker + CLI |
| `packages/crawler` | Fetching, robots.txt, sitemap, HTML parsing |
| `packages/seo-rules` | Audit rules and scoring |
| `packages/shared` | Shared types |
| `supabase/migrations` | Database schema |
