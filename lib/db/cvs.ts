import { supabase, isDatabaseConfigured, DbCV, DbCVVersion, CVData, emptyCV } from './index'
import { nanoid } from 'nanoid'

// ============================================
// CV QUERIES
// ============================================

export async function getUserCVs(userId: string): Promise<(DbCV & { current_version?: DbCVVersion })[]> {
  if (!supabase || !isDatabaseConfigured()) return []
  
  const { data: cvs, error } = await supabase
    .from('cvs')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
  
  if (error || !cvs) return []
  
  // Get current versions for all CVs
  const cvIds = cvs.map(cv => cv.current_version_id).filter(Boolean)
  let versions: Record<string, DbCVVersion> = {}
  
  if (cvIds.length > 0) {
    const { data: versionData } = await supabase
      .from('cv_versions')
      .select('*')
      .in('id', cvIds)
    
    if (versionData) {
      versions = Object.fromEntries(versionData.map(v => [v.id, v as DbCVVersion]))
    }
  }
  
  return cvs.map(cv => ({
    ...cv,
    view_count: cv.view_count || 0,
    current_version: cv.current_version_id ? versions[cv.current_version_id] : undefined,
  })) as (DbCV & { current_version?: DbCVVersion })[]
}

export async function getCV(cvId: string): Promise<(DbCV & { versions: DbCVVersion[] }) | null> {
  if (!supabase || !isDatabaseConfigured()) return null
  
  const { data: cv, error } = await supabase
    .from('cvs')
    .select('*')
    .eq('id', cvId)
    .single()
  
  if (error || !cv) return null
  
  const { data: versions } = await supabase
    .from('cv_versions')
    .select('*')
    .eq('cv_id', cvId)
    .order('version', { ascending: false })
  
  return {
    ...cv,
    view_count: cv.view_count || 0,
    versions: (versions || []) as DbCVVersion[],
  } as DbCV & { versions: DbCVVersion[] }
}

export async function getCVWithCurrentVersion(cvId: string): Promise<(DbCV & { current_version?: DbCVVersion }) | null> {
  if (!supabase || !isDatabaseConfigured()) return null
  
  const { data: cv, error } = await supabase
    .from('cvs')
    .select('*')
    .eq('id', cvId)
    .single()
  
  if (error || !cv) return null
  
  let currentVersion: DbCVVersion | undefined
  if (cv.current_version_id) {
    const { data: version } = await supabase
      .from('cv_versions')
      .select('*')
      .eq('id', cv.current_version_id)
      .single()
    
    if (version) currentVersion = version as DbCVVersion
  }
  
  return {
    ...cv,
    view_count: cv.view_count || 0,
    current_version: currentVersion,
  } as DbCV & { current_version?: DbCVVersion }
}

export async function getCVByShareToken(shareToken: string): Promise<(DbCV & { current_version?: DbCVVersion }) | null> {
  if (!supabase || !isDatabaseConfigured()) return null
  
  const { data: cv, error } = await supabase
    .from('cvs')
    .select('*')
    .eq('share_token', shareToken)
    .eq('is_public', true)
    .single()
  
  if (error || !cv) return null
  
  // Record the view
  try {
    await supabase.from('cv_views').insert({ id: nanoid(), cv_id: cv.id })
  } catch {
    // Ignore view tracking errors
  }
  
  let currentVersion: DbCVVersion | undefined
  if (cv.current_version_id) {
    const { data: version } = await supabase
      .from('cv_versions')
      .select('*')
      .eq('id', cv.current_version_id)
      .single()
    
    if (version) currentVersion = version as DbCVVersion
  }
  
  return {
    ...cv,
    view_count: cv.view_count || 0,
    current_version: currentVersion,
  } as DbCV & { current_version?: DbCVVersion }
}

// ============================================
// CV MUTATIONS
// ============================================

