# SEO Master — kierunek produktu

Ustalone 29.09.2026. Główny klient: **agencje i freelancerzy SEO**.

## 1. Co oferują konkurenci

| | BabyLoveGrowth | Opinly |
|---|---|---|
| Obietnica | „Ruch z Google i ChatGPT na autopilocie, bez zespołu SEO” | „Outrank competitors on Google and in ChatGPT” |
| Treści | 30 artykułów AI/mies., auto-publikacja | generator + harmonogram |
| Linki | wymiana linków w sieci klientów | „backlink exchange” |
| AI search (GEO) | monitoring poleceń w ChatGPT/Claude/Perplexity/Gemini | pozycje w ChatGPT |
| Techniczne | auto-poprawki meta/schema | site audit |
| Integracje | WP, Shopify, Wix, Webflow, API | WP, Webflow, Shopify, Next.js, Nuxt, Svelte |
| Cena | $99 / $299, white-label $2000 + $99/strona | od ~€18 |

**Słabości:** wymiana linków i masowe treści AI to wprost „link scheme” i „scaled content abuse” wg Google (ryzyko kary); recenzje: słaba jakość treści, mało linków; brak dowodu efektu; obiecują autopilot właścicielom firm — agencja nie może oddać kontroli nad domeną klienta takiemu automatowi.

## 2. Pozycjonowanie dla agencji
**„Plan działań dla każdego klienta — oparty na jego danych z Google i AI, z dowodem efektu.”**
- Wiele witryn klientów w jednym miejscu, priorytety wg realnego ruchu (GSC), nie wg liczby problemów.
- Widoczność marki klienta w odpowiedziach AI (ChatGPT, Perplexity, Gemini, Claude) — to, co klienci agencji dziś pytają.
- Gotowe do wklejenia poprawki (tytuły, opisy, alt, schema) generowane przez LLM — agencja wdraża, bo za to jej płacą.
- Raporty white-label i „co dała nasza praca” (przed/po z GSC) — argument agencji przy przedłużaniu umowy.
- Zero wymiany linków i masówki — bezpieczne dla domen klientów.

## 3. Auto-poprawki czy plan działań? → **Plan działań + gotowe poprawki do wklejenia; auto-wdrażanie później, jako dodatek**
- Agencje obsługują klientów na różnych CMS-ach i z różnym dostępem — integracja z każdym to dużo pracy przy małej wartości.
- Agencja odpowiada za stronę klienta; automat zmieniający produkcję bez przeglądu to ryzyko, którego nie przyjmie.
- Wdrożenie to usługa, którą agencja sprzedaje — potrzebuje listy zadań, treści poprawek i raportu, nie przycisku, który ją zastąpi.
- Pole `fixHint` w regułach zostaje — później można dodać „wdróż jednym klikiem” dla WordPressa bez zmiany reguł.

## 4. Roadmapa
- **Etap 3 — Google Search Console** (ten plan, szczegóły niżej). Darmowe API, fundament priorytetów i pomiaru efektu.
- **Etap 4 — LLM** (wymaga kluczy API): (a) śledzenie widoczności marki w AI dla zestawu pytań klienta (cotygodniowo, z konkurentami); (b) propozycje tytułów/opisów/alt/schema do skopiowania; (c) briefy treści pod frazy z GSC na pozycjach 5–20.
- **Etap 5 — Plan działań**: zadania z issues + GSC + AI, priorytet = waga × ruch strony, statusy, eksport CSV (później Asana/Trello/Jira).
- **Etap 6 — Funkcje agencyjne**: przestrzenie robocze i członkowie zespołu, cykliczne audyty, miesięczny raport white-label (logo, kolory), przed/po dla wykonanych zadań.
- **Etap 7 — Monetyzacja**: plany wg liczby witryn klientów, Stripe (PLN/EUR).
- **Później**: auto-wdrażanie (WordPress, GitHub PR), Google Business Profile.
