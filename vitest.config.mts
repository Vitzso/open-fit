// Unit tests for the pure logic (npm test). Server and UI code is checked end to end instead.
import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { alias: { "@": path.resolve(import.meta.dirname, "src") } },
  test: { include: ["src/**/*.test.ts"], environment: "node" },
});
