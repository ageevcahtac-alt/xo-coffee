import path from "node:path";
import { defineConfig } from "vitest/config";

/**
 * First test config in this repository (added in P24 — see
 * P24_XO_STORE_PASSPORT_INTEGRATION_CLIENT.md §11 for why). Deliberately
 * minimal: Node environment (no DOM needed — everything under test here is
 * server-only), one alias mirroring tsconfig.json's `@/*` -> `./*` so tests
 * can import the same `@/src/...` paths the app code already uses.
 */
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
