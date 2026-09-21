import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";

export default defineConfig({
  optimizeDeps: { include: ["lit/directives/keyed.js"] },
  test: {
    browser: {
      enabled: true,
      headless: true,
      instances: [{ browser: "chromium" }],
      provider: playwright(),
    },
    include: ["test/**/*.browser.test.ts"],
    testTimeout: 15_000,
  },
});
