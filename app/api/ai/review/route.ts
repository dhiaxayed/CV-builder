import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getSessionUser } from '@/lib/db/users'
import { getCV, updateCVATSScore } from '@/lib/db/cvs'
import { runATSChecks } from '@/lib/ats/checker'
import { generateAtsReview } from '@/lib/ai/cv-review'
import { CVData } from '@/lib/types/cv'

export const maxDuration = 60

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

    const { cvId, cvData } = (await request.json()) as { cvId?: string; cvData?: CVData }

    if (!cvData) {
      return NextResponse.json({ error: 'No CV data provided' }, { status: 400 })
    }

    if (cvId) {
      const cv = await getCV(cvId)
      if (!cv || cv.user_id !== user.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
      }
    }

    const heuristicReport = runATSChecks(cvData)
    const review = await generateAtsReview({ cvData, userId: user.id })

    if (cvId) {
      await updateCVATSScore(cvId, review.atsReadinessScore)
    }

    return NextResponse.json({
      review,
      heuristicReport,
    })
  } catch (error) {
    console.error('[AI Review] Error generating AI review:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to generate AI review',
      },
      { status: 500 }
    )
  }
}
