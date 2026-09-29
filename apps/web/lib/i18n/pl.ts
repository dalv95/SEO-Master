import { plural } from "@seo-master/seo-rules";
import type { Dictionary } from "./en";

const pages = (n: number) => plural(n, "strona", "strony", "stron");

export const pl: Dictionary = {
  signOut: "Wyloguj",
  allSites: "Wszystkie strony",

  login: {
    title: "Zaloguj się",
    google: "Kontynuuj z Google",
    orEmail: "albo e-mailem",
    email: "E-mail",
    password: "Hasło",
    passwordHint: "Co najmniej 8 znaków.",
    signIn: "Zaloguj się",
    signingIn: "Logowanie…",
    createAccount: "Załóż konto",
    creatingAccount: "Zakładanie konta…",
    haveAccount: "Masz już konto?",
    newHere: "Nie masz konta?",
    toSignUp: "Załóż konto",
    toSignIn: "Zaloguj się",
    errorGoogle: "Logowanie przez Google nie powiodło się. Spróbuj ponownie albo użyj e-maila i hasła.",
    errorLink: "Ten link potwierdzający został już użyty lub wygasł. Spróbuj się zalogować.",
  },

  errors: {
    invalidEmail: "Podaj poprawny adres e-mail.",
    passwordTooShort: "Hasło musi mieć co najmniej 8 znaków.",
    emailNotConfirmed: "Najpierw potwierdź adres e-mail — sprawdź skrzynkę.",
    wrongCredentials: "Nieprawidłowy e-mail lub hasło.",
    weakPassword: "Wybierz silniejsze hasło.",
    accountCreated: "Konto założone. Potwierdź adres e-mail linkiem, który wysłaliśmy, a potem się zaloguj.",
    invalidSite: "Podaj adres strony, np. przyklad.pl.",
  },

  dashboard: {
    title: "Twoje strony",
    empty:
      "Dodaj stronę, żeby uruchomić pierwszy audyt. Przeskanujemy ją, sprawdzimy każdą podstronę pod kątem ponad 30 reguł SEO i pokażemy, co poprawić najpierw.",
    noAudits: "brak audytów",
    addSite: "Dodaj stronę",
    siteAddress: "Adres strony",
    name: "Nazwa",
    optional: "(opcjonalnie)",
    namePlaceholder: "Mój sklep",
    adding: "Dodawanie…",
    addAndRun: "Dodaj stronę i uruchom audyt",
  },

  status: { queued: "w kolejce", running: "w trakcie", completed: "zakończony", failed: "błąd" },

  project: {
    pageLimit: "Limit stron",
    runAudit: "Uruchom nowy audyt",
    inProgress: "Audyt w trakcie",
    history: "Historia audytów",
    noAudits: "Brak audytów. Uruchom pierwszy, żeby zobaczyć kondycję strony.",
    pagesAgo: (n, ago) => `${pages(n)} · ${ago}`,
    crawling: (n) => `Skanowanie… dotąd ${pages(n)}`,
    waiting: "Czeka na crawler",
    failed: (e) => `Błąd: ${e}`,
  },

  audit: {
    failedTitle: "Audyt się nie zakończył",
    failedHelp: "Sprawdź, czy strona jest dostępna, i uruchom nowy audyt ze strony projektu.",
    queuedTitle: "Czekamy na crawler…",
    runningTitle: "Skanujemy Twoją stronę…",
    progress: (done, max) => `${done} / ${max} stron`,
    progressHelp: "Ta strona odświeża się sama. Raport pojawi się po zakończeniu skanowania.",
    pages,
    sitemapUrls: (n) => plural(n, "adres", "adresy", "adresów"),
    whatToFix: "Co poprawić",
    all: "Wszystkie",
    filterBySeverity: "Filtruj według wagi",
    noMatches: "Brak problemów pasujących do filtrów.",
    more: (n) => `…i jeszcze ${n}`,
    howToFix: "Jak naprawić",
    fix: "poprawka",
    crawledPages: (n) => `Zeskanowane strony (${n})`,
    table: { url: "Adres", status: "Status", depth: "Głębokość", words: "Słowa", time: "Czas", issues: "Problemy" },
    exportCsv: "Pobierz CSV",
    exportPdf: "Zapisz jako PDF",
  },

  csv: {
    severity: "Waga",
    category: "Kategoria",
    rule: "Problem",
    ruleId: "ID reguły",
    url: "Adres",
    message: "Szczegóły",
    evidence: "Dowód",
    howToFix: "Jak naprawić",
  },

  print: {
    title: "Raport z audytu SEO",
    generated: (date) => `Wygenerowano ${date}`,
    save: "Zapisz jako PDF",
    back: "Wróć do raportu",
    hint: "W oknie drukowania wybierz „Zapisz jako PDF” jako drukarkę.",
    moreInCsv: (n) => `…i jeszcze ${n} — pełna lista jest w eksporcie CSV.`,
  },

  spectrum: {
    aria: (n) => `${pages(n)} pokolorowanych według najpoważniejszego problemu`,
    caption: "Każdy słupek to jedna strona, w kolejności skanowania · wyższy = więcej problemów",
    noIssues: "bez problemów",
    issues: (n) => plural(n, "problem", "problemy", "problemów"),
    legend: { critical: "Krytyczne", warning: "Ostrzeżenia", notice: "Tylko uwagi", clean: "Bez problemów" },
  },

  severity: { critical: "krytyczne", warning: "ostrzeżenia", notice: "uwagi" },

  category: {
    indexability: "Indeksowanie",
    meta: "Tytuły i opisy",
    content: "Treść",
    links: "Linki",
    images: "Obrazki",
    "structured-data": "Dane strukturalne",
    social: "Social media",
    security: "Bezpieczeństwo",
    performance: "Wydajność",
  },
};
