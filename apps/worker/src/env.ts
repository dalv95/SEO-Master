import { z } from "zod";

/** Unset or empty → undefined. */
const optional = z
  .string()
  .optional()
  .transform((v) => v || undefined);

export const env = z
  .object({
    DATABASE_URL: z.string().url(),
    WORKER_POLL_INTERVAL_MS: z.coerce.number().int().positive().default(5000),
    /** Optional: without it audits skip PageSpeed Insights. */
    PAGESPEED_API_KEY: optional,
    PAGESPEED_MAX_PAGES: z.coerce.number().int().min(1).max(20).default(5),
    /** Optional: Search Console sync runs only when all three are set. */
    GOOGLE_CLIENT_ID: optional,
    GOOGLE_CLIENT_SECRET: optional,
    TOKEN_ENCRYPTION_KEY: optional,
  })
  .parse(process.env);
