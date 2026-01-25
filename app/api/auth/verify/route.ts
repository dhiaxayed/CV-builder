import { NextRequest, NextResponse } from 'next/server'
import { verifyAuthToken, getUserByEmail, createSession, createUser } from '@/lib/db/users'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get('token')
    console.log('[Auth Verify] Token received:', token?.substring(0, 10) + '...')
    
    if (!token) {
      console.log('[Auth Verify] No token provided')
      return NextResponse.redirect(new URL('/auth/signin?error=invalid_token', request.url))
    }
    
    // Verify the token
    const email = await verifyAuthToken(token)
    console.log('[Auth Verify] Email from token:', email)
    
    if (!email) {
      console.log('[Auth Verify] Token invalid or expired')
      return NextResponse.redirect(new URL('/auth/signin?error=expired_token', request.url))
    }
    
    // Get user - create if doesn't exist
    let user = await getUserByEmail(email)
    console.log('[Auth Verify] User found:', user?.id)
    
    if (!user) {
      console.log('[Auth Verify] Creating new user for:', email)
      user = await createUser(email)
      console.log('[Auth Verify] User created:', user?.id)
    }
    
    if (!user) {
      console.log('[Auth Verify] Failed to get/create user')
      return NextResponse.redirect(new URL('/auth/signin?error=user_not_found', request.url))
    }
    
    // Create session
    const sessionToken = await createSession(user.id)
    console.log('[Auth Verify] Session created')
    
    // Set session cookie
    const cookieStore = await cookies()
    cookieStore.set('session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: '/',
    })
    
    console.log('[Auth Verify] Redirecting to dashboard')
    return NextResponse.redirect(new URL('/dashboard', request.url))
  } catch (error) {
    console.error('[Auth Verify] Error:', error)
    return NextResponse.redirect(new URL('/auth/signin?error=verification_failed', request.url))
  }
}
