import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getSessionUser } from '@/lib/db/users'
import { getUserJobDescriptions } from '@/lib/db/cvs'

export async function GET() {
  try {
    const cookieStore = await cookies()
    const sessionToken = cookieStore.get('session')?.value

    if (!sessionToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await getSessionUser(sessionToken)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const jobDescriptions = await getUserJobDescriptions(user.id)
    return NextResponse.json({ jobDescriptions })
  } catch (error) {
    console.error('[AI Job History] Error getting job descriptions:', error)
    return NextResponse.json({ error: 'Failed to get job description history' }, { status: 500 })
  }
}
