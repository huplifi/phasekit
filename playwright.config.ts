import { defineConfig } from "@playwright/test";

const baseURL = "http://127.0.0.1:4173";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: "list",
  outputDir: "./output/playwright/results",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL,
    serviceWorkers: "allow",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "desktop-webkit",
      testMatch:
        /field-report-.*spec.ts|reports-catalogue.spec.ts|round3-.*spec.ts|release-history.spec.ts|beta-.*round-two.spec.ts|beta-feedback.spec.ts|mobile-layout.spec.ts|shsc-pair.spec.ts|field-tools.spec.ts|check-schedule.spec.ts|converters-preview.spec.ts|reports-preview.spec.ts|search-filters.spec.ts/,
      use: {
        browserName: "webkit",
        viewport: { width: 1440, height: 900 },
        deviceScaleFactor: 1,
      },
    },
    {
      name: "mobile-webkit",
      testMatch:
        /field-report-.*spec.ts|reports-catalogue.spec.ts|round3-.*spec.ts|release-history.spec.ts|beta-.*round-two.spec.ts|beta-feedback.spec.ts|mobile-layout.spec.ts|shsc-pair.spec.ts|field-tools.spec.ts|check-schedule.spec.ts|converters-preview.spec.ts|reports-preview.spec.ts|search-filters.spec.ts/,
      use: {
        browserName: "webkit",
        viewport: { width: 390, height: 844 },
        deviceScaleFactor: 3,
        isMobile: true,
        hasTouch: true,
      },
    },
    {
      name: "mobile-chromium",
      use: {
        browserName: "chromium",
        viewport: { width: 390, height: 844 },
        deviceScaleFactor: 3,
        isMobile: true,
        hasTouch: true,
      },
    },
    {
      name: "desktop-chromium",
      use: {
        browserName: "chromium",
        viewport: { width: 1440, height: 900 },
        deviceScaleFactor: 1,
      },
    },
  ],
  webServer: {
    command: "pnpm preview --port 4173",
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    stdout: "pipe",
    stderr: "pipe",
  },
});
