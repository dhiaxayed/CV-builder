import { config } from 'dotenv'
import { verifyDatabaseReadiness } from './lib/database-readiness'

config({ path: '.env.local', quiet: true })

async function main() {
  const result = await verifyDatabaseReadiness(process.env)
  console.log(`[deployment] ${result.schema} database schema is reachable. No database changes were made.`)
}

main().catch(error => {
  console.error('[deployment]', error instanceof Error ? error.message : 'Database readiness check failed.')
  process.exitCode = 1
})
