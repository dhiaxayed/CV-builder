import { NextResponse } from 'next/server'
import { getUserJobDescriptions } from '@/lib/db/cvs'
import { requireUser, apiError } from '@/lib/server/api'
import { resolveUserTier } from '@/lib/billing/tier'
import { AppError } from '@/lib/errors'

export async function GET() {
  try {
    const user = await requireUser()
    if (resolveUserTier(user) !== 'pro') throw new AppError(403,'PRO_PLAN_REQUIRED','Saved job history requires Pro.')
    return NextResponse.json({ jobDescriptions:await getUserJobDescriptions(user.id) },{ headers:{ 'Cache-Control':'no-store' } })
  } catch (error) { return apiError(error) }
}
