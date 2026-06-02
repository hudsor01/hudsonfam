import { config as loadEnv } from "dotenv";
// Load .env.local first (local dev keeps secrets there), then .env as fallback.
// dotenv never overrides vars already in process.env, so on Vercel — where the
// env vars are injected into the build — these no-op and process.env wins.
loadEnv({ path: ".env.local" });
loadEnv();
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: env("DIRECT_DATABASE_URL"),
  },
});
