import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

async function runMigration() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY

  if (!supabaseUrl || !supabaseKey) {
    console.error('[Error] Supabase environment variables are not set')
    console.log('\nTo set up your database:')
    console.log('1. Go to your Supabase project dashboard')
    console.log('2. Copy your project URL and anon key')
    console.log('3. Create a .env.local file with:')
    console.log('   NEXT_PUBLIC_SUPABASE_URL=your_project_url')
    console.log('   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=your_anon_key')
    process.exit(1)
  }

  console.log('[Info] Starting database migration check...')
  console.log(`[Info] Connected to: ${supabaseUrl}`)

  try {
    const supabase = createClient(supabaseUrl, supabaseKey)

    const bootstrapPath = path.join(__dirname, '001-create-tables.sql')
    const tierPatchPath = path.join(__dirname, '002-add-plan-tier.sql')

    const hasBootstrap = fs.existsSync(bootstrapPath)
    const hasTierPatch = fs.existsSync(tierPatchPath)

    if (!hasBootstrap) {
      console.error('[Error] Missing scripts/001-create-tables.sql')
      process.exit(1)
    }

    console.log('\n[Info] SQL migration files detected:')
    console.log(' - scripts/001-create-tables.sql')
    if (hasTierPatch) {
      console.log(' - scripts/002-add-plan-tier.sql')
    }

    console.log('\nIMPORTANT: For Supabase, run migrations manually in SQL Editor:')
    console.log('1. Open https://supabase.com/dashboard')
    console.log('2. Select your project')
    console.log('3. Open SQL Editor')
    console.log('4. Run scripts/001-create-tables.sql if database is new')
    console.log('5. Run scripts/002-add-plan-tier.sql to add billing tier column')

    const { error } = await supabase.from('users').select('id').limit(1)

    if (error && error.message.includes('does not exist')) {
      console.log('\n[Warn] Table users does not exist yet. Run 001-create-tables.sql first.')
    } else if (error) {
      console.log('\n[Warn] Connection test error:', error.message)
    } else {
      console.log('\n[OK] Users table exists. You can run 002-add-plan-tier.sql safely.')
    }
  } catch (error) {
    console.error('[Error] Migration check failed:', error)
    process.exit(1)
  }
}

runMigration()

