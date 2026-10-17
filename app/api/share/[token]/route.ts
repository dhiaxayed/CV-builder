import { NextResponse } from 'next/server'
import { getCVByShareToken } from '@/lib/db/cvs'
import { apiError } from '@/lib/server/api'

export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params
    const cv = /^[A-Za-z0-9_-]{16,64}$/.test(token) ? await getCVByShareToken(token) : null
    if (!cv) return NextResponse.json({ error: 'CV not found' }, { status: 404 })
    return NextResponse.json({ cv }, { headers: { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' } })
  } catch (error) { return apiError(error) }
}
