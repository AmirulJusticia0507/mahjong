const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests/e2e',
  timeout: 45000,
  workers: 1,
  fullyParallel: false,
  reporter: 'line',
  use: {
    baseURL: 'http://127.0.0.1:3200',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'node src/server.js',
    url: 'http://127.0.0.1:3200/health',
    env: { PORT: '3200', TURN_TIMEOUT_MS: '60000', CLAIM_TIMEOUT_MS: '15000', BOT_DELAY_MS: '300' },
    reuseExistingServer: false,
  },
  projects: [
    { name: 'chromium-desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox-desktop', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit-desktop', use: { ...devices['Desktop Safari'] } },
    { name: 'mobile-chrome', use: { ...devices['Pixel 7'] } },
    { name: 'mobile-webkit', use: { ...devices['iPhone 15'] } },
  ],
});
