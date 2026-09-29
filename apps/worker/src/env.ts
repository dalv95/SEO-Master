import { z } from "zod";

export const env = z
  .object({
    DATABASE_URL: z.string().url(),
    WORKER_POLL_INTERVAL_MS: z.coerce.number().int().positive().default(5000),
  })
  .parse(process.env);
