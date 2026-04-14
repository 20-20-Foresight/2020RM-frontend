const path = require("node:path");

/**
 * @type {import("@playwright/test").PlaywrightTestConfig}
 */
module.exports = {
  testDir: "./e2e",
  outputDir: "./.store/playwright-results",
  fullyParallel: false,
  retries: 0,
  use: {
    baseURL: "http://127.0.0.1:4173",
    headless: true,
    viewport: {
      width: 1440,
      height: 1200
    }
  },
  webServer: {
    command: [
      "npm run build",
      [
        "PORT=4173",
        "BASE_URL=http://127.0.0.1:4173",
        "AUTH_ENABLED=false",
        `SESSION_META_FIXTURE_PATH=${path.resolve(__dirname, "test/fixtures/session-meta.dashboard.json")}`,
        `ADMIN_DATA_LIST_FIXTURE_PATH=${path.resolve(__dirname, "test/fixtures/admin-data-list.dashboard.json")}`,
        `ADMIN_DATA_DETAIL_FIXTURE_PATH=${path.resolve(__dirname, "test/fixtures/admin-data-detail.dashboard.json")}`,
        "npm start"
      ].join(" ")
    ].join(" && "),
    url: "http://127.0.0.1:4173/dashboard",
    reuseExistingServer: false,
    timeout: 120000
  }
};