export async function createCV(
  userId: string, 
  title: string, 
  templateId: string = 'classic',
  initialData?: CVData
): Promise<DbCV & { current_version: DbCVVersion }> {
  if (!supabase || !isDatabaseConfigured()) {
    throw new Error('Database not configured')
  }
  
  const cvId = nanoid()
  const versionId = nanoid()
  const data = initialData || emptyCV
  
  // Create CV first (without current_version_id to avoid FK constraint)
  const { data: cv, error: cvError } = await supabase
    .from('cvs')
    .insert({
      id: cvId,
      user_id: userId,
      title,
      template_id: templateId,
      current_version_id: null, // Will be updated after version is created
    })
    .select()
    .single()
  
  if (cvError) throw new Error(`Failed to create CV: ${cvError.message}`)
  
  // Now create the version (CV exists, so FK constraint is satisfied)
  const { error: versionError } = await supabase
    .from('cv_versions')
    .insert({
      id: versionId,
      cv_id: cvId,
      version: 1,
      data: data,
      note: 'Initial version',
      created_by: userId,
    })
  
  if (versionError) throw new Error(`Failed to create CV version: ${versionError.message}`)
  
  // Update CV with the version ID
  const { error: updateError } = await supabase
    .from('cvs')
    .update({ current_version_id: versionId })
    .eq('id', cvId)
  
  if (updateError) throw new Error(`Failed to update CV with version: ${updateError.message}`)
  
  const { data: version } = await supabase
    .from('cv_versions')
    .select('*')
    .eq('id', versionId)
    .single()
  
  return {
    ...cv,
    current_version_id: versionId,
    current_version: version as DbCVVersion,
  } as DbCV & { current_version: DbCVVersion }
}

export async function updateCVData(cvId: string, data: CVData, latexSource?: string): Promise<DbCVVersion> {
  if (!supabase || !isDatabaseConfigured()) {
    throw new Error('Database not configured')
  }
  
  // Get current version ID
  const { data: cv, error: cvError } = await supabase
    .from('cvs')
    .select('current_version_id')
    .eq('id', cvId)
    .single()
  
  if (cvError || !cv) throw new Error('CV not found')
  
  // Update the current version data
  const { error: updateError } = await supabase
    .from('cv_versions')
    .update({ data, latex_source: latexSource || null })
    .eq('id', cv.current_version_id)
  
  if (updateError) throw new Error(`Failed to update CV data: ${updateError.message}`)
  
  // Update CV timestamp
  await supabase
    .from('cvs')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', cvId)
  
  const { data: version } = await supabase
    .from('cv_versions')
    .select('*')
    .eq('id', cv.current_version_id)
    .single()
  
  return version as DbCVVersion
}

export async function createCVVersion(
  cvId: string, 
  data: CVData, 
  note?: string,
  userId?: string
): Promise<DbCVVersion> {
  if (!supabase || !isDatabaseConfigured()) {
    throw new Error('Database not configured')
  }
  
  const versionId = nanoid()
  
  // Get next version number
  const { data: lastVersion } = await supabase
    .from('cv_versions')
    .select('version')
    .eq('cv_id', cvId)
    .order('version', { ascending: false })
    .limit(1)
    .single()
  
  const nextVersion = (lastVersion?.version || 0) + 1
  
  // Create new version
  const { error: insertError } = await supabase
    .from('cv_versions')
    .insert({
      id: versionId,
      cv_id: cvId,
      version: nextVersion,
      data,
      note: note || null,
      created_by: userId || null,
    })
  
  if (insertError) throw new Error(`Failed to create CV version: ${insertError.message}`)
  
  // Update CV to point to new version
  await supabase
    .from('cvs')
    .update({ current_version_id: versionId, updated_at: new Date().toISOString() })
    .eq('id', cvId)
  
  const { data: version } = await supabase
    .from('cv_versions')
    .select('*')
    .eq('id', versionId)
    .single()
  
  return version as DbCVVersion
}

export async function restoreCVVersion(cvId: string, versionId: string): Promise<DbCV | null> {
  if (!supabase || !isDatabaseConfigured()) return null
  
  const { data, error } = await supabase
    .from('cvs')
    .update({ current_version_id: versionId, updated_at: new Date().toISOString() })
    .eq('id', cvId)
    .select()
    .single()
  
  if (error || !data) return null
  return data as DbCV
}

export async function deleteCV(cvId: string): Promise<void> {
  if (!supabase || !isDatabaseConfigured()) return
  
  // Delete versions first (if no cascade)
  await supabase.from('cv_versions').delete().eq('cv_id', cvId)
  // Delete CV
  await supabase.from('cvs').delete().eq('id', cvId)
}

export async function duplicateCV(cvId: string, userId: string, newTitle?: string): Promise<DbCV & { current_version: DbCVVersion }> {
  const original = await getCVWithCurrentVersion(cvId)
  if (!original) throw new Error('CV not found')
  
  const title = newTitle || `${original.title} (Copy)`
  const data = original.current_version?.data || emptyCV
  
  return createCV(userId, title, original.template_id, data)
}

// ============================================
// CV SHARING
// ============================================

