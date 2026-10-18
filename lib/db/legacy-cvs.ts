import 'server-only'
import { nanoid } from 'nanoid'
import { createHash } from 'node:crypto'
import { requireDatabase, createEmptyCVData, type CVData, type DbCV, type DbCVVersion } from './index'
import { AppError, databaseError } from '@/lib/errors'
import { cvDataSchema } from '@/lib/validation/cv'
import { resolveTemplateId } from '@/lib/templates'

type LegacyRow = Omit<DbCV, 'revision' | 'draft_data'>
type Metadata = { revision?: number; title?: string; templateId?: string; originalTemplateId?: string }
type LegacyVersion = Omit<DbCVVersion, 'template_id'>

// The existing schema already has JSON versions. Reserve 0 for the mutable
// draft and -1 for the public copy; numbered historical snapshots stay intact.
function metadata(value: unknown): Metadata {
  if (!value || typeof value !== 'object' || !('_cvBuilder' in value)) return {}
  const meta = value._cvBuilder
  if (!meta || typeof meta !== 'object') return {}
  const fields = meta as Record<string, unknown>
  return {
    revision: typeof fields.revision === 'number' ? fields.revision : undefined,
    title: typeof fields.title === 'string' ? fields.title : undefined,
    templateId: typeof fields.templateId === 'string' ? fields.templateId : undefined,
    originalTemplateId: typeof fields.originalTemplateId === 'string' ? fields.originalTemplateId : undefined,
  }
}
const storedData = (data: CVData, meta: Metadata) => ({ ...data, _cvBuilder: meta })
export const templateForVersion = (data: unknown, fallback: string) => resolveTemplateId(metadata(data).templateId || fallback)
const conflict = () => new AppError(409, 'REVISION_CONFLICT', 'This CV changed in another tab. Reload before saving again.')

async function ownedRow(cvId: string, userId: string) {
  const { data, error } = await requireDatabase().from('cvs').select('*').eq('id', cvId).eq('user_id', userId).maybeSingle()
  if (error) databaseError(error)
  return data as LegacyRow | null
}

async function state(row: LegacyRow) {
  const db = requireDatabase()
  const { data: draft, error } = await db.from('cv_versions').select('*').eq('cv_id', row.id).eq('version', 0).maybeSingle()
  if (error) databaseError(error)
  let source: LegacyVersion | null = draft
  if (!source && row.current_version_id) {
    const result = await db.from('cv_versions').select('*').eq('id', row.current_version_id).eq('cv_id', row.id).maybeSingle()
    if (result.error) databaseError(result.error)
    source = result.data
  }
  const data = cvDataSchema.parse(source?.data || createEmptyCVData())
  if (!draft && !data.basics.photoUrl && row.photo_url) data.basics.photoUrl = row.photo_url
  const meta = metadata(source?.data)
  const cv: DbCV = {
    ...row, draft_data: data, title: meta.title ?? row.title,
    template_id: templateForVersion(source?.data, row.template_id),
    current_version_id: row.current_version_id,
    photo_url: data.basics.photoUrl || null,
    revision: draft && Number.isSafeInteger(meta.revision) && meta.revision! >= 0 ? meta.revision! : 0,
  }
  return { cv, draft: draft as LegacyVersion | null }
}

export async function getCV(cvId: string, userId: string): Promise<DbCV | null> {
  const row = await ownedRow(cvId, userId)
  return row ? (await state(row)).cv : null
}

export async function getCVHistory(cvId: string, userId: string) {
  const row = await ownedRow(cvId, userId)
  if (!row) return null
  const current = await state(row)
  const fallback = metadata(current.draft?.data).originalTemplateId || row.template_id
  const { data, error } = await requireDatabase().from('cv_versions').select('*').eq('cv_id', cvId).gt('version', 0).order('version', { ascending: false })
  if (error) databaseError(error)
  return { ...current.cv, versions: (data || []).map(version => ({ ...version, template_id: templateForVersion(version.data, fallback), data: cvDataSchema.parse(version.data) })) as DbCVVersion[] }
}

