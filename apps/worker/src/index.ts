import { crawl } from "@seo-master/crawler";
import { runAudit } from "@seo-master/seo-rules";
import { claimNextAudit, failAudit, requeueStale, saveResults, sql, updateProgress } from "./db";
import { env } from "./env";

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
console.log("SEO Master worker started, polling for queued audits…");
while (!stopping) {
  const didWork = await processNext().catch((e) => {
    console.error("worker loop error", e);
    return false;
  });
  if (!didWork) await new Promise((r) => setTimeout(r, env.WORKER_POLL_INTERVAL_MS));
}
await sql.end();
