import { NextResponse } from 'next/server'
import { getSessionUser, deleteSession } from '@/lib/db/users'
import { resolveUserTier } from '@/lib/billing/tier'
import { apiError, assertSameOrigin } from '@/lib/server/api'
import { cookies } from 'next/headers'

export async function GET() {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('session')?.value
    const user = token ? await getSessionUser(token) : null
    const response = NextResponse.json({ user: user ? { id:user.id,email:user.email,name:user.name,photoUrl:user.photo_url,tier:resolveUserTier(user) } : null },{ headers:{ 'Cache-Control':'no-store' } })
    if (token && !user) response.cookies.delete('session')
    return response
  } catch (error) { return apiError(error) }
}

export async function DELETE(request: Request) {
  try {
    assertSameOrigin(request)
    const cookieStore = await cookies()
    const token = cookieStore.get('session')?.value
    if (token) await deleteSession(token)
    cookieStore.delete('session')
    return NextResponse.json({ success:true },{ headers:{ 'Cache-Control':'no-store' } })
  } catch (error) { return apiError(error) }
}
