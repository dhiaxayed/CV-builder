import { type NextRequest, NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/db/users'
import { assertSameOrigin, requestOrigin } from '@/lib/server/api'

export async function proxy(request: NextRequest) {
  // All cookie-authenticated mutations are same-origin, including multipart uploads.
  if (request.nextUrl.pathname.startsWith('/api/')) {
    if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
      try { assertSameOrigin(request) } catch {
        return NextResponse.json({ error: 'Cross-site requests are not allowed.' }, { status: 403 })
      }
    }
    return NextResponse.next()
  }
  const protectedRoute = /^\/(dashboard|cv)(\/|$)/.test(request.nextUrl.pathname)
  const signin = request.nextUrl.pathname === '/auth/signin'
  if (!protectedRoute && !signin) return NextResponse.next()
  const token = request.cookies.get('session')?.value
  let valid = false
  try { valid = Boolean(token && await getSessionUser(token)) } catch { /* fail closed */ }
  if (protectedRoute && !valid) {
    const url = new URL('/auth/signin', requestOrigin(request))
    url.searchParams.set('redirect', request.nextUrl.pathname + request.nextUrl.search)
    const response = NextResponse.redirect(url)
    if (token) response.cookies.delete('session')
    return response
  }
  if (signin && valid) return NextResponse.redirect(new URL('/dashboard', requestOrigin(request)))
  const response = NextResponse.next()
  if (token && !valid) response.cookies.delete('session')
  return response
}

export const config = { matcher: ['/api/:path*', '/dashboard/:path*', '/cv/:path*', '/auth/signin'] }
