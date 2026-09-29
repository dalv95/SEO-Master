import type { IssueCategory, Severity } from "@seo-master/shared";

const s = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

export const en = {
  signOut: "Sign out",
  allSites: "All sites",

  login: {
    title: "Sign in",
    google: "Continue with Google",
    orEmail: "or with email",
    email: "Email",
    password: "Password",
    passwordHint: "At least 8 characters.",
    signIn: "Sign in",
    signingIn: "Signing in…",
    createAccount: "Create account",
    creatingAccount: "Creating account…",
    haveAccount: "Already have an account?",
    newHere: "New here?",
    toSignUp: "Create an account",
    toSignIn: "Sign in",
    errorGoogle: "Google sign-in didn't complete. Try again, or use email and password.",
    errorLink: "That confirmation link has already been used or has expired. Try signing in.",
  },

  errors: {
    invalidEmail: "Enter a valid email address.",
    passwordTooShort: "Password must be at least 8 characters.",
    emailNotConfirmed: "Confirm your email first — check your inbox.",
    wrongCredentials: "Wrong email or password.",
    weakPassword: "Choose a stronger password.",
    accountCreated: "Account created. Confirm your email via the link we sent, then sign in.",
    invalidSite: "Enter a website address, e.g. example.com.",
  },

  dashboard: {
    title: "Your sites",
    empty:
      "Add a website to run its first audit. We'll crawl it, check every page against 30+ SEO rules and show what to fix first.",
    noAudits: "no audits",
    addSite: "Add a site",
    siteAddress: "Website address",
    name: "Name",
    optional: "(optional)",
    namePlaceholder: "My shop",
    adding: "Adding…",
    addAndRun: "Add site and run audit",
  },

  status: { queued: "queued", running: "running", completed: "completed", failed: "failed" },

  project: {
    pageLimit: "Page limit",
    runAudit: "Run new audit",
    inProgress: "Audit in progress",
    history: "Audit history",
    noAudits: "No audits yet. Run one to see how this site is doing.",
    pagesAgo: (n: number, ago: string) => `${s(n, "page")} · ${ago}`,
    crawling: (n: number) => `Crawling… ${s(n, "page")} so far`,
    waiting: "Waiting for a crawler",
    failed: (e: string) => `Failed: ${e}`,
  },

  audit: {
    failedTitle: "The audit didn't finish",
    failedHelp: "Check that the site is reachable, then run a new audit from the site page.",
    queuedTitle: "Waiting for a crawler…",
    runningTitle: "Crawling your site…",
    progress: (done: number, max: number) => `${done} / ${max} pages`,
    progressHelp: "This page updates by itself. The report appears when the crawl is done.",
    pages: (n: number) => s(n, "page"),
    sitemapUrls: (n: number) => `${n} URLs`,
    whatToFix: "What to fix",
    all: "All",
    filterBySeverity: "Filter by severity",
    noMatches: "No issues match these filters.",
    more: (n: number) => `…and ${n} more`,
    howToFix: "How to fix",
    fix: "fix",
    crawledPages: (n: number) => `Crawled pages (${n})`,
    table: { url: "URL", status: "Status", depth: "Depth", words: "Words", time: "Time", issues: "Issues" },
    exportCsv: "Download CSV",
    exportPdf: "Save as PDF",
  },

  csv: {
    severity: "Severity",
    category: "Category",
    rule: "Issue",
    ruleId: "Rule ID",
    url: "URL",
    message: "Details",
    evidence: "Evidence",
    howToFix: "How to fix",
  },

  print: {
    title: "SEO audit report",
    generated: (date: string) => `Generated ${date}`,
    save: "Save as PDF",
    back: "Back to report",
    hint: "In the print dialog choose “Save as PDF” as the destination.",
    moreInCsv: (n: number) => `…and ${n} more — the full list is in the CSV export.`,
  },

  spectrum: {
    aria: (n: number) => `${s(n, "crawled page")} coloured by their most severe issue`,
    caption: "Each bar is one page, in crawl order · taller = more issues",
    noIssues: "no issues",
    issues: (n: number) => s(n, "issue"),
    legend: { critical: "Critical", warning: "Warning", notice: "Notices only", clean: "No issues" },
  },

  severity: { critical: "critical", warning: "warning", notice: "notice" } satisfies Record<Severity, string>,

  category: {
    indexability: "Indexability",
    meta: "Titles & meta",
    content: "Content",
    links: "Links",
    images: "Images",
    "structured-data": "Structured data",
    social: "Social",
    security: "Security",
    performance: "Performance",
  } satisfies Record<IssueCategory, string>,
};

export type Dictionary = typeof en;
