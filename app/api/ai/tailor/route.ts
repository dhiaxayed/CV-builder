import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getCVWithCurrentVersion, saveJobDescription } from '@/lib/db/cvs'
import { generateJobTailorAnalysis } from '@/lib/ai/cv-review'
import { resolveUserTier } from '@/lib/billing/tier'
import { cvDataSchema } from '@/lib/validation/cv'
import { requireUser, readJSON, apiError } from '@/lib/server/api'
import { rateLimit } from '@/lib/server/rate-limit'
import { AppError } from '@/lib/errors'

export const maxDuration = 60
export async function POST(request: Request) {
  try {
    const user = await requireUser()
    if (resolveUserTier(user) !== 'pro') throw new AppError(403,'PRO_PLAN_REQUIRED','Job tailoring requires Pro. Contact us to upgrade.')
    const body = await readJSON(request,z.object({ cvId:z.string().max(100).optional(),cvData:cvDataSchema,jobTitle:z.string().trim().max(255).default('Target role'),company:z.string().trim().max(255).optional(),jobDescription:z.string().trim().min(20).max(20000),saveToHistory:z.boolean().default(true) }).strict(),550000)
    if (body.cvId && !await getCVWithCurrentVersion(body.cvId,user.id)) throw new AppError(404,'CV_NOT_FOUND','CV not found')
    await rateLimit(`ai:${user.id}`,30,3600)
    const result = await generateJobTailorAnalysis(body)
    const saved = body.saveToHistory ? await saveJobDescription(user.id,body.cvId || null,body.jobTitle,body.company || null,body.jobDescription,result.extractedKeywords,result.analysis.matchScore) : null
    return NextResponse.json({ ...result,savedJobDescriptionId:saved?.id || null },{ headers:{ 'Cache-Control':'no-store' } })
  } catch (error) { return apiError(error) }
}