export async function getUserCVs(userId: string) {
  const { data, error } = await requireDatabase().from('cvs').select('*').eq('user_id', userId).order('updated_at', { ascending: false })
  if (error) databaseError(error)
  return Promise.all((data || []).map(async row => {
    const { cv } = await state(row as LegacyRow)
    const { draft_data, ...summary } = cv
    return { ...summary, draft_name: draft_data.basics.name || null, draft_title: draft_data.basics.title || null }
  }))
}

async function writePublished(cv: DbCV, keepExisting: boolean) {
  const db = requireDatabase()
  const { data: existing, error: readError } = await db.from('cv_versions').select('id').eq('cv_id', cv.id).eq('version', -1).maybeSingle()
  if (readError) databaseError(readError)
  if (keepExisting && existing) return
  const { error } = await db.from('cv_versions').upsert({
    id: existing?.id || nanoid(), cv_id: cv.id, version: -1, created_by: cv.user_id,
    data: storedData(cv.draft_data, { title: cv.title, templateId: cv.template_id }), note: 'Published copy',
  }, { onConflict: 'cv_id,version', ignoreDuplicates: keepExisting })
  if (error) databaseError(error)
}

export async function getPublishedCV(token: string) {
  const db = requireDatabase()
  const { data: row, error } = await db.from('cvs').select('*').eq('share_token', token).eq('is_public', true).maybeSingle()
  if (error) databaseError(error)
  if (!row) return null
  const { data: published, error: publishedError } = await db.from('cv_versions').select('data').eq('cv_id', row.id).eq('version', -1).maybeSingle()
  if (publishedError) databaseError(publishedError)
  if (published) return {
    title: metadata(published.data).title ?? row.title as string,
    template_id: templateForVersion(published.data, row.template_id), data: cvDataSchema.parse(published.data),
  }
  // Existing public links retain their original behavior until the first edit
  // or publish operation freezes their current contents into the public copy.
  const { cv } = await state(row as LegacyRow)
  return { title: cv.title, template_id: cv.template_id, data: cv.draft_data }
}

export async function createCV(userId: string, title: string, templateId: string, data: CVData): Promise<DbCV> {
  const db = requireDatabase()
  const { data: owner, error: ownerError } = await db.from('users').select('email,plan_tier,preferences').eq('id', userId).maybeSingle()
  if (ownerError) databaseError(ownerError)
  if (!owner) throw new AppError(404, 'CV_NOT_FOUND', 'Account not found')
  const free = owner.plan_tier !== 'pro' && owner.preferences?.tier !== 'pro'
  let creationLock: string | undefined
  if (free) {
    // Reserve a short-lived Free creation slot using existing token uniqueness.
    // This non-login token expires if an interrupted request dies.
    const token = `cv-create:${createHash('sha256').update(userId).digest('hex')}`
    const expired = await db.from('auth_tokens').delete().eq('token', token).eq('type', 'cv_creation_lock').lt('expires_at', new Date().toISOString())
    if (expired.error) databaseError(expired.error)
    creationLock = nanoid()
    const lock = await db.from('auth_tokens').insert({ id: creationLock, user_id: userId, email: owner.email, token, type: 'cv_creation_lock', expires_at: new Date(Date.now() + 60000).toISOString() })
    if (lock.error?.code === '23505') throw new AppError(403, 'FREE_TIER_CV_LIMIT', 'Another CV creation is already in progress.')
    if (lock.error) databaseError(lock.error)
  }
  try {
    if (free) {
      const { data: existing, error } = await db.from('cvs').select('id').eq('user_id', userId).limit(1)
      if (error) databaseError(error)
      if (existing?.length) throw new AppError(403, 'FREE_TIER_CV_LIMIT', 'The Free plan allows one CV. Contact us to upgrade to Pro.')
    }
    const id = nanoid(), draftId = nanoid(), initialVersionId = nanoid()
    const { data: row, error } = await db.from('cvs').insert({ id, user_id: userId, title, template_id: templateId }).select('*').single()
    if (error) databaseError(error)
    try {
      const packed = storedData(data, { revision: 0, title, templateId, originalTemplateId: templateId })
      const versions = await db.from('cv_versions').insert([
        { id: initialVersionId, cv_id: id, version: 1, data: packed, note: 'Initial version', created_by: userId },
        { id: draftId, cv_id: id, version: 0, data: packed, note: 'Working draft', created_by: userId },
      ])
      if (versions.error) databaseError(versions.error)
      const linked = await db.from('cvs').update({ current_version_id: initialVersionId, photo_url: data.basics.photoUrl || null }).eq('id', id).eq('user_id', userId)
      if (linked.error) databaseError(linked.error)
    } catch (failure) {
      // Compensate only this new CV when its initial versions could not persist.
      await db.from('cvs').delete().eq('id', id).eq('user_id', userId)
      throw failure
    }
    return { ...row, current_version_id: initialVersionId, draft_data: data, revision: 0, photo_url: data.basics.photoUrl || null } as DbCV
  } finally {
    if (creationLock) await db.from('auth_tokens').delete().eq('id', creationLock).eq('user_id', userId).eq('type', 'cv_creation_lock')
  }
}

