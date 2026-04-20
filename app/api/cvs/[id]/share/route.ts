import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getSessionUser } from '@/lib/db/users'
import { getCV, updateCVSharing } from '@/lib/db/cvs'

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
    
    const cv = await getCV(id)
    if (!cv || cv.user_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }
    
    const { isPublic } = await request.json()
    
    const result = await updateCVSharing(id, isPublic)
    
    return NextResponse.json(result)
  } catch (error) {
    console.error('Error updating sharing:', error)
    return NextResponse.json({ error: 'Failed to update sharing' }, { status: 500 })
  }
}
