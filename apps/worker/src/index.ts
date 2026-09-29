import { crawl, runPageSpeedForCrawl } from "@seo-master/crawler";
import { runAudit } from "@seo-master/seo-rules";
import { claimNextAudit, failAudit, requeueStale, saveResults, setStage, sql, updateProgress } from "./db";
import { env } from "./env";
import { gscEnabled, syncDueProjects } from "./gsc";

const GSC_CHECK_INTERVAL_MS = 60_000;

let stopping = false;
for (const sig of ["SIGINT", "SIGTERM"] as const) {
  process.on(sig, () => {
    console.log(`${sig} received, finishing current audit…`);
    stopping = true;
  });
}

async function processNext(): Promise<boolean> {
  const job = await claimNextAudit();
  if (!job) return false;
  console.log(`▶ audit ${job.id}: ${job.url} (max ${job.max_pages} pages, JS rendering: ${job.render_mode})`);
  try {
    let lastReport = 0;
    const result = await crawl(job.url, {
      maxPages: job.max_pages,
      render: job.render_mode,
      onPage: (_, n) => {
        if (n - lastReport >= 10) {
          lastReport = n;
          void updateProgress(job.id, n).catch(() => {});
        }
      },
    });
    if (env.PAGESPEED_API_KEY) {
      await setStage(job.id, "pagespeed", result.pages.length);
      result.pageSpeed = await runPageSpeedForCrawl(result, {
        apiKey: env.PAGESPEED_API_KEY,
        maxPages: env.PAGESPEED_MAX_PAGES,
      });
      const failed = result.pageSpeed.filter((r) => r.error).length;
      console.log(`  PageSpeed: ${result.pageSpeed.length - failed} ok, ${failed} failed`);
    }
    const audit = runAudit(result);
    await saveResults(job.id, result, audit);
    console.log(
      `✔ audit ${job.id}: ${result.pages.length} pages${result.rendering.used ? " (JS rendered)" : ""}, score ${audit.score}, ${audit.issues.length} issues`,
    );
  } catch (e) {
    console.error(`✖ audit ${job.id} failed`, e);
    await failAudit(job.id, (e as Error).message);
  }
  return true;
}

await requeueStale();
console.log(
  `SEO Master worker started, polling for queued audits… (PageSpeed ${env.PAGESPEED_API_KEY ? "on" : "off: no PAGESPEED_API_KEY"}, Search Console sync ${gscEnabled() ? "on" : "off: GOOGLE_CLIENT_ID/SECRET or TOKEN_ENCRYPTION_KEY missing"})`,
);
let lastGscCheck = 0;
while (!stopping) {
  // Audits first; Search Console sync runs between audits at most once a minute.
  if (Date.now() - lastGscCheck > GSC_CHECK_INTERVAL_MS) {
    lastGscCheck = Date.now();
    await syncDueProjects().catch((e) => console.error("GSC sync error", e));
  }
  const didWork = await processNext().catch((e) => {
    console.error("worker loop error", e);
    return false;
  });
  if (!didWork) await new Promise((r) => setTimeout(r, env.WORKER_POLL_INTERVAL_MS));
}
await sql.end();