export async function updateCV(cvId: string, userId: string, expectedRevision: number, updates: { data?: CVData; title?: string; templateId?: string }): Promise<DbCV> {
  const row = await ownedRow(cvId, userId)
  if (!row) throw new AppError(404, 'CV_NOT_FOUND', 'CV not found')
  const { cv, draft } = await state(row)
  if (cv.revision !== expectedRevision) throw conflict()
  if (cv.is_public && cv.share_token) await writePublished(cv, true)
  const data = updates.data || cv.draft_data
  const title = updates.title ?? cv.title, templateId = updates.templateId ?? cv.template_id
  const revision = expectedRevision + 1
  const packed = storedData(data, { revision, title, templateId, originalTemplateId: metadata(draft?.data).originalTemplateId || cv.template_id })
  const db = requireDatabase()
  const result = draft
    ? await db.from('cv_versions').update({ data: packed }).eq('id', draft.id).eq('cv_id', cvId)
      .eq('data->_cvBuilder->>revision', String(expectedRevision)).select('id').maybeSingle()
    : await db.from('cv_versions').insert({ id: nanoid(), cv_id: cvId, version: 0, data: packed, note: 'Working draft', created_by: userId }).select('id').maybeSingle()
  if (result.error?.code === '23505') throw conflict()
  if (result.error) databaseError(result.error)
  if (!result.data) throw conflict()
  const metadataResult = await db.from('cvs').update({ title, template_id: templateId, photo_url: data.basics.photoUrl || null })
    .eq('id', cvId).eq('user_id', userId).select('updated_at').maybeSingle()
  if (metadataResult.error) databaseError(metadataResult.error)
  if (!metadataResult.data) throw new AppError(404, 'CV_NOT_FOUND', 'CV not found')
  return { ...cv, title, template_id: templateId, draft_data: data, revision, photo_url: data.basics.photoUrl || null, updated_at: metadataResult.data.updated_at }
}

export async function snapshotCV(cvId: string, userId: string, expectedRevision: number, note?: string) {
  const cv = await updateCV(cvId, userId, expectedRevision, {})
  const db = requireDatabase()
  for (let attempt = 0; attempt < 3; attempt++) {
    const latest = await db.from('cv_versions').select('version').eq('cv_id', cvId).gt('version', 0).order('version', { ascending: false }).limit(1).maybeSingle()
    if (latest.error) databaseError(latest.error)
    const result = await db.from('cv_versions').insert({
      id: nanoid(), cv_id: cvId, version: (latest.data?.version || 0) + 1, created_by: userId, note: note || null,
      data: storedData(cv.draft_data, { title: cv.title, templateId: cv.template_id }),
    }).select('*').single()
    if (result.error?.code === '23505') continue
    if (result.error) databaseError(result.error)
    const linked = await db.from('cvs').update({ current_version_id: result.data.id }).eq('id', cvId).eq('user_id', userId)
    if (linked.error) databaseError(linked.error)
    return { version: { ...result.data, template_id: cv.template_id, data: cv.draft_data } as DbCVVersion, revision: cv.revision }
  }
  throw conflict()
}

