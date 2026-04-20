import { supabase, isDatabaseConfigured, DbUser } from './index'
import { nanoid } from 'nanoid'

export async function getUserByEmail(email: string): Promise<DbUser | null> {
  if (!supabase || !isDatabaseConfigured()) return null
  
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', email)
    .single()
  
  if (error || !data) return null
  return data as DbUser
}

export async function getUserById(id: string): Promise<DbUser | null> {
  if (!supabase || !isDatabaseConfigured()) return null
  
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', id)
    .single()
  
  if (error || !data) return null
  return data as DbUser
}

export async function createUser(email: string, name?: string): Promise<DbUser> {
  if (!supabase || !isDatabaseConfigured()) {
    throw new Error('Database not configured')
  }
  
  const id = nanoid()
  const { data, error } = await supabase
    .from('users')
    .insert({ id, email, name: name || null })
    .select()
    .single()
  
  if (error) throw new Error(`Failed to create user: ${error.message}`)
  return data as DbUser
}

export async function updateUser(
  id: string,
  updates: { name?: string; photo_url?: string | null }
): Promise<DbUser | null> {
  if (!supabase || !isDatabaseConfigured()) return null
  
  const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (updates.name !== undefined) updateData.name = updates.name
  if (updates.photo_url !== undefined) updateData.photo_url = updates.photo_url
  
  const { data, error } = await supabase
    .from('users')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()
  
  if (error || !data) return null
  return data as DbUser
}

// Auth tokens for magic links
export async function createAuthToken(email: string): Promise<string> {
  if (!supabase || !isDatabaseConfigured()) {
    throw new Error('Database not configured')
  }
  
  const token = nanoid(32)
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString() // 15 minutes
  
  const { error } = await supabase
    .from('auth_tokens')
    .insert({ id: nanoid(), email, token, expires_at: expiresAt })
  
  if (error) throw new Error(`Failed to create auth token: ${error.message}`)
  return token
}

export async function verifyAuthToken(token: string): Promise<string | null> {
  if (!supabase || !isDatabaseConfigured()) return null
  
  const { data, error } = await supabase
    .from('auth_tokens')
    .select('email')
    .eq('token', token)
    .gt('expires_at', new Date().toISOString())
    .is('used_at', null)
    .single()
  
  if (error || !data) return null
  
  // Mark token as used
  await supabase
    .from('auth_tokens')
    .update({ used_at: new Date().toISOString() })
    .eq('token', token)
  
  return data.email as string
}

// Sessions
export async function createSession(userId: string): Promise<string> {
  if (!supabase || !isDatabaseConfigured()) {
    throw new Error('Database not configured')
  }
  
  const token = nanoid(64)
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days
  
  const { error } = await supabase
    .from('sessions')
    .insert({ id: nanoid(), user_id: userId, token, expires_at: expiresAt })
  
  if (error) throw new Error(`Failed to create session: ${error.message}`)
  return token
}

export async function getSessionUser(token: string): Promise<DbUser | null> {
  if (!supabase || !isDatabaseConfigured()) return null
  
  // First get the session
  const { data: session, error: sessionError } = await supabase
    .from('sessions')
    .select('user_id')
    .eq('token', token)
    .gt('expires_at', new Date().toISOString())
    .single()
  
  if (sessionError || !session) return null
  
  // Then get the user
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('*')
    .eq('id', session.user_id)
    .single()
  
  if (userError || !user) return null
  return user as DbUser
}

export async function deleteSession(token: string): Promise<void> {
  if (!supabase || !isDatabaseConfigured()) return
  
  await supabase
    .from('sessions')
    .delete()
    .eq('token', token)
}
