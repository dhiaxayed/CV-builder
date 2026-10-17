import { NextResponse } from 'next/server'
import { requireUser, apiError } from '@/lib/server/api'
import { rateLimit } from '@/lib/server/rate-limit'
import { probeAI, configuredAIProvider, aiFailureReason } from '@/lib/ai/provider'

export const maxDuration = 60
export async function GET() {
  try {
    const user = await requireUser()
    await rateLimit(`ai-health:${user.id}`,3,600)
    const provider = configuredAIProvider()
    const configured = Boolean(provider)
    let available = false
    let reason: string | undefined
    try { available = configured ? (await probeAI()).ok : false } catch (error) { reason = aiFailureReason(error) }
    return NextResponse.json({ provider,configured,available,...(reason ? { reason } : {}) },{ status:available ? 200 : 503,headers:{ 'Cache-Control':'no-store' } })
  } catch (error) { return apiError(error) }
}
