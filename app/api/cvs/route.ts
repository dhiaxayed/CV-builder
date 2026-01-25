import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getSessionUser } from '@/lib/db/users'
import { getUserCVs, createCV } from '@/lib/db/cvs'

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
    
    const cvs = await getUserCVs(user.id)
    
    return NextResponse.json({ cvs })
  } catch (error) {
    console.error('[v0] Error getting CVs:', error)
    return NextResponse.json({ error: 'Failed to get CVs' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
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
    
    const { title, templateId, initialData } = await request.json()
    
    const cv = await createCV(user.id, title || 'Untitled CV', templateId, initialData)
    
    return NextResponse.json({ cv })
  } catch (error) {
    console.error('[v0] Error creating CV:', error)
    return NextResponse.json({ error: 'Failed to create CV' }, { status: 500 })
  }
}
