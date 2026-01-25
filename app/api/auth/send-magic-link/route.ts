import { NextRequest, NextResponse } from 'next/server'
import { createAuthToken, getUserByEmail, createUser } from '@/lib/db/users'
import { sendMagicLinkEmail } from '@/lib/email'

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()
    
    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 })
    }
    
    // Normalize email
    const normalizedEmail = email.toLowerCase().trim()
    
    // Check if user exists, if not create one
    let user = await getUserByEmail(normalizedEmail)
    if (!user) {
      user = await createUser(normalizedEmail)
    }
    
    // Create auth token
    const token = await createAuthToken(normalizedEmail)
    
    // Build verification URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const verifyUrl = `${baseUrl}/api/auth/verify?token=${token}`
    
    // Send magic link email
    const emailResult = await sendMagicLinkEmail(normalizedEmail, verifyUrl)
    
    if (!emailResult.success) {
      console.error('[Auth] Failed to send magic link email:', emailResult.error)
      // Still return success to not leak information about email delivery
    }
    
    // Log in development
    if (process.env.NODE_ENV === 'development') {
      console.log('[Auth] Magic link for', normalizedEmail, ':', verifyUrl)
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'Magic link sent to your email',
      // Only include in development
      ...(process.env.NODE_ENV === 'development' && { devLink: verifyUrl })
    })
  } catch (error) {
    console.error('[Auth] Error sending magic link:', error)
    return NextResponse.json({ error: 'Failed to send magic link' }, { status: 500 })
  }
}
