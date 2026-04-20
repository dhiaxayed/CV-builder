import { NextResponse } from 'next/server'
import { getCVByShareToken } from '@/lib/db/cvs'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    const cv = await getCVByShareToken(token)
    
    if (!cv) {
      return NextResponse.json({ error: 'CV not found' }, { status: 404 })
    }
    
    // Merge photo_url into CV data for backward compatibility
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
    
    return NextResponse.json({ 
      cv: {
        ...cv,
        current_version: cv.current_version ? { ...cv.current_version, data: cvData } : cv.current_version,
      }
    })
  } catch (error) {
    console.error('[Share] Error getting shared CV:', error)
    return NextResponse.json({ error: 'Failed to get shared CV' }, { status: 500 })
  }
}
