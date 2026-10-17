import { NextRequest, NextResponse } from 'next/server'
import { verifyAuthToken, createSession, createUser } from '@/lib/db/users'
import { requireDatabase } from '@/lib/db'
import { databaseError } from '@/lib/errors'
import { safeRedirect } from '@/lib/auth-redirect'
import { requestOrigin } from '@/lib/server/api'

export async function GET(request: NextRequest) {
  try {
    const email = await verifyAuthToken(request.nextUrl.searchParams.get('token') || '')
    if (!email) return NextResponse.redirect(new URL('/auth/signin?error=expired_token', requestOrigin(request)))
    const user = await createUser(email)
    const { error } = await requireDatabase().from('users').update({ email_verified: true, last_login_at: new Date().toISOString() }).eq('id', user.id)
    if (error) databaseError(error)
    const token = await createSession(user.id)
    const response = NextResponse.redirect(new URL(safeRedirect(request.nextUrl.searchParams.get('redirect')), requestOrigin(request)))
    response.cookies.set('session', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 30 * 86400, path: '/' })
    response.headers.set('Cache-Control', 'no-store')
    response.headers.set('Referrer-Policy', 'no-referrer')
    return response
  } catch {
    return NextResponse.redirect(new URL('/auth/signin?error=verification_failed', requestOrigin(request)))
  }
}