export async function updateCVSharing(cvId: string, isPublic: boolean): Promise<{ shareToken: string | null }> {
  if (!supabase || !isDatabaseConfigured()) {
    throw new Error('Database not configured')
  }
  
  if (isPublic) {
    const shareToken = nanoid(16)
    await supabase
      .from('cvs')
      .update({ is_public: true, share_token: shareToken, updated_at: new Date().toISOString() })
      .eq('id', cvId)
    return { shareToken }
  } else {
    await supabase
      .from('cvs')
      .update({ is_public: false, share_token: null, updated_at: new Date().toISOString() })
      .eq('id', cvId)
    return { shareToken: null }
  }
}

export async function updateCVTemplate(cvId: string, templateId: string): Promise<void> {
  if (!supabase || !isDatabaseConfigured()) return
  
  await supabase
    .from('cvs')
    .update({ template_id: templateId, updated_at: new Date().toISOString() })
    .eq('id', cvId)
}

export async function updateCVTitle(cvId: string, title: string): Promise<void> {
  if (!supabase || !isDatabaseConfigured()) return
  
  await supabase
    .from('cvs')
    .update({ title, updated_at: new Date().toISOString() })
    .eq('id', cvId)
}

export async function updateCVPhoto(cvId: string, photoUrl: string | null): Promise<void> {
  if (!supabase || !isDatabaseConfigured()) return
  
  await supabase
    .from('cvs')
    .update({ photo_url: photoUrl, updated_at: new Date().toISOString() })
    .eq('id', cvId)
}

export async function updateCVATSScore(cvId: string, score: number): Promise<void> {
  if (!supabase || !isDatabaseConfigured()) return
  
  await supabase
    .from('cvs')
    .update({ ats_score: score, updated_at: new Date().toISOString() })
    .eq('id', cvId)
}

export async function recordCVExport(cvId: string): Promise<void> {
  if (!supabase || !isDatabaseConfigured()) return
  
  await supabase
    .from('cvs')
    .update({ last_exported_at: new Date().toISOString() })
    .eq('id', cvId)
}

// ============================================
// TEMPLATES
// ============================================

export async function getTemplates(): Promise<{ 
  id: string
  name: string
  description: string | null
  category: string
  is_premium: boolean
  is_default: boolean
}[]> {
  if (!supabase || !isDatabaseConfigured()) return []
  
  const { data, error } = await supabase
    .from('templates')
    .select('id, name, description, category, is_premium, is_default')
    .order('sort_order', { ascending: true })
  
  if (error || !data) return []
  return data
}

// ============================================
// JOB DESCRIPTIONS
// ============================================

export async function saveJobDescription(
  userId: string,
  cvId: string | null,
  title: string,
  company: string | null,
  description: string,
  keywords: string[],
  matchScore: number | null
): Promise<{ id: string }> {
  if (!supabase || !isDatabaseConfigured()) {
    throw new Error('Database not configured')
  }
  
  const id = nanoid()
  const { error } = await supabase
    .from('job_descriptions')
    .insert({
      id,
      user_id: userId,
      cv_id: cvId,
      title,
      company,
      description,
      extracted_keywords: keywords,
      match_score: matchScore,
    })
  
  if (error) throw new Error(`Failed to save job description: ${error.message}`)
  return { id }
}

export async function getUserJobDescriptions(userId: string): Promise<{
  id: string
  title: string
  company: string | null
  match_score: number | null
  created_at: Date
}[]> {
  if (!supabase || !isDatabaseConfigured()) return []
  
  const { data, error } = await supabase
    .from('job_descriptions')
    .select('id, title, company, match_score, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(20)
  
  if (error || !data) return []
  return data
}

// ============================================
// ANALYTICS
// ============================================

export async function getCVAnalytics(cvId: string): Promise<{
  totalViews: number
  viewsThisWeek: number
  viewsThisMonth: number
}> {
  if (!supabase || !isDatabaseConfigured()) {
    return { totalViews: 0, viewsThisWeek: 0, viewsThisMonth: 0 }
  }
  
  const { count: totalViews } = await supabase
    .from('cv_views')
    .select('*', { count: 'exact', head: true })
    .eq('cv_id', cvId)
  
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const { count: viewsThisWeek } = await supabase
    .from('cv_views')
    .select('*', { count: 'exact', head: true })
    .eq('cv_id', cvId)
    .gt('viewed_at', weekAgo)
  
  const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const { count: viewsThisMonth } = await supabase
    .from('cv_views')
    .select('*', { count: 'exact', head: true })
    .eq('cv_id', cvId)
    .gt('viewed_at', monthAgo)
  
  return {
    totalViews: totalViews || 0,
    viewsThisWeek: viewsThisWeek || 0,
    viewsThisMonth: viewsThisMonth || 0,
  }
}
