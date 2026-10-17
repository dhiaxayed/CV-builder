import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir:process.env.E2E_PRODUCTION === '1' ? './tests/production' : process.env.E2E_LIVE_AI === '1' ? './tests/live-ai' : './tests/e2e',fullyParallel:false,workers:1,forbidOnly:!!process.env.CI,
  retries:process.env.CI ? 1 : 0,timeout:60000,expect:{ timeout:15000 },
  reporter:[['list'],['html',{ open:'never' }]],
  use:{ baseURL:'http://127.0.0.1:3001',trace:'retain-on-failure',screenshot:'only-on-failure' },
  projects:[{ name:'chromium',use:{ ...devices['Desktop Chrome'] } }],
  webServer:{ command:'pnpm exec tsx tests/helpers/e2e-server.ts',url:'http://127.0.0.1:3001',reuseExistingServer:false,timeout:120000 },
})
