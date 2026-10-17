import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getCV, createCVVersion, restoreCVVersion } from '@/lib/db/cvs'
import { requireUser, readJSON, apiError } from '@/lib/server/api'
import { revisionSchema } from '@/lib/validation/cv'
import { AppError } from '@/lib/errors'

type Context = { params: Promise<{ id: string }> }
export async function GET(_request: Request, { params }: Context) {
  try {
    const user = await requireUser()
    const cv = await getCV((await params).id, user.id)
    if (!cv) throw new AppError(404, 'CV_NOT_FOUND', 'CV not found')
    return NextResponse.json({ cv }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) { return apiError(error) }
}

export async function POST(request: Request, { params }: Context) {
  try {
    const user = await requireUser()
    const body = await readJSON(request, z.object({ expectedRevision: revisionSchema, note: z.string().max(500).optional() }).strict())
    const result = await createCVVersion((await params).id, user.id, body.expectedRevision, body.note)
    return NextResponse.json(result, { status: 201 })
  } catch (error) { return apiError(error) }
}

export async function PUT(request: Request, { params }: Context) {
  try {
    const user = await requireUser()
    const body = await readJSON(request, z.object({ versionId: z.string().min(1).max(100), expectedRevision: revisionSchema }).strict())
    const cv = await restoreCVVersion((await params).id, user.id, body.versionId, body.expectedRevision)
    return NextResponse.json({ cv })
  } catch (error) { return apiError(error) }
}
