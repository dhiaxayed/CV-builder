import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getSessionUser } from '@/lib/db/users'
import { getCV, saveJobDescription } from '@/lib/db/cvs'
import { CVData } from '@/lib/types/cv'
import { generateJobTailorAnalysis } from '@/lib/ai/cv-review'
import { resolveUserTier } from '@/lib/billing/tier'

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

    const userTier = resolveUserTier(user)
    if (userTier !== 'pro') {
      return NextResponse.json(
        {
          error: 'Job description tailoring is available on Pro plan only.',
          code: 'PRO_PLAN_REQUIRED',
        },
        { status: 403 }
      )
    }

    const { cvId, cvData, jobTitle, company, jobDescription, saveToHistory } = (await request.json()) as {
      cvId?: string
      cvData?: CVData
      jobTitle?: string
      company?: string
      jobDescription?: string
      saveToHistory?: boolean
    }

    if (!cvData || !jobDescription?.trim()) {
      return NextResponse.json({ error: 'CV data and job description are required' }, { status: 400 })
    }

    if (cvId) {
      const cv = await getCV(cvId)
      if (!cv || cv.user_id !== user.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
      }
    }

    const result = await generateJobTailorAnalysis({
      cvData,
      jobTitle: jobTitle?.trim() || 'Target role',
      company: company?.trim(),
      jobDescription,
      userId: user.id,
    })

    let savedJobDescriptionId: string | null = null

    if (saveToHistory !== false) {
      const saved = await saveJobDescription(
        user.id,
        cvId || null,
        jobTitle?.trim() || 'Untitled role',
        company?.trim() || null,
        jobDescription,
        result.extractedKeywords,
        result.analysis.matchScore
      )

      savedJobDescriptionId = saved.id
    }

    return NextResponse.json({
      ...result,
      savedJobDescriptionId,
    })
  } catch (error) {
    console.error('[AI Tailor] Error generating tailoring analysis:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to tailor CV for job description',
      },
      { status: 500 }
    )
  }
}
