import 'server-only'
import { requireDatabase, type DbUser } from './index'
import { nanoid } from 'nanoid'
import { createHash } from 'node:crypto'
import { databaseError } from '@/lib/errors'

export const hashToken = (token: string) => createHash('sha256').update(token).digest('hex')

export async function getUserByEmail(email: string): Promise<DbUser | null> {
  const { data, error } = await requireDatabase().from('users').select('*').eq('email', email.trim().toLowerCase()).maybeSingle()
  if (error) databaseError(error)
  return data as DbUser | null
}

export async function createUser(email: string): Promise<DbUser> {
  const { error } = await requireDatabase().from('users').upsert({ id: nanoid(), email: email.trim().toLowerCase() }, { onConflict: 'email', ignoreDuplicates: true })
  if (error) databaseError(error)
  const user = await getUserByEmail(email)
  if (!user) throw new Error('User persistence was not confirmed')
  return user
}

export async function createAuthToken(email: string): Promise<string> {
  const token = nanoid(32)
  const { error } = await requireDatabase().from('auth_tokens').insert({ id: nanoid(), email, token: hashToken(token), expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString() })
  if (error) databaseError(error)
  return token
}

export async function verifyAuthToken(token: string): Promise<string | null> {
  if (!/^[A-Za-z0-9_-]{32}$/.test(token)) return null
  const { data, error } = await requireDatabase().rpc('consume_magic_token', { p_token: hashToken(token) })
  if (error) databaseError(error)
  return typeof data === 'string' ? data : null
}

export async function createSession(userId: string): Promise<string> {
  const token = nanoid(64)
  const { error } = await requireDatabase().from('sessions').insert({ id: nanoid(), user_id: userId, token: hashToken(token), expires_at: new Date(Date.now() + 30 * 86400000).toISOString() })
  if (error) databaseError(error)
  return token
}

export async function getSessionUser(token: string): Promise<DbUser | null> {
  if (!/^[A-Za-z0-9_-]{64}$/.test(token)) return null
  const { data, error } = await requireDatabase().from('sessions')
    .select('users!inner(id,email,name,photo_url,plan_tier,preferences,email_verified,last_login_at,created_at,updated_at)')
    .eq('token', hashToken(token)).gt('expires_at', new Date().toISOString()).maybeSingle()
  if (error) databaseError(error)
  return data ? data.users as unknown as DbUser : null
}

export async function deleteSession(token: string): Promise<void> {
  const { error } = await requireDatabase().from('sessions').delete().eq('token', hashToken(token))
  if (error) databaseError(error)
}
