import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getSessionUser } from '@/lib/db/users'
import { requireDatabase } from '@/lib/db'
import { apiError } from '@/lib/server/api'
import { databaseError } from '@/lib/errors'
import { usesLegacySchema } from '@/lib/db/schema'
import { photoIsPublished } from '@/lib/db/legacy-cvs'

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    if (!/^[A-Za-z0-9_-]{10,100}$/.test(id)) return new NextResponse(null, { status: 404 })
    const db = requireDatabase()
    const { data: file, error } = await db.from('uploaded_files').select('user_id,storage_url,mime_type').eq('id', id).eq('file_type', 'photo').maybeSingle()
    if (error) databaseError(error)
    if (!file) return new NextResponse(null, { status: 404 })
    const token = (await cookies()).get('session')?.value
    const user = token ? await getSessionUser(token) : null
    if (user?.id !== file.user_id) {
      if (await usesLegacySchema()) {
        if (!await photoIsPublished(`/api/photos/${id}`)) return new NextResponse(null, { status: 404 })
      } else {
        const { data: published, error: shareError } = await db.from('cvs').select('id').eq('is_public', true).eq('published_data->basics->>photoUrl', `/api/photos/${id}`).limit(1)
        if (shareError) databaseError(shareError)
        if (!published?.length) return new NextResponse(null, { status: 404 })
      }
    }
    const source = String(file.storage_url)
    if (!source.startsWith('data:image/webp;base64,')) return new NextResponse(null, { status: 404 })
    return new NextResponse(Buffer.from(source.split(',')[1], 'base64'), { headers: { 'Content-Type': 'image/webp', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } })
  } catch (error) { return apiError(error) }
}
