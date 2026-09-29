import type { RuleTexts } from "./types";

/** Polish plural form: 1 znak, 2–4 znaki, 5+ znaków (but 12–14 znaków, 22 znaki). */
export function plural(n: unknown, one: string, few: string, many: string): string {
  const x = Math.abs(Number(n));
  if (x === 1) return `${n} ${one}`;
  const d = x % 10;
  const dd = x % 100;
  return `${n} ${d >= 2 && d <= 4 && (dd < 12 || dd > 14) ? few : many}`;
}

const chars = (n: unknown) => plural(n, "znak", "znaki", "znaków");
const pages = (n: unknown) => plural(n, "inna strona", "inne strony", "innych stron");

export const pl: RuleTexts = {
  "meta-title-missing": {
    title: "Brak tytułu strony",
    message: () => "Strona nie ma tagu <title> albo jest on pusty.",
    help: "Tytuł to klikalny nagłówek w wynikach wyszukiwania. Dodaj unikalny, opisowy tytuł (15–60 znaków) z głównym słowem kluczowym strony.",
  },
  "meta-title-too-long": {
    title: "Za długi tytuł",
    message: (p) => `Tytuł ma ${chars(p.length)} (zalecane ≤ ${p.max}) — w wynikach Google prawdopodobnie zostanie ucięty.`,
    help: "Google ucina tytuły w okolicach 60 znaków. Najważniejsze słowa umieść na początku, a resztę skróć.",
  },
  "meta-title-too-short": {
    title: "Za krótki tytuł",
    message: (p) => `Tytuł ma tylko ${chars(p.length)}; użyj bardziej opisowego tytułu (${p.min}–${p.max} znaków).`,
    help: "Krótki tytuł marnuje miejsce w wynikach wyszukiwania. Opisz, co oferuje strona, i dodaj główne słowo kluczowe.",
  },
  "meta-title-duplicate": {
    title: "Powielone tytuły",
    message: (p) => `Ten sam tytuł ma jeszcze ${pages(p.count)}.`,
    help: "Każda strona potrzebuje własnego tytułu, żeby wyszukiwarka mogła je odróżnić i pokazać właściwą.",
  },
  "meta-description-missing": {
    title: "Brak opisu meta",
    message: () => "Strona nie ma opisu meta — wyszukiwarka sama wybierze fragment tekstu.",
    help: "Napisz zachęcające do kliknięcia podsumowanie (70–160 znaków). Google często pokazuje je pod tytułem.",
  },
  "meta-description-length": {
    title: "Długość opisu meta",
    message: (p) => `Opis meta ma ${chars(p.length)} (zalecane ${p.min}–${p.max}).`,
    help: "Za krótki opis mówi niewiele, a za długi zostanie ucięty. Celuj w 70–160 znaków.",
  },
  "meta-description-duplicate": {
    title: "Powielone opisy meta",
    message: (p) => `Ten sam opis meta ma jeszcze ${pages(p.count)}.`,
    help: "Napisz opis dopasowany do treści każdej strony.",
  },
  "h1-missing": {
    title: "Brak nagłówka H1",
    message: () => "Strona nie ma niepustego nagłówka <h1>.",
    help: "H1 mówi użytkownikom i wyszukiwarkom, czego dotyczy strona. Dodaj jeden główny nagłówek zgodny z tematem.",
  },
  "h1-multiple": {
    title: "Kilka nagłówków H1",
    message: (p) => `Strona ma ${plural(p.count, "nagłówek", "nagłówki", "nagłówków")} <h1>; użyj jednego głównego.`,
    help: "Zostaw jeden H1 dla głównego tematu, a sekcje oznacz nagłówkami H2–H3.",
  },
  "heading-skipped-level": {
    title: "Pominięty poziom nagłówka",
    message: (p) => `Hierarchia nagłówków przeskakuje z h${p.from} na h${p.to}.`,
    help: "Używaj nagłówków po kolei (H1 → H2 → H3), żeby struktura była czytelna dla ludzi, czytników ekranu i robotów.",
  },
  "thin-content": {
    title: "Mało treści",
    message: (p) => `Strona ma tylko ${plural(p.words, "słowo", "słowa", "słów")} widocznego tekstu (< ${p.min}).`,
    help: "Strony z małą ilością tekstu rzadko są wysoko w wynikach. Rozbuduj treść o przydatne informacje albo oznacz stronę noindex, jeśli nie jest przeznaczona dla wyszukiwarki.",
  },
  "html-lang-missing": {
    title: "Brak atrybutu lang",
    message: () => "Element <html> nie ma atrybutu lang.",
    help: 'Dodaj lang (np. <html lang="pl">), żeby wyszukiwarki i czytniki ekranu znały język strony.',
  },
  "viewport-missing": {
    title: "Brak meta viewport",
    message: () => 'Brak <meta name="viewport"> — strona prawdopodobnie nie jest dostosowana do telefonów.',
    help: 'Google indeksuje najpierw wersję mobilną. Dodaj <meta name="viewport" content="width=device-width, initial-scale=1">.',
  },
  "http-error": {
    title: "Strona zwraca błąd",
    message: (p) => (p.error ? `Nie udało się pobrać strony: ${p.error}` : `Adres zwraca kod HTTP ${p.status}.`),
    help: "Napraw lub usuń stronę albo przekieruj ją (301) na najbardziej pasującą działającą stronę i popraw prowadzące do niej linki.",
  },
  "redirect-chain": {
    title: "Łańcuch przekierowań",
    message: (p) =>
      `Adres przechodzi przez ${plural(p.hops, "przekierowanie", "przekierowania", "przekierowań")}, zanim dotrze do docelowej strony.`,
    help: "Każde dodatkowe przekierowanie spowalnia użytkownika i marnuje budżet indeksowania. Przekieruj od razu na docelowy adres.",
  },
  noindex: {
    title: "Strona wykluczona (noindex)",
    message: () => "Strona jest wykluczona z wyszukiwarek (noindex). Upewnij się, że to celowe.",
    help: "noindex ukrywa stronę w Google. Usuń go ze stron, które mają się pojawiać w wynikach wyszukiwania.",
  },
  "canonical-missing": {
    title: "Brak adresu kanonicznego",
    message: () => "Strona nie ma linku rel=canonical.",
    help: "Tag canonical wskazuje wyszukiwarce główną wersję adresu i zapobiega duplikacji treści, np. przez parametry w URL.",
  },
  "canonical-broken": {
    title: "Canonical wskazuje zły adres",
    message: (p) => `Adres kanoniczny zwraca ${p.status}${p.redirected ? " po przekierowaniu" : ""}.`,
    help: "Canonical musi wskazywać bezpośrednio działającą stronę (200), inaczej wyszukiwarka może go zignorować.",
  },
  "hreflang-invalid": {
    title: "Nieprawidłowy hreflang",
    message: (p) => `Nieprawidłowa wartość hreflang „${p.lang}”.`,
    help: "Używaj kodów języka ISO, opcjonalnie z regionem, np. „pl”, „en-GB” lub „x-default”.",
  },
  "robots-txt-missing": {
    title: "Brak robots.txt",
    message: () => "Nie znaleziono pliku robots.txt.",
    help: "robots.txt mówi robotom, co mogą odwiedzać i gdzie jest mapa strony. Dodaj go w katalogu głównym witryny.",
  },
  "sitemap-missing": {
    title: "Brak mapy strony XML",
    message: () => "Nie znaleziono mapy strony XML (sprawdzono wpisy Sitemap: w robots.txt i /sitemap.xml).",
    help: "Mapa strony pomaga wyszukiwarkom znaleźć wszystkie podstrony. Wygeneruj ją i podaj jej adres w robots.txt.",
  },
  "sitemap-bad-url": {
    title: "Błędny adres w mapie strony",
    message: (p) => `Adres z mapy strony zwraca ${p.status}${p.redirected ? " po przekierowaniu" : ""}.`,
    help: "Mapa strony powinna zawierać tylko docelowe, działające adresy. Usuń lub popraw błędne i przekierowywane wpisy.",
  },
  "broken-internal-link": {
    title: "Niedziałający link wewnętrzny",
    message: (p) => `Link prowadzi do ${p.target}, który zwraca ${p.status}.`,
    help: "Niedziałające linki frustrują użytkowników i marnują moc linków. Popraw link albo przekieruj brakującą stronę.",
  },
  "internal-link-redirect": {
    title: "Link wewnętrzny do przekierowania",
    message: (p) => `Link prowadzi do ${p.href}, który przekierowuje na ${p.target}.`,
    help: "Linkuj bezpośrednio do docelowego adresu, żeby uniknąć zbędnych przekierowań.",
  },
  "link-empty-anchor": {
    title: "Link bez tekstu",
    message: (p) => `Linki bez tekstu, opisu alt ani aria-label: ${p.count}.`,
    help: "Tekst linku mówi wyszukiwarce, czego dotyczy strona docelowa. Dodaj tekst, alt obrazka albo aria-label.",
  },
  "orphan-page": {
    title: "Strona osierocona",
    message: () => "Strona jest w mapie strony, ale żadna ze zeskanowanych stron do niej nie linkuje.",
    help: "Strony bez linków wewnętrznych trudno znaleźć użytkownikom i robotom. Dodaj do nich linki z powiązanych stron lub z menu.",
  },
  "page-too-deep": {
    title: "Strona zbyt głęboko w strukturze",
    message: (p) =>
      `Strona jest ${plural(p.depth, "kliknięcie", "kliknięcia", "kliknięć")} od strony startowej (zalecane ≤ ${p.max}).`,
    help: "Ważne strony powinny być osiągalne w maksymalnie 3 kliknięciach. Dodaj do nich linki ze strony głównej, menu lub kategorii.",
  },
  "img-alt-missing": {
    title: "Obrazek bez alt",
    message: () => "Obrazek nie ma atrybutu alt.",
    help: 'Opisz obrazek w atrybucie alt (albo użyj alt="" dla obrazków czysto dekoracyjnych). Pomaga to w wyszukiwarce grafiki i dostępności.',
  },
  "jsonld-invalid": {
    title: "Błędny JSON-LD",
    message: (p) => `Nie można odczytać bloku JSON-LD: ${p.error}`,
    help: "Popraw składnię JSON, a potem sprawdź stronę narzędziem Google Rich Results Test.",
  },
  "structured-data-missing": {
    title: "Brak danych strukturalnych",
    message: () => "Żadna strona nie używa danych strukturalnych JSON-LD (np. Organization, Product, Article, BreadcrumbList).",
    help: "Dane strukturalne mogą dać rozszerzone wyniki (gwiazdki, ceny, ścieżki nawigacji). Zacznij od Organization lub LocalBusiness na stronie głównej.",
  },
  "og-missing": {
    title: "Brak tagów Open Graph",
    message: (p) => `Brakujące tagi Open Graph: ${p.missing}.`,
    help: "Tagi Open Graph decydują o tytule, opisie i obrazku przy udostępnianiu strony na Facebooku, LinkedInie czy w komunikatorach.",
  },
  "twitter-card-missing": {
    title: "Brak Twitter Card",
    message: () => "Brak tagu meta twitter:card.",
    help: 'Dodaj <meta name="twitter:card" content="summary_large_image">, żeby link dobrze wyglądał na X/Twitterze.',
  },
  "not-https": {
    title: "Strona bez HTTPS",
    message: () => "Strona jest serwowana przez niezabezpieczone HTTP.",
    help: "HTTPS to sygnał rankingowy, a przeglądarki oznaczają strony HTTP jako niezabezpieczone. Zainstaluj certyfikat i przekieruj HTTP na HTTPS.",
  },
  "mixed-content": {
    title: "Mieszana zawartość",
    message: (p) => `Strona HTTPS ładuje zasoby przez HTTP: ${p.count}.`,
    help: "Ładuj wszystkie skrypty, style i obrazki przez HTTPS, inaczej przeglądarka może je zablokować.",
  },
  "slow-response": {
    title: "Wolna odpowiedź serwera",
    message: (p) => `Pobranie strony trwało ${p.ms} ms (> ${p.max} ms).`,
    help: "Wolne odpowiedzi szkodzą użytkownikom i Core Web Vitals. Sprawdź hosting, cache i czas renderowania po stronie serwera.",
  },
  "large-html": {
    title: "Duży dokument HTML",
    message: (p) => `HTML waży ${p.kb} KB (> ${p.maxKb} KB).`,
    help: "Duży HTML spowalnia ładowanie. Usuń osadzone dane i skrypty, podziel długie listy na strony albo doładowuj sekcje później.",
  },
};
