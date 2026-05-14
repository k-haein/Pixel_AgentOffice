import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },
  fullyParallel: false, // Electron 인스턴스가 동시 띄우면 충돌
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    actionTimeout: 10_000,
    trace: 'retain-on-failure',
  },
})
