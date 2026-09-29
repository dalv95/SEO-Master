import { loadEnvConfig } from "@next/env";
import path from "node:path";
import type { NextConfig } from "next";

// One .env.local at the monorepo root is shared by web and worker.
// forceReload: Next has already loaded (and cached) env files from apps/web.
loadEnvConfig(path.resolve(process.cwd(), "../.."), process.env.NODE_ENV !== "production", console, true);

const config: NextConfig = {
  transpilePackages: ["@seo-master/shared", "@seo-master/seo-rules", "@seo-master/google"],
};

export default config;
