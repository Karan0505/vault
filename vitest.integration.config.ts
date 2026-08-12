import { defineConfig } from "vitest/config";
import path from "node:path";

// Integration and concurrency tests hit a real Postgres (DATABASE_URL) and
// exercise actual row locking, so they run under a separate config from
// the pure-function unit tests in vitest.config.ts: longer timeout,
// sequential-safe defaults, and the server-only stub aliased in so
// *.server.ts modules can be imported directly outside the Next.js
// server bundle.
export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    testTimeout: 20_000,
    hookTimeout: 20_000,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "server-only": path.resolve(__dirname, "./test/stubs/server-only.ts"),
      "next/server": path.resolve(__dirname, "./node_modules/next/server.js"),
    },
  },
});
