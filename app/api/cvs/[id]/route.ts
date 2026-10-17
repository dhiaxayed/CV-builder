import { NextResponse } from 'next/server'
import { getCVWithCurrentVersion, updateCVData, deleteCV } from '@/lib/db/cvs'
import { requireUser, readJSON, apiError, assertSameOrigin } from '@/lib/server/api'
import { updateCVSchema } from '@/lib/validation/cv'
import { AppError } from '@/lib/errors'

type Context = { params: Promise<{ id: string }> }

export async function GET(_request: Request, { params }: Context) {
  try {
    const user = await requireUser()
    const { id } = await params
    const cv = await getCVWithCurrentVersion(id, user.id)
    if (!cv) throw new AppError(404, 'CV_NOT_FOUND', 'CV not found')
    return NextResponse.json({ cv: { ...cv, data: cv.draft_data } }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) { return apiError(error) }
}

export async function PUT(request: Request, { params }: Context) {
  try {
    const user = await requireUser()
    const { id } = await params
    const { expectedRevision, ...updates } = await readJSON(request, updateCVSchema)
    const cv = await updateCVData(id, user.id, expectedRevision, updates)
    return NextResponse.json({ revision: cv.revision, updatedAt: cv.updated_at }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) { return apiError(error) }
}

export async function DELETE(request: Request, { params }: Context) {
  try {
    assertSameOrigin(request)
    const user = await requireUser()
    await deleteCV((await params).id, user.id)
    return NextResponse.json({ success: true })
  } catch (error) { return apiError(error) }
}
