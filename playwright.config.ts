import { defineConfig } from "@playwright/test";

import { getPhase5Env } from "./tests/e2e/env";

const phase5Env = getPhase5Env();
const baseURL = phase5Env.E2E_BASE_URL;
const video = process.env.E2E_DISABLE_VIDEO === "1" ? "off" : "retain-on-failure";
const localTarget = new URL(baseURL).hostname === "127.0.0.1"
  || new URL(baseURL).hostname === "localhost";

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: "**/*.spec.ts",
  fullyParallel: false,
  workers: 1,
  timeout: 120_000,
  expect: { timeout: 15_000 },
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL,
    channel: "chrome",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video,
    acceptDownloads: true,
  },
  webServer: localTarget ? {
    command: "npm run dev -- --hostname 127.0.0.1 --port 3100",
    url: baseURL,
    reuseExistingServer: false,
    timeout: 120_000,
    stdout: "pipe",
    stderr: "pipe",
    env: {
      ...process.env,
      NEXT_PUBLIC_SUPABASE_URL: phase5Env.E2E_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: phase5Env.E2E_SUPABASE_ANON_KEY,
    },
  } : undefined,
});
