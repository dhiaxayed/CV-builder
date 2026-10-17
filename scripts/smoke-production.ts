import { spawn } from 'node:child_process'

// Run after pnpm build. The fixture supplies all database/email configuration;
// this check never needs a production database, email account or provider key.
const child=spawn(process.execPath,['node_modules/@playwright/test/cli.js','test'],{
  stdio:'inherit',windowsHide:true,
  env:{ ...process.env,E2E_PRODUCTION:'1',E2E_LIVE_AI:'',LATEX_RENDERER:'tectonic' },
})
child.on('error',() => { console.error('Could not start production verification.'); process.exitCode=1 })
child.on('exit',code => { process.exitCode=code ?? 1 })
