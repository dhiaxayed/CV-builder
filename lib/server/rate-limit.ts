import 'server-only'
import { createHash } from 'node:crypto'
import { requireDatabase } from '@/lib/db'
import { AppError, databaseError } from '@/lib/errors'

export async function rateLimit(key: string, limit: number, windowSeconds: number) {
  const digest = createHash('sha256').update(key).digest('hex')
  const { data, error } = await requireDatabase().rpc('take_rate_limit', { p_key: digest, p_limit: limit, p_window_seconds: windowSeconds })
  if (error) databaseError(error)
  if (data !== true) throw new AppError(429, 'RATE_LIMITED', 'Too many requests. Please try again later.')
}

export function clientAddress(request: Request) {
  if (process.env.VERCEL) return request.headers.get('x-vercel-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  if (process.env.TRUST_PROXY_HEADERS === '1') return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  return 'unknown'
}
