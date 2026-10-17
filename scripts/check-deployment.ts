import { config } from 'dotenv'
import { verifyDatabaseReadiness } from './lib/database-readiness'

config({ path: '.env.local', quiet: true })

async function main() {
  // Git pushes must not promote code that requires an older production schema.
  // Local builds and isolated CI do not need hosted database credentials.
  if (!process.env.VERCEL && !process.env.VERCEL_ENV) return
  await verifyDatabaseReadiness(process.env)
  console.log('[deployment] Required database columns and RPCs are available. No database changes were made.')
}

main().catch(error => {
  console.error('[deployment]', error instanceof Error ? error.message : 'Database readiness check failed.')
  process.exitCode = 1
})
