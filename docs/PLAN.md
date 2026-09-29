# SEO Master — plan aplikacji AutoSEO (etap 1: analiza)

## Kontekst
Chcesz zbudować aplikację webową „AutoSEO”: docelowo narzędzie, które nie tylko analizuje stronę/aplikację webową, ale też wprowadza poprawki SEO. Sposób wdrażania poprawek (PR do Git / WordPress / snippet JS) nie jest jeszcze ustalony, więc **etap 1 to tylko analiza** — z architekturą przygotowaną na późniejszy moduł „fixów”. Folder `/Users/dalv95/Desktop/SEO Master` jest pusty, nie jest repozytorium git.

W tej sesji: dokumentacja planu + `CLAUDE.md` + szkielet projektu + repozytorium GitHub. Implementacja funkcji — w kolejnych krokach.

## Stack (wybrany)
- **Next.js 15 (App Router) + TypeScript** — UI + API routes, jeden język w całym projekcie
- **Tailwind CSS + shadcn/ui** — dashboard, raporty
- **Supabase** (Postgres + Auth + RLS) — projekty, audyty, wyniki; Supabase MCP jest już podłączony
- **Worker crawlera**: osobny proces Node (`apps/worker`) z kolejką **pg-boss** (kolejka w Postgresie — bez dodatkowego Redisa), **undici/fetch + cheerio** do parsowania HTML, **Playwright** dla stron renderowanych JS
- **Lighthouse / PageSpeed Insights API** — Core Web Vitals
- **Claude API (`claude-sonnet-5-5`)** — priorytetyzacja problemów i rekomendacje w języku naturalnym (później: generowanie poprawek)
- **pnpm workspaces** (monorepo), **Vitest** (testy), **ESLint + Prettier**

## Struktura repo
```
seo-master/
├─ apps/
│  ├─ web/            # Next.js – dashboard, raporty, auth
│  └─ worker/         # crawler + audyt (pg-boss consumer)
├─ packages/
│  ├─ seo-rules/      # czyste funkcje: reguły audytu (input: strona → output: Issue[])
│  ├─ crawler/        # pobieranie, robots.txt, sitemap, kolejka URL
│  └─ shared/         # typy (Issue, Severity, AuditResult), schemat zod
├─ supabase/migrations/
├─ docs/PLAN.md       # ten plan / roadmapa
├─ CLAUDE.md
└─ README.md
```
Kluczowa decyzja: każda reguła w `packages/seo-rules` zwraca `Issue { ruleId, severity, url, message, evidence, fixHint? }`. Pole `fixHint` (strukturalny opis poprawki) to punkt zaczepienia pod przyszły moduł automatycznych zmian — niezależnie od tego, jaką metodę wdrażania wybierzesz.

## Zakres MVP (analiza)
1. **Projekty**: dodanie domeny, logowanie (Supabase Auth).
2. **Crawl**: robots.txt, sitemap.xml, BFS do limitu stron (np. 500), statusy HTTP, przekierowania, opcjonalny rendering JS.
3. **Reguły audytu (on-page + techniczne)**:
   - title / meta description (brak, duplikaty, długość)
   - H1 (brak/wiele), hierarchia nagłówków
   - canonical, noindex, hreflang
   - alt obrazków, rozmiar obrazków
   - linki wewnętrzne/zewnętrzne, 4xx/5xx, łańcuchy przekierowań, strony osierocone
   - dane strukturalne (JSON-LD — walidacja podstawowa)
   - Open Graph / Twitter cards
   - HTTPS, mixed content
   - Core Web Vitals (PSI API) dla kluczowych stron
4. **Scoring**: wynik 0–100 per kategoria + ogólny.
5. **Raport**: dashboard z listą problemów (filtr po severity/kategorii), widok strony, eksport CSV/PDF.
6. **AI podsumowanie**: Claude grupuje problemy i daje priorytetową listę działań.
7. **Historia audytów**: porównanie z poprzednim (co się poprawiło/pogorszyło).

## Roadmapa
- **Etap 0 (teraz)**: repo, CLAUDE.md, docs/PLAN.md, szkielet monorepo.
- **Etap 1**: crawler + `seo-rules` + zapis do Supabase + prosty raport.
- **Etap 2**: dashboard, scoring, historia, AI rekomendacje, PSI.
- **Etap 3**: integracja Google Search Console (realne dane zapytań/indeksacji).
- **Etap 4 (fixy — decyzja później)**: wybór kanału wdrażania (PR na GitHub / WordPress REST / snippet JS/Cloudflare Worker) na bazie `fixHint`.

## Co zrobię po akceptacji (ta sesja)
1. `git init` w `/Users/dalv95/Desktop/SEO Master`, `.gitignore` (Node, `.env*`, `.next`).
2. Utworzę `README.md`, `docs/PLAN.md` (treść tego planu) i **`CLAUDE.md`** zawierający:
   - opis produktu i cel etapów (analiza teraz, fixy później)
   - stack i strukturę monorepo
   - komendy (`pnpm dev`, `pnpm test`, `pnpm lint`, `pnpm --filter worker dev`)
   - konwencje: TypeScript strict, reguły jako czyste funkcje z testami Vitest, typy w `packages/shared`, zod na granicach, sekrety tylko w `.env.local`
   - zasady crawlera: respektowanie robots.txt, rate limit, User-Agent `SEOMasterBot`
   - język: kod/komentarze po angielsku, UI docelowo PL/EN
3. Szkielet monorepo: `pnpm-workspace.yaml`, root `package.json`, `tsconfig.base.json`, puste pakiety z `package.json` (bez pełnej implementacji — to etap 1).
4. Pierwszy commit (z linią `Co-Authored-By`).
5. **GitHub**: `gh` CLI nie jest zainstalowane, a konektor GitHub w tej sesji nie działa. Ponieważ jesteś zalogowany w VS Code — po commicie klikniesz w panelu **Source Control → „Publish Branch” / „Publish to GitHub”**, wybierzesz nazwę `seo-master` i widoczność (prywatne). To utworzy repo i wypchnie kod. (Alternatywa: `brew install gh && gh auth login`, wtedy zrobię `gh repo create seo-master --private --source=. --push`.)

## Weryfikacja
- `pnpm install` przechodzi bez błędów w szkielecie.
- `git log` pokazuje commit; `git status` czysty.
- Po publikacji: `git remote -v` wskazuje na `github.com/<user>/seo-master`, repo widoczne na GitHubie z `CLAUDE.md` i `docs/PLAN.md`.
