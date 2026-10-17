import { NextResponse } from 'next/server'
import { getUserCVs, createCV } from '@/lib/db/cvs'
import { requireUser, readJSON, apiError } from '@/lib/server/api'
import { createCVSchema } from '@/lib/validation/cv'

export async function GET() {
  try {
    const user = await requireUser()
    return NextResponse.json({ cvs: await getUserCVs(user.id) }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) { return apiError(error) }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser()
    const body = await readJSON(request, createCVSchema)
    const cv = await createCV(user.id, body.title, body.templateId, body.initialData)
    return NextResponse.json({ cv }, { status: 201 })
  } catch (error) { return apiError(error) }
}
