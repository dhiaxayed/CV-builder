import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getSessionUser } from '@/lib/db/users'
import { probeGroq } from '@/lib/ai/groq'

export const runtime = 'nodejs'
export const maxDuration = 60

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

    const configured = Boolean(process.env.GROQ_API_KEY?.trim())
    if (!configured) {
      return NextResponse.json(
        {
          provider: 'groq',
          configured: false,
          available: false,
          model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
          error: 'GROQ_API_KEY is missing. Add it in Vercel Environment Variables, then redeploy.',
        },
        { status: 503 }
      )
    }

    const probe = await probeGroq()

    return NextResponse.json({
      provider: 'groq',
      configured: true,
      available: probe.ok,
      model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
    })
  } catch (error) {
    console.error('[AI Health] Groq probe failed:', error)
    return NextResponse.json(
      {
        provider: 'groq',
        configured: Boolean(process.env.GROQ_API_KEY?.trim()),
        available: false,
        model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
        error: error instanceof Error ? error.message : 'Groq probe failed.',
      },
      { status: 503 }
    )
  }
}
