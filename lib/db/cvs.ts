import 'server-only'
import { requireDatabase, type DbCV, type DbCVVersion, type CVData, createEmptyCVData } from './index'
import { nanoid } from 'nanoid'
import { AppError, databaseError } from '@/lib/errors'
import { photoDataForOwner } from '@/lib/server/photo-data'
import { cvDataSchema } from '@/lib/validation/cv'

export async function getUserCVs(userId: string): Promise<Array<Omit<DbCV, 'draft_data'> & { draft_name: string | null; draft_title: string | null }>> {
  const { data, error } = await requireDatabase().from('cvs')
    .select('id,user_id,title,template_id,current_version_id,revision,is_public,share_token,photo_url,ats_score,view_count,last_exported_at,created_at,updated_at,draft_name:draft_data->basics->>name,draft_title:draft_data->basics->>title')
    .eq('user_id', userId).order('updated_at', { ascending: false })
  if (error) databaseError(error)
  return data
}

// Ownership is part of every private read, including reads used by exports and AI.
export async function getCVWithCurrentVersion(cvId: string, userId: string): Promise<DbCV | null> {
  const { data, error } = await requireDatabase().from('cvs').select('*').eq('id', cvId).eq('user_id', userId).maybeSingle()
  if (error) databaseError(error)
  if (!data) return null
  return { ...data, draft_data: cvDataSchema.parse(data.draft_data) } as DbCV
}

export async function getCV(cvId: string, userId: string): Promise<(DbCV & { versions: DbCVVersion[] }) | null> {
  const cv = await getCVWithCurrentVersion(cvId, userId)
  if (!cv) return null
  const { data, error } = await requireDatabase().from('cv_versions').select('*').eq('cv_id', cvId).order('version', { ascending: false })
  if (error) databaseError(error)
  return { ...cv, versions: (data || []).map(version => ({ ...version, data: cvDataSchema.parse(version.data) })) as DbCVVersion[] }
}

export async function getCVByShareToken(token: string) {
  const { data, error } = await requireDatabase().from('cvs')
    .select('published_title,published_template_id,published_data').eq('share_token', token).eq('is_public', true).maybeSingle()
  if (error) databaseError(error)
  if (!data?.published_data) return null
  return { title: data.published_title as string, template_id: data.published_template_id as string, data: cvDataSchema.parse(data.published_data) }
}

export async function createCV(userId: string, title: string, templateId = 'modern', initialData?: CVData): Promise<DbCV> {
  if (initialData) await photoDataForOwner(initialData.basics.photoUrl, userId)
  const { data, error } = await requireDatabase().rpc('create_cv_atomic', {
    p_user_id: userId, p_title: title, p_template_id: templateId, p_data: initialData || createEmptyCVData(),
  })
  if (error) databaseError(error)
  if (!data) throw new AppError(503, 'PERSISTENCE_FAILED', 'CV creation was not confirmed.')
  return data as DbCV
}

export async function updateCVData(cvId: string, userId: string, expectedRevision: number, updates: { data?: CVData; title?: string; templateId?: string }): Promise<DbCV> {
  if (updates.data) await photoDataForOwner(updates.data.basics.photoUrl, userId)
  const { data, error } = await requireDatabase().rpc('save_cv_draft', {
    p_cv_id: cvId, p_user_id: userId, p_expected_revision: expectedRevision,
    p_data: updates.data ?? null, p_title: updates.title ?? null, p_template_id: updates.templateId ?? null,
  })
  if (error) databaseError(error)
  if (!data) throw new AppError(503, 'PERSISTENCE_FAILED', 'Saving was not confirmed.')
  return data as DbCV
}

export async function createCVVersion(cvId: string, userId: string, expectedRevision: number, note?: string): Promise<{ version: DbCVVersion; revision: number }> {
  const { data, error } = await requireDatabase().rpc('snapshot_cv', { p_cv_id: cvId, p_user_id: userId, p_expected_revision: expectedRevision, p_note: note || null })
  if (error) databaseError(error)
  if (!data) throw new AppError(503, 'PERSISTENCE_FAILED', 'Snapshot creation was not confirmed.')
  return data
}

export async function restoreCVVersion(cvId: string, userId: string, versionId: string, expectedRevision: number): Promise<DbCV> {
  const { data, error } = await requireDatabase().rpc('restore_cv', { p_cv_id: cvId, p_user_id: userId, p_version_id: versionId, p_expected_revision: expectedRevision })
  if (error) databaseError(error)
  if (!data) throw new AppError(503, 'PERSISTENCE_FAILED', 'Restoration was not confirmed.')
  return data as DbCV
}

export async function deleteCV(cvId: string, userId: string): Promise<void> {
  const { data, error } = await requireDatabase().from('cvs').delete().eq('id', cvId).eq('user_id', userId).select('id').maybeSingle()
  if (error) databaseError(error)
  if (!data) throw new AppError(404, 'CV_NOT_FOUND', 'CV not found')
}

export async function duplicateCV(cvId: string, userId: string, newTitle?: string): Promise<DbCV> {
  const original = await getCVWithCurrentVersion(cvId, userId)
  if (!original) throw new AppError(404, 'CV_NOT_FOUND', 'CV not found')
  return createCV(userId, newTitle || `${original.title.slice(0, 248)} (Copy)`, original.template_id, original.draft_data)
}

export async function updateCVSharing(cvId: string, userId: string, isPublic: boolean) {
  const { data, error } = await requireDatabase().rpc('publish_cv', { p_cv_id: cvId, p_user_id: userId, p_is_public: isPublic, p_token: nanoid(32) })
  if (error) databaseError(error)
  return { shareToken: data as string | null }
}

async function updateMetadata(cvId: string, userId: string, updates: Record<string, unknown>) {
  const { data, error } = await requireDatabase().from('cvs').update(updates).eq('id', cvId).eq('user_id', userId).select('id').maybeSingle()
  if (error) databaseError(error)
  if (!data) throw new AppError(404, 'CV_NOT_FOUND', 'CV not found')
}
export const recordCVExport = (cvId: string, userId: string) => updateMetadata(cvId, userId, { last_exported_at: new Date().toISOString() })

export async function saveJobDescription(userId: string, cvId: string | null, title: string, company: string | null, description: string, keywords: string[], matchScore: number) {
  if (cvId && !await getCVWithCurrentVersion(cvId, userId)) throw new AppError(404, 'CV_NOT_FOUND', 'CV not found')
  const id = nanoid()
  const { error } = await requireDatabase().from('job_descriptions').insert({ id, user_id: userId, cv_id: cvId, title, company, description, extracted_keywords: keywords, match_score: matchScore })
  if (error) databaseError(error)
  return { id }
}

export async function getUserJobDescriptions(userId: string) {
  const { data, error } = await requireDatabase().from('job_descriptions').select('id,title,company,match_score,created_at').eq('user_id', userId).order('created_at', { ascending: false }).limit(20)
  if (error) databaseError(error)
  return data || []
}
