import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getSessionUser } from '@/lib/db/users'
import { getCV, getCVWithCurrentVersion, updateCVData, deleteCV, updateCVTitle, updateCVTemplate } from '@/lib/db/cvs'

export async function GET(
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
    
    const cv = await getCVWithCurrentVersion(id)
    
    if (!cv) {
      return NextResponse.json({ error: 'CV not found' }, { status: 404 })
    }
    
    if (cv.user_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }
    
    // Include data from current version
    // Merge photo_url from CV table if exists but not in data (backward compatibility)
    let cvData = cv.current_version?.data || null
    if (cvData && (cv as any).photo_url && !cvData.basics?.photoUrl) {
      cvData = {
        ...cvData,
        basics: {
          ...cvData.basics,
          photoUrl: (cv as any).photo_url,
        },
      }
    }
    
    const cvWithData = {
      ...cv,
      data: cvData,
    }
    
    return NextResponse.json({ cv: cvWithData })
  } catch (error) {
    console.error('[v0] Error getting CV:', error)
    return NextResponse.json({ error: 'Failed to get CV' }, { status: 500 })
  }
}

export async function PUT(
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
    
    const { data, title, templateId } = await request.json()
    
    if (title) {
      await updateCVTitle(id, title)
    }
    
    if (templateId) {
      await updateCVTemplate(id, templateId)
    }
    
    if (data) {
      const version = await updateCVData(id, data)
      return NextResponse.json({ version })
    }
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[v0] Error updating CV:', error)
    return NextResponse.json({ error: 'Failed to update CV' }, { status: 500 })
  }
}

export async function DELETE(
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
    
    await deleteCV(id)
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[v0] Error deleting CV:', error)
    return NextResponse.json({ error: 'Failed to delete CV' }, { status: 500 })
  }
}
