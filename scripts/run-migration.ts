import { config } from 'dotenv'
import { verifyDatabaseReadiness } from './lib/database-readiness'
config({ path:'.env.local',quiet:true })

async function main() {
  console.log('Read-only database check. This command does not apply migrations.')
  const result=await verifyDatabaseReadiness(process.env)
  console.log(`Detected ${result.schema} schema. The original schema is supported without migrations 003/004.`)
  console.log('For an optional hardened rollout, coordinate migrations and server credentials using VERCEL.md.')
}
main().catch(error => { console.error(error instanceof Error ? error.message : 'Database check failed'); process.exitCode=1 })
