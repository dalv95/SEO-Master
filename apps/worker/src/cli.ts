import { writeFile } from "node:fs/promises";
import { parseArgs } from "node:util";
import { crawl, runPageSpeedForCrawl } from "@seo-master/crawler";
import { runAudit } from "@seo-master/seo-rules";
import { RENDER_MODES } from "@seo-master/shared";
import { formatReport } from "./report";

const { positionals, values } = parseArgs({
  allowPositionals: true,
  options: {
    max: { type: "string", default: "100" },
    json: { type: "string" },
    lang: { type: "string", default: "en" },
    render: { type: "string", default: "auto" },
    "skip-pagespeed": { type: "boolean", default: false },
  },
});

const url = positionals[0];
if (!url) {
  console.error("Usage: pnpm audit:cli <url> [--max 100] [--lang pl|en] [--render auto|always|never] [--skip-pagespeed] [--json report.json]");
  process.exit(1);
}

const result = await crawl(url, {
  maxPages: Number(values.max),
  render: RENDER_MODES.find((m) => m === values.render) ?? "auto",
  onPage: (p, n) => process.stderr.write(`\r[${n}] ${p.status} ${p.url}`.slice(0, 120).padEnd(120)),
});
process.stderr.write("\n");
const apiKey = process.env.PAGESPEED_API_KEY;
if (apiKey && !values["skip-pagespeed"]) {
  process.stderr.write("Running PageSpeed Insights…\n");
  result.pageSpeed = await runPageSpeedForCrawl(result, { apiKey });
}
const audit = runAudit(result);
console.log(formatReport(result, audit, values.lang === "pl" ? "pl" : "en"));

if (values.json) {
  await writeFile(values.json, JSON.stringify({ crawl: result, audit }, null, 2));
  console.log(`\nFull report written to ${values.json}`);
}
