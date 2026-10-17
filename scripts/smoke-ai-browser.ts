import { existsSync } from 'node:fs'
import { spawn } from 'node:child_process'

if (existsSync('.env.local')) process.loadEnvFile('.env.local')
if (!process.env.GROQ_API_KEY && !process.env.OPENROUTER_API_KEY) {
  console.error('Configure an AI provider before the live browser verification.')
  process.exitCode=1
} else {
  // The test server always overrides Supabase and email configuration with its
  // isolated fixture. Only the provider receives synthetic CV career content.
  const child=spawn(process.execPath,['node_modules/@playwright/test/cli.js','test'],{
    stdio:'inherit',windowsHide:true,env:{ ...process.env,E2E_LIVE_AI:'1' },
  })
  child.on('error',() => { console.error('Could not start live AI verification.'); process.exitCode=1 })
  child.on('exit',code => { process.exitCode=code ?? 1 })
}
