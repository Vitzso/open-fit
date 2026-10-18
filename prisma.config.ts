import { existsSync } from "node:fs";
import { defineConfig } from "prisma/config";

// With a config file, the Prisma CLI no longer reads .env by itself.
// Load it with Node's built-in loader; real environment variables still win.
if (existsSync(".env")) process.loadEnvFile(".env");

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "node prisma/seed.mjs",
  },
});
