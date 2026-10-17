import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
config({ path:'.env.local',quiet:true })

async function main() {
  console.log('Read-only database check. This command does not apply migrations.')
  console.log('Apply 001, 002, 003, and 004 in order using the Supabase SQL editor, then run scripts/verify-security.sql.')
  const url=process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const key=process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('NEXT_PUBLIC_SUPABASE_URL and a server-only SUPABASE_SERVICE_ROLE_KEY are required. A public key cannot be used.')
  const db=createClient(url,key,{ auth:{ persistSession:false,autoRefreshToken:false } })
  const { error }=await db.from('cvs').select('id,revision,draft_data,published_data').limit(0)
  if (error) throw new Error('Database schema or server privileges could not be verified. Review migrations and configuration in the Supabase dashboard.')
  console.log('Required draft columns are reachable with the server credential. Browser-role grants must still be checked using verify-security.sql.')
}
main().catch(error => { console.error(error instanceof Error ? error.message : 'Database check failed'); process.exitCode=1 })
