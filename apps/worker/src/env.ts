import { z } from "zod";

export const env = z
  .object({
    DATABASE_URL: z.string().url(),
    WORKER_POLL_INTERVAL_MS: z.coerce.number().int().positive().default(5000),
    /** Optional: without it audits skip PageSpeed Insights. */
    PAGESPEED_API_KEY: z.string().min(1).optional().or(z.literal("").transform(() => undefined)),
    PAGESPEED_MAX_PAGES: z.coerce.number().int().min(1).max(20).default(5),
  })
  .parse(process.env);
