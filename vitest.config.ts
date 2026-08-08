import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      // Next's server-component guard package throws outside a Next
      // server context — stub it for tests.
      "server-only": path.resolve(__dirname, "tests/stubs/server-only.ts"),
      "@": path.resolve(__dirname),
    },
  },
  test: {
    environment: "node",
    setupFiles: ["tests/setup.ts"],
    // Integration tests self-skip unless LOCAL_SUPABASE=1 (see
    // tests/integration/*) — `npm run test` runs units only.
  },
});
