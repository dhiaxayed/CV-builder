import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createAuthToken } from '@/lib/db/users'
import { sendMagicLinkEmail } from '@/lib/email'
import { readJSON, apiError, requestOrigin } from '@/lib/server/api'
import { rateLimit, clientAddress } from '@/lib/server/rate-limit'
import { safeRedirect } from '@/lib/auth-redirect'
import { AppError } from '@/lib/errors'

export async function POST(request: NextRequest) {
  try {
    const { email, redirect } = await readJSON(request, z.object({ email: z.string().trim().toLowerCase().email().max(255), redirect: z.string().max(500).optional() }).strict(), 2048)
    const address = clientAddress(request)
    await rateLimit(`magic:ip:${address}`, address === 'unknown' ? 100 : 20, 900)
    await rateLimit(`magic:email:${email}`, 3, 900)
    const token = await createAuthToken(email)
    const url = new URL('/api/auth/verify', requestOrigin(request))
    url.searchParams.set('token', token)
    url.searchParams.set('redirect', safeRedirect(redirect))
    const devConsole = process.env.NODE_ENV === 'development' && process.env.EMAIL_PROVIDER === 'console'
    const sent = await sendMagicLinkEmail(email, url.toString())
    if (!sent.success) throw new AppError(502, 'EMAIL_UNAVAILABLE', 'Unable to send the sign-in email. Please retry.')
    return NextResponse.json({ success: true, message: 'Check your email for a sign-in link.', ...(devConsole ? { devLink: url.toString() } : {}) }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) { return apiError(error) }
}
