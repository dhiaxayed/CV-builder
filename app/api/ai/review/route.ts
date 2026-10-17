import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getCVWithCurrentVersion } from '@/lib/db/cvs'
import { runATSChecks } from '@/lib/ats/checker'
import { generateAtsReview } from '@/lib/ai/cv-review'
import { cvDataSchema } from '@/lib/validation/cv'
import { requireUser, readJSON, apiError } from '@/lib/server/api'
import { rateLimit } from '@/lib/server/rate-limit'
import { AppError } from '@/lib/errors'
import { aiRequestLimit } from '@/lib/billing/tier'

export const maxDuration = 60
export async function POST(request: Request) {
  try {
    const user = await requireUser()
    const { cvId, cvData } = await readJSON(request,z.object({ cvId:z.string().max(100).optional(),cvData:cvDataSchema }).strict(),500000)
    if (cvId && !await getCVWithCurrentVersion(cvId,user.id)) throw new AppError(404,'CV_NOT_FOUND','CV not found')
    await rateLimit(`ai:${user.id}`,aiRequestLimit(user),3600)
    const result = await generateAtsReview({ cvData })
    return NextResponse.json({ ...result,heuristicReport:runATSChecks(cvData) },{ headers:{ 'Cache-Control':'no-store' } })
  } catch (error) { return apiError(error) }
}
