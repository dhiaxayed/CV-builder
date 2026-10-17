import { NextResponse } from 'next/server'
import { z } from 'zod'
import { updateCVSharing } from '@/lib/db/cvs'
import { requireUser, readJSON, apiError } from '@/lib/server/api'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser()
    const { isPublic } = await readJSON(request, z.object({ isPublic: z.boolean() }).strict())
    return NextResponse.json(await updateCVSharing((await params).id, user.id, isPublic))
  } catch (error) { return apiError(error) }
}
