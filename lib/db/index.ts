import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { createEmptyCVData, CVData } from '../types/cv'

// Re-export the canonical CVData type from types/cv
export type { CVData } from '../types/cv'
export { createEmptyCVData }

// Create an emptyCV constant for backward compatibility
export const emptyCV = createEmptyCVData()

// Initialize Supabase client for server-side database operations
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY

function getSupabaseClient() {
  if (!supabaseUrl || !supabaseServiceKey) {
    console.warn('[DB] Supabase environment variables not set - database features will not work')
    return null
  }
  return createSupabaseClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

export const supabase = getSupabaseClient()

// Helper function for checking if database is configured
export function isDatabaseConfigured(): boolean {
  return supabase !== null
}

// ============================================
// TYPE DEFINITIONS
// ============================================

export type DbUser = {
  id: string
  email: string
  name: string | null
  photo_url: string | null
  preferences: Record<string, unknown>
  email_verified: boolean
  last_login_at: Date | null
  created_at: Date
  updated_at: Date
}

export type DbCV = {
  id: string
  user_id: string
  title: string
  template_id: string
  current_version_id: string | null
  is_public: boolean
  share_token: string | null
  photo_url: string | null
  ats_score: number | null
  view_count: number
  last_exported_at: Date | null
  created_at: Date
  updated_at: Date
}

export type DbCVVersion = {
  id: string
  cv_id: string
  version: number
  data: CVData
  latex_source: string | null
  note: string | null
  created_by: string | null
  created_at: Date
}

export type DbTemplate = {
  id: string
  name: string
  description: string | null
  preview_image: string | null
  latex_template: string
  category: string
  is_premium: boolean
  is_default: boolean
  sort_order: number
}

export type DbShareLink = {
  id: string
  cv_id: string
  version_id: string | null
  token: string
  password_hash: string | null
  expires_at: Date | null
  max_views: number | null
  current_views: number
  allow_download: boolean
  is_active: boolean
  created_at: Date
}

export type DbJobDescription = {
  id: string
  user_id: string
  cv_id: string | null
  title: string
  company: string | null
  description: string
  extracted_keywords: string[]
  match_score: number | null
  created_at: Date
}

export type DbUploadedFile = {
  id: string
  user_id: string
  file_type: string
  file_name: string
  file_size: number
  mime_type: string
  storage_url: string
  storage_provider: string
  metadata: Record<string, unknown>
  created_at: Date
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

export function sanitizeForJSON(data: unknown): unknown {
  if (data === null || data === undefined) return data
  if (typeof data === 'string') return data
  if (typeof data === 'number' || typeof data === 'boolean') return data
  if (Array.isArray(data)) return data.map(sanitizeForJSON)
  if (typeof data === 'object') {
    const sanitized: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
      sanitized[key] = sanitizeForJSON(value)
    }
    return sanitized
  }
  return String(data)
}

// Re-export all database modules
export * from './users'
export * from './cvs'
