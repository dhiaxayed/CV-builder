import 'server-only'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { AppError } from '@/lib/errors'
import { createEmptyCVData, CVData } from '../types/cv'

// Re-export the canonical CVData type from types/cv
export type { CVData } from '../types/cv'
export { createEmptyCVData }

// Initialize Supabase client for server-side database operations
// NEXT_PUBLIC values are frozen at build time. A private runtime URL also lets
// Preview and production smoke checks select their isolated database safely.
const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

function getSupabaseClient() {
  if (!supabaseUrl || !supabaseServiceKey) {
    return null
  }
  return createSupabaseClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

const supabase = getSupabaseClient()

export function requireDatabase() {
  if (!supabase) throw new AppError(503, 'DATABASE_NOT_CONFIGURED', 'Server database access is not configured.')
  return supabase
}

export type DbUser = {
  id: string
  email: string
  name: string | null
  photo_url: string | null
  plan_tier: 'free' | 'pro' | null
  preferences: Record<string, unknown>
  email_verified: boolean
  last_login_at: string | null
  created_at: string
  updated_at: string
}

export type DbCV = {
  id: string
  user_id: string
  title: string
  template_id: string
  current_version_id: string | null
  draft_data: CVData
  revision: number
  is_public: boolean
  share_token: string | null
  photo_url: string | null
  ats_score: number | null
  view_count: number
  last_exported_at: string | null
  created_at: string
  updated_at: string
}

export type DbCVVersion = {
  id: string
  cv_id: string
  version: number
  data: CVData
  template_id: string | null
  latex_source: string | null
  note: string | null
  created_by: string | null
  created_at: string
}
