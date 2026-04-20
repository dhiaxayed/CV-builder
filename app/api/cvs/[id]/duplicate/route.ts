import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getSessionUser } from '@/lib/db/users'
import { getCV, duplicateCV, getUserCVs } from '@/lib/db/cvs'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const cookieStore = await cookies()
    const sessionToken = cookieStore.get('session')?.value
    
    if (!sessionToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const user = await getSessionUser(sessionToken)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Check user tier and enforce free tier limit (max 1 CV)
    const userTier = user.preferences?.tier || 'free'
    if (userTier === 'free') {
      const existingCVs = await getUserCVs(user.id)
      if (existingCVs && existingCVs.length >= 1) {
        return NextResponse.json(
          { error: 'Free tier limit reached. Please upgrade to Pro to create unlimited CVs.' },
          { status: 403 }
        )
      }
    }
    
    const cv = await getCV(id)
    if (!cv || cv.user_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }
    
    const newCV = await duplicateCV(id, user.id)
    
    return NextResponse.json({ cv: newCV })
  } catch (error) {
    console.error('[v0] Error duplicating CV:', error)
    return NextResponse.json({ error: 'Failed to duplicate CV' }, { status: 500 })
  }
}