export async function restoreCV(cvId: string, userId: string, versionId: string, expectedRevision: number) {
  const row = await ownedRow(cvId, userId)
  if (!row) throw new AppError(404, 'CV_NOT_FOUND', 'CV not found')
  const { data, error } = await requireDatabase().from('cv_versions').select('*').eq('id', versionId).eq('cv_id', cvId).gt('version', 0).maybeSingle()
  if (error) databaseError(error)
  if (!data) throw new AppError(404, 'VERSION_NOT_FOUND', 'Version not found for this CV')
  const current = await state(row)
  const fallback = metadata(current.draft?.data).originalTemplateId || current.cv.template_id
  const restored = await updateCV(cvId, userId, expectedRevision, { data: cvDataSchema.parse(data.data), templateId: templateForVersion(data.data, fallback) })
  const linked = await requireDatabase().from('cvs').update({ current_version_id: versionId }).eq('id', cvId).eq('user_id', userId)
  if (linked.error) databaseError(linked.error)
  return { ...restored, current_version_id: versionId }
}

export async function publishCV(cvId: string, userId: string, isPublic: boolean) {
  const cv = await getCV(cvId, userId)
  if (!cv) throw new AppError(404, 'CV_NOT_FOUND', 'CV not found')
  if (isPublic && cv.is_public && cv.share_token) {
    await writePublished(cv, true)
    return { shareToken: cv.share_token }
  }
  if (isPublic) await writePublished(cv, false)
  const shareToken = isPublic ? nanoid(32) : null
  const { error } = await requireDatabase().from('cvs').update({ is_public: isPublic, share_token: shareToken }).eq('id', cvId).eq('user_id', userId)
  if (error) databaseError(error)
  return { shareToken }
}

export async function savePhoto(userId: string, target: 'cv' | 'profile', cvId: string | null, revision: number, file: { id: string; dataUrl: string; name: string; size: number }) {
  const db = requireDatabase()
  const photoUrl = `/api/photos/${file.id}`
  const inserted = await db.from('uploaded_files').insert({ id: file.id, user_id: userId, file_type: 'photo', file_name: file.name, file_size: file.size, mime_type: 'image/webp', storage_url: file.dataUrl, storage_provider: 'database' })
  if (inserted.error) databaseError(inserted.error)
  try {
    if (target === 'cv') {
      const cv = await getCV(cvId!, userId)
      if (!cv) throw new AppError(404, 'CV_NOT_FOUND', 'CV not found')
      const data = { ...cv.draft_data, basics: { ...cv.draft_data.basics, photoUrl } }
      const saved = await updateCV(cv.id, userId, revision, { data })
      return { url: photoUrl, revision: saved.revision }
    }
    const { error } = await db.from('users').update({ photo_url: photoUrl }).eq('id', userId)
    if (error) databaseError(error)
    return { url: photoUrl }
  } catch (error) {
    // A rejected revision is safe to compensate. Other failures can be
    // ambiguous after the draft write, so retain the asset in that case.
    if (error instanceof AppError && error.code === 'REVISION_CONFLICT') {
      await db.from('uploaded_files').delete().eq('id', file.id).eq('user_id', userId)
    }
    throw error
  }
}

export async function photoIsPublished(photoUrl: string) {
  const db = requireDatabase()
  const { data, error } = await db.from('cv_versions').select('id,cv_id,version').eq('data->basics->>photoUrl', photoUrl)
  if (error) databaseError(error)
  for (const version of data || []) {
    if (version.version !== -1 && version.version < 1) continue
    let query = db.from('cvs').select('id').eq('id', version.cv_id).eq('is_public', true)
    if (version.version !== -1) {
      const frozen = await db.from('cv_versions').select('id').eq('cv_id', version.cv_id).eq('version', -1).maybeSingle()
      if (frozen.error) databaseError(frozen.error)
      if (frozen.data) continue
      query = query.eq('current_version_id', version.id)
    }
    const result = await query.limit(1)
    if (result.error) databaseError(result.error)
    if (result.data?.length) return true
  }
  return false
}
