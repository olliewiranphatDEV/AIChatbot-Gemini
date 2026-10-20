import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  outputDir: '.verification.local/auth-test-results',
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    channel: 'chrome',
    headless: true,
    trace: 'retain-on-failure',
    // A synthetic microphone, so Live tests can run without hardware or a permission prompt.
    launchOptions: { args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'] },
  },
  webServer: [
    { command: 'node scripts/auth-test-server.mjs', url: 'http://127.0.0.1:5180', reuseExistingServer: false },
    { command: 'node scripts/auth-test-server.mjs --emulator', url: 'http://127.0.0.1:5181', reuseExistingServer: false },
  ],
})
