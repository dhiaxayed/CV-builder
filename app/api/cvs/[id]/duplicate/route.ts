import { NextResponse } from 'next/server'
import { z } from 'zod'
import { duplicateCV } from '@/lib/db/cvs'
import { requireUser, readJSON, apiError } from '@/lib/server/api'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser()
    const body = await readJSON(request, z.object({ title: z.string().trim().min(1).max(255).optional() }).strict())
    const cv = await duplicateCV((await params).id, user.id, body.title)
    return NextResponse.json({ cv }, { status: 201 })
  } catch (error) { return apiError(error) }
}
