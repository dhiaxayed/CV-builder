import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
config({ path:'.env.local',quiet:true })

async function main() {
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL
  const key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) throw new Error('Configure the Supabase URL and public key before this read-only check.')
  const db=createClient(url,key,{ auth:{ persistSession:false,autoRefreshToken:false } })
  // LIMIT 0 never retrieves private records. A 200 can still be protected by
  // RLS, so it is inconclusive; only SQL grants/policies can settle that case.
  const results=await Promise.all(['users','auth_tokens','sessions','cvs','cv_versions','share_links','cv_views','job_descriptions','uploaded_files','rate_limits'].map(async table => {
    const { error }=await db.from(table).select(table==='rate_limits' ? 'key' : 'id').limit(0)
    const result=error?.code==='42501' ? 'denied' : !error ? 'inconclusive: inspect SQL grants and RLS' : error.code==='PGRST205' ? 'schema not exposed or missing' : 'request unavailable'
    return { table,result,code:error?.code || null }
  }))
  console.log(JSON.stringify(results,null,2))
  if (results.some(result => result.result!=='denied')) process.exitCode=1
}
main().catch(() => { console.error('Public-key verification could not run. Check configuration without printing credentials.'); process.exitCode=1 })
