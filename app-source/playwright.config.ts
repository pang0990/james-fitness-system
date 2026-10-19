import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/e2e",
  use: {
    baseURL: "http://127.0.0.1:3100",
    viewport: { width: 1440, height: 1000 },
    headless: true,
  },
  webServer: {
    // Browser QA exercises the actual static export, not Next dev’s fallback routes.
    command: process.env.CI ? "npm run start" : "npm run build && npm run start",
    url: "http://127.0.0.1:3100",
    reuseExistingServer: !process.env.CI,
  },
  reporter: "list",
});
