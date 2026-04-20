import { CV, CVVersion, User, CVData, createEmptyCVData, Template } from './types/cv'

// Re-export types for convenience
export type { CV, CVVersion, User, CVData, Template }
export { createEmptyCVData }

const STORAGE_KEYS = {
  USER: 'cv_builder_user',
  CVS: 'cv_builder_cvs',
  TEMPLATES: 'cv_builder_templates',
}

// User management
export function getUser(): User | null {
  if (typeof window === 'undefined') return null
  const data = localStorage.getItem(STORAGE_KEYS.USER)
  return data ? JSON.parse(data) : null
}

export function setUser(user: User): void {
  localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user))
}

export function clearUser(): void {
  localStorage.removeItem(STORAGE_KEYS.USER)
}

export function createUser(email: string, name: string): User {
  const user: User = {
    id: generateId(),
    email,
    name,
    createdAt: new Date().toISOString(),
  }
  setUser(user)
  return user
}

// CV management
export function getCVs(): CV[] {
  if (typeof window === 'undefined') return []
  const data = localStorage.getItem(STORAGE_KEYS.CVS)
  return data ? JSON.parse(data) : []
}

export function saveCVs(cvs: CV[]): void {
  localStorage.setItem(STORAGE_KEYS.CVS, JSON.stringify(cvs))
}

export function getCV(id: string): CV | null {
  const cvs = getCVs()
  return cvs.find(cv => cv.id === id) || null
}

export function createCV(userId: string, title: string, templateId: string, data: CVData): CV {
  const cvs = getCVs()
  const versionId = generateId()
  const cvId = generateId()
  
  const version: CVVersion = {
    id: versionId,
    cvId,
    version: 1,
    data,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  
  const cv: CV = {
    id: cvId,
    userId,
    title,
    templateId,
    currentVersionId: versionId,
    versions: [version],
    isPublic: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  
  cvs.push(cv)
  saveCVs(cvs)
  return cv
}

export function updateCV(id: string, updates: Partial<CV>): CV | null {
  const cvs = getCVs()
  const index = cvs.findIndex(cv => cv.id === id)
  if (index === -1) return null
  
  cvs[index] = {
    ...cvs[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  }
  
  saveCVs(cvs)
  return cvs[index]
}

export function deleteCV(id: string): boolean {
  const cvs = getCVs()
  const filtered = cvs.filter(cv => cv.id !== id)
  if (filtered.length === cvs.length) return false
  saveCVs(filtered)
  return true
}

export function duplicateCV(id: string, newTitle: string): CV | null {
  const original = getCV(id)
  if (!original) return null
  
  const cvs = getCVs()
  const newCvId = generateId()
  const newVersionId = generateId()
  
  const currentVersion = original.versions.find(v => v.id === original.currentVersionId)
  if (!currentVersion) return null
  
  const newVersion: CVVersion = {
    id: newVersionId,
    cvId: newCvId,
    version: 1,
    data: JSON.parse(JSON.stringify(currentVersion.data)),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  
  const newCv: CV = {
    id: newCvId,
    userId: original.userId,
    title: newTitle,
    templateId: original.templateId,
    currentVersionId: newVersionId,
    versions: [newVersion],
    isPublic: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  
  cvs.push(newCv)
  saveCVs(cvs)
  return newCv
}

// Version management
export function createVersion(cvId: string, data: CVData, note?: string): CVVersion | null {
  const cvs = getCVs()
  const cvIndex = cvs.findIndex(cv => cv.id === cvId)
  if (cvIndex === -1) return null
  
  const cv = cvs[cvIndex]
  const maxVersion = Math.max(...cv.versions.map(v => v.version), 0)
  
  const newVersion: CVVersion = {
    id: generateId(),
    cvId,
    version: maxVersion + 1,
    data,
    note,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  
  cv.versions.push(newVersion)
  cv.currentVersionId = newVersion.id
  cv.updatedAt = new Date().toISOString()
  
  saveCVs(cvs)
  return newVersion
}

export function updateCurrentVersion(cvId: string, data: CVData, latexOverride?: string): CVVersion | null {
  const cvs = getCVs()
  const cvIndex = cvs.findIndex(cv => cv.id === cvId)
  if (cvIndex === -1) return null
  
  const cv = cvs[cvIndex]
  const versionIndex = cv.versions.findIndex(v => v.id === cv.currentVersionId)
  if (versionIndex === -1) return null
  
  cv.versions[versionIndex] = {
    ...cv.versions[versionIndex],
    data,
    latexOverride,
    updatedAt: new Date().toISOString(),
  }
  cv.updatedAt = new Date().toISOString()
  
  saveCVs(cvs)
  return cv.versions[versionIndex]
}

export function restoreVersion(cvId: string, versionId: string): CV | null {
  const cvs = getCVs()
  const cvIndex = cvs.findIndex(cv => cv.id === cvId)
  if (cvIndex === -1) return null
  
  const cv = cvs[cvIndex]
  const version = cv.versions.find(v => v.id === versionId)
  if (!version) return null
  
  cv.currentVersionId = versionId
  cv.updatedAt = new Date().toISOString()
  
  saveCVs(cvs)
  return cv
}

// Share link management
export function generateShareToken(cvId: string): string {
  const token = generateId() + generateId()
  const cvs = getCVs()
  const cvIndex = cvs.findIndex(cv => cv.id === cvId)
  if (cvIndex === -1) return ''
  
  cvs[cvIndex].shareToken = token
  cvs[cvIndex].isPublic = true
  saveCVs(cvs)
  return token
}

export function revokeShareToken(cvId: string): boolean {
  const cvs = getCVs()
  const cvIndex = cvs.findIndex(cv => cv.id === cvId)
  if (cvIndex === -1) return false
  
  cvs[cvIndex].shareToken = undefined
  cvs[cvIndex].isPublic = false
  saveCVs(cvs)
  return true
}

export function getCVByShareToken(token: string): CV | null {
  const cvs = getCVs()
  return cvs.find(cv => cv.shareToken === token && cv.isPublic) || null
}

// Templates
export const defaultTemplates: Template[] = [
  {
    id: 'modern-ats',
    name: 'Modern ATS',
    description: 'Clean, modern design optimized for ATS systems with clear section headers and consistent formatting.',
    thumbnail: '/templates/modern.svg',
    category: 'modern',
  },
  {
    id: 'classic-ats',
    name: 'Classic ATS',
    description: 'Traditional resume format with proven ATS compatibility. Professional and timeless.',
    thumbnail: '/templates/classic.svg',
    category: 'classic',
  },
  {
    id: 'minimal-ats',
    name: 'Minimal ATS',
    description: 'Minimalist design focusing on content clarity. Maximum readability for both humans and ATS.',
    thumbnail: '/templates/minimal.svg',
    category: 'minimal',
  },
]

export function getTemplates(): Template[] {
  return defaultTemplates
}

export function getTemplate(id: string): Template | null {
  return defaultTemplates.find(t => t.id === id) || null
}

// Utility functions
export function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
}
