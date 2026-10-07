import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.E2E_PORT ?? 3100);

export default defineConfig({
  testDir: "e2e",
  timeout: 90_000,
  workers: 1,
  globalSetup: "./e2e/global-setup.ts",
  use: { baseURL: `http://localhost:${PORT}`, trace: "retain-on-failure" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `npm run dev -- --port ${PORT}`,
    url: `http://localhost:${PORT}`,
    // A fresh server with its own database and the fake AI, so tests never touch real data or spend API credit.
    reuseExistingServer: false,
    env: { SLIDEKICK_DB: "data/e2e.db", SLIDEKICK_FAKE_AI: "1" },
    timeout: 120_000,
  },
});
