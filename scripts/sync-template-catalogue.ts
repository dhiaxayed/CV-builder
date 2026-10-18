import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import { serverDatabaseKey } from '../lib/db/config'
import { TEMPLATES } from '../lib/templates'

async function main() {
  config({ path:'.env.local',quiet:true })
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = serverDatabaseKey(process.env)
  if (!url || !key) throw new Error('Use the existing Supabase URL and server database configuration.')
  const database = createClient(url,key,{ auth:{ persistSession:false,autoRefreshToken:false } })
  // Insert missing catalogue records only. Never overwrite a deployed template,
  // alter grants, run a schema migration, or access users and CV content.
  const rows = TEMPLATES.map((template,index) => ({
    id:template.id,name:template.name,description:template.description,
    category:template.category,is_default:template.id === 'classic',
    sort_order:index+1,latex_template:template.id,
  }))
  const inserted = await database.from('templates').upsert(rows,{ onConflict:'id',ignoreDuplicates:true }).select('id')
  if (inserted.error) throw new Error(`Catalogue insertion failed (${inserted.error.code}). An owner can apply scripts/005-template-catalogue.sql instead.`)
  const result = await database.from('templates').select('id').in('id',TEMPLATES.map(template=>template.id))
  if (result.error || result.data?.length !== TEMPLATES.length) throw new Error('The complete catalogue could not be confirmed.')
  console.log(`Template catalogue ready: ${result.data.length} layouts, ${inserted.data.length} new records. Existing records retained.`)
}

main().catch(error => { console.error(error instanceof Error ? error.message : 'Catalogue synchronization failed.');process.exitCode=1 })
