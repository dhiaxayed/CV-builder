import { NextResponse } from 'next/server'
import { requireDatabase } from '@/lib/db'
import { getCVByShareToken } from '@/lib/db/cvs'
import { renderCV } from '@/lib/pdf/render'
import { apiError } from '@/lib/server/api'
import { rateLimit, clientAddress } from '@/lib/server/rate-limit'
import { databaseError, AppError } from '@/lib/errors'

export const runtime = 'nodejs'
export const maxDuration = 300
export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params
    const cv = /^[A-Za-z0-9_-]{16,64}$/.test(token) ? await getCVByShareToken(token) : null
    if (!cv) throw new AppError(404,'CV_NOT_FOUND','CV not found')
    await rateLimit(`public-pdf:${clientAddress(request)}`,30,600)
    let photo = cv.data.basics.photoUrl
    const id = photo?.match(/^\/api\/photos\/([A-Za-z0-9_-]+)$/)?.[1]
    if (id) {
      const { data, error } = await requireDatabase().from('uploaded_files').select('storage_url').eq('id',id).eq('file_type','photo').maybeSingle()
      if (error) databaseError(error)
      if (!data) throw new AppError(422,'INVALID_PHOTO','The published photo is unavailable.')
      photo = data.storage_url
    }
    const pageMode = new URL(request.url).searchParams.get('pageMode') === 'multi-page' ? 'multi-page' : 'one-page'
    const rendered = await renderCV(cv.data,cv.template_id,pageMode,photo)
    // Recheck revocation after the expensive render, even if a cached PDF was used.
    if (!await getCVByShareToken(token)) throw new AppError(404,'CV_NOT_FOUND','CV not found')
    return new NextResponse(Buffer.from(rendered.bytes),{ headers:{ 'Content-Type':'application/pdf','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','X-Robots-Tag':'noindex','X-CV-PDF-Pages':String(rendered.pages) } })
  } catch (error) { return apiError(error) }
}
