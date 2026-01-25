import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'
import * as dotenv from 'dotenv'

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' })

async function runMigration() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Supabase environment variables are not set')
    console.log('\n📝 To set up your database:')
    console.log('1. Go to your Supabase project dashboard')
    console.log('2. Copy your project URL and anon key')
    console.log('3. Create a .env.local file with:')
    console.log('   NEXT_PUBLIC_SUPABASE_URL=your_project_url')
    console.log('   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=your_anon_key')
    process.exit(1)
  }
  
  console.log('🚀 Starting database migration...')
  console.log(`📡 Connected to: ${supabaseUrl}`)
  
  try {
    const supabase = createClient(supabaseUrl, supabaseKey)
    
    // Read the migration file
    const migrationPath = path.join(__dirname, '001-create-tables.sql')
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8')
    
    console.log('\n📝 Migration SQL loaded.')
    console.log('\n⚠️  IMPORTANT: For Supabase, you need to run the migration manually:')
    console.log('\n1. Go to your Supabase Dashboard: https://supabase.com/dashboard')
    console.log('2. Select your project')
    console.log('3. Go to SQL Editor')
    console.log('4. Copy and paste the contents of: scripts/001-create-tables.sql')
    console.log('5. Click "Run" to execute the migration')
    console.log('\n✅ Migration file location: scripts/001-create-tables.sql')
    
    // Try to check if tables exist
    const { data, error } = await supabase.from('users').select('id').limit(1)
    
    if (error && error.message.includes('does not exist')) {
      console.log('\n❌ Tables do not exist yet. Please run the migration SQL in Supabase dashboard.')
    } else if (error) {
      console.log('\n⚠️ Connection test error:', error.message)
    } else {
      console.log('\n✅ Tables already exist! Database is ready.')
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  }
}

runMigration()
