import { NextResponse } from 'next/server'
import { nanoid } from 'nanoid'
import sharp from 'sharp'
import { requireDatabase } from '@/lib/db'
import { getCVWithCurrentVersion } from '@/lib/db/cvs'
import { requireUser, assertSameOrigin, apiError } from '@/lib/server/api'
import { rateLimit } from '@/lib/server/rate-limit'
import { AppError, databaseError } from '@/lib/errors'
import { imageSignature, MAX_PHOTO_BYTES } from '@/lib/photos'
import { usesLegacySchema } from '@/lib/db/schema'
import { savePhoto } from '@/lib/db/legacy-cvs'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  try {
    assertSameOrigin(request)
    const user = await requireUser()
    await rateLimit(`upload:${user.id}`, 20, 3600)
    if (Number(request.headers.get('content-length') || 0) > MAX_PHOTO_BYTES + 16384) throw new AppError(413, 'FILE_TOO_LARGE', 'Maximum photo size is 4 MB.')
    // Bound the multipart stream even when Content-Length is missing or false.
    const reader = request.body?.getReader()
    if (!reader) throw new AppError(400, 'INVALID_PHOTO', 'Choose a photo.')
    const chunks: Uint8Array[] = []
    let bytes = 0
    for (;;) {
      const { value, done } = await reader.read()
      if (done) break
      bytes += value.byteLength
      if (bytes > MAX_PHOTO_BYTES + 16384) { await reader.cancel(); throw new AppError(413, 'FILE_TOO_LARGE', 'Maximum photo size is 4 MB.') }
      chunks.push(value)
    }
    let form: FormData
    try {
      form = await new Request(request.url, { method: 'POST', headers: { 'Content-Type': request.headers.get('content-type') || '' }, body: Buffer.concat(chunks) }).formData()
    } catch { throw new AppError(400, 'INVALID_FORM', 'Send a valid photo upload form.') }
    const target = form.get('target')
    const cvId = form.get('cvId')
    const revision = Number(form.get('expectedRevision'))
    if (target !== 'profile' && target !== 'cv') throw new AppError(400, 'INVALID_TARGET', 'Choose a valid photo target.')
    if (target === 'cv') {
      if (typeof cvId !== 'string' || !cvId || cvId.length > 100 || !form.has('expectedRevision') || !Number.isSafeInteger(revision) || revision < 0) throw new AppError(400, 'INVALID_TARGET', 'A CV and revision are required.')
      const cv = await getCVWithCurrentVersion(cvId, user.id)
      if (!cv) throw new AppError(404, 'CV_NOT_FOUND', 'CV not found')
      if (cv.revision !== revision) throw new AppError(409, 'REVISION_CONFLICT', 'This CV changed. Save or reload before uploading a photo.')
    }
    const file = form.get('photo')
    if (!(file instanceof File) || file.size === 0) throw new AppError(400, 'INVALID_PHOTO', 'Choose a JPEG, PNG, or WebP photo under 4 MB.')
    if (file.size > MAX_PHOTO_BYTES) throw new AppError(413, 'FILE_TOO_LARGE', 'Maximum photo size is 4 MB.')
    const buffer = Buffer.from(await file.arrayBuffer())
    const format = imageSignature(buffer)
    if (!format || file.type !== `image/${format}`) throw new AppError(400, 'INVALID_PHOTO', 'The photo signature must match its JPEG, PNG, or WebP type.')
    let optimized: Buffer
    try {
      const image = sharp(buffer, { animated: false, limitInputPixels: 16000000, failOn: 'warning' })
      const meta = await image.metadata()
      if ((meta.pages || 1) > 1 || !meta.width || !meta.height || meta.width > 8000 || meta.height > 8000) throw new Error('Dimensions')
      optimized = await image.rotate().resize({ width: 512, height: 512, fit: 'inside', withoutEnlargement: true }).webp({ quality: 82 }).toBuffer()
    } catch { throw new AppError(400, 'INVALID_PHOTO', 'The image is malformed, animated, or exceeds 16 megapixels.') }
    const dataUrl = `data:image/webp;base64,${optimized.toString('base64')}`
    const fileId = nanoid()
    const fileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_').slice(0, 200)
    if (await usesLegacySchema()) {
      return NextResponse.json({ success: true, ...await savePhoto(user.id, target, target === 'cv' ? cvId as string : null, revision, { id: fileId, dataUrl, name: fileName, size: optimized.length }) })
    }
    const { data, error } = await requireDatabase().rpc('save_photo', {
      p_user_id: user.id, p_target: target, p_cv_id: target === 'cv' ? cvId : null,
      p_expected_revision: target === 'cv' ? revision : null, p_file_id: fileId,
      p_data_url: dataUrl,
      p_name: fileName, p_size: optimized.length,
    })
    if (error) databaseError(error)
    if (!data) throw new AppError(503, 'PERSISTENCE_FAILED', 'Photo persistence was not confirmed.')
    return NextResponse.json({ success: true, ...data })
  } catch (error) { return apiError(error) }
}
