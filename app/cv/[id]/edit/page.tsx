'use client'

import { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { CVData, createEmptyCVData } from '@/lib/types/cv'
import { RevisionSaver, type SaveStatus } from '@/lib/autosave'
import { TEMPLATES } from '@/lib/templates'
import { SectionAwards } from '@/components/cv-editor/section-awards'
import { SectionCustom } from '@/components/cv-editor/section-custom'
import { AppearanceSettings } from '@/components/cv-editor/appearance-settings'
import { generateLatex, type RenderDensity } from '@/lib/latex/generator'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import {
  ArrowLeft,
  Save,
  Download,
  Eye,
  Code,
  Settings2,
  Shield,
  FileSearch,
  Sparkles,
  History,
  FileText,
  Loader2,
} from 'lucide-react'

import { SectionBasics } from '@/components/cv-editor/section-basics'
import { SectionSummary } from '@/components/cv-editor/section-summary'
import { SectionExperience } from '@/components/cv-editor/section-experience'
import { SectionEducation } from '@/components/cv-editor/section-education'
import { SectionSkills } from '@/components/cv-editor/section-skills'
import { SectionProjects } from '@/components/cv-editor/section-projects'
import { SectionCertifications } from '@/components/cv-editor/section-certifications'
import { SectionLanguages } from '@/components/cv-editor/section-languages'
import { ATSPanel } from '@/components/cv-editor/ats-panel'
import { JDMatchPanel } from '@/components/cv-editor/jd-match-panel'
import { AIAssistantPanel } from '@/components/cv-editor/ai-assistant-panel'

const DEFAULT_CV_DATA = createEmptyCVData()

interface DbCV {
  id: string
  user_id: string
  title: string
  template_id: string
  revision: number
  current_version_id: string | null
  created_at: string
  updated_at: string
  data?: CVData
}

export default function CVEditorPage() {
  const params = useParams<{ id: string }>()
  const { user, isLoading: authLoading } = useAuth()
  const { toast } = useToast()
  const router = useRouter()

  const [cv, setCv] = useState<DbCV | null>(null)
  const [cvData, setCvData] = useState<CVData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isSavingVersion, setIsSavingVersion] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [mobilePane, setMobilePane] = useState<'edit' | 'tools'>('edit')
  const [activeView, setActiveView] = useState<'form' | 'latex'>('form')
  const [rightPanel, setRightPanel] = useState<'preview' | 'ats' | 'jd' | 'ai'>('preview')
  const [compiledLayout, setCompiledLayout] = useState<{ data:CVData; template:string; density:RenderDensity } | null>(null)
  const latexCode = useMemo(() => cvData && cv ? generateLatex(cvData,cv.template_id,compiledLayout?.data === cvData && compiledLayout.template === cv.template_id ? compiledLayout.density : 'normal') : '',[cvData,cv,compiledLayout])
  const [saveVersionDialogOpen, setSaveVersionDialogOpen] = useState(false)
  const [versionNote, setVersionNote] = useState('')
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null)
  const [lastVersionSavedLabel, setLastVersionSavedLabel] = useState<string | null>(null)
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null)
  const [isPdfPreviewLoading, setIsPdfPreviewLoading] = useState(false)
  const [pdfPreviewError, setPdfPreviewError] = useState<string | null>(null)
  const [pageMode, setPageMode] = useState<'one-page' | 'multi-page'>('one-page')
  const [pdfErrorCode, setPdfErrorCode] = useState<string | null>(null)
  const [previewAttempt, setPreviewAttempt] = useState(0)
  const [pdfPages, setPdfPages] = useState<number | null>(null)
  const [isExporting, setIsExporting] = useState(false)
  const saverRef = useRef<RevisionSaver<{ data: CVData; templateId: string; title: string }> | null>(null)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved')
  const [saveError, setSaveError] = useState<string | null>(null)
  const dataRef = useRef<CVData | null>(null)
  dataRef.current = cvData
  const undoRef = useRef<Array<{ before: CVData; after: CVData }>>([])
  const [canUndoAI, setCanUndoAI] = useState(false)
  const pdfPreviewUrlRef = useRef<string | null>(null)

  const loadCV = useCallback(async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/cvs/${params.id}`, { cache: 'no-store' })

      if (!response.ok) {
        if (response.status === 404 || response.status === 403) {
          router.push('/dashboard')
          return
        }
        throw new Error('Failed to load CV')
      }

      const { cv: loadedCV } = await response.json()
      const initial = loadedCV.data || DEFAULT_CV_DATA
      saverRef.current = new RevisionSaver({ data: initial, templateId: loadedCV.template_id, title: loadedCV.title }, loadedCV.revision,
        async (snapshot, expectedRevision) => {
          const response = await fetch(`/api/cvs/${loadedCV.id}`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...snapshot, expectedRevision }),
            keepalive: JSON.stringify(snapshot).length < 60000,
          })
          const result = await response.json()
          if (!response.ok) throw Object.assign(new Error(result.error || 'Save failed. Please retry.'), { status: response.status })
          setLastSavedAt(new Date().toISOString())
          return result.revision
        }, status => {
          setSaveStatus(status)
          setIsSaving(status === 'saving')
          setHasUnsavedChanges(Boolean(saverRef.current?.dirty))
          setSaveError(saverRef.current?.error || null)
        })
      setCv(loadedCV)
      setCvData(initial)
      setLastSavedAt(loadedCV.updated_at || new Date().toISOString())
    } catch (error) {
      console.error('Error loading CV:', error)
      toast({ title: 'Failed to load CV', variant: 'destructive' })
      router.push('/dashboard')
    } finally {
      setIsLoading(false)
    }
  }, [params.id, router, toast])

  // Load CV data from database
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/signin')
      return
    }

    if (user && params.id) {
      loadCV()
    }
  }, [authLoading, user, params.id, loadCV, router])

  useEffect(() => {
    return () => {
      if (pdfPreviewUrlRef.current) {
        URL.revokeObjectURL(pdfPreviewUrlRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (rightPanel !== 'preview' || !cvData || !cv) return

    const controller = new AbortController()
    setPdfPreviewUrl(null)
    setPdfPreviewError(null)
    setPdfErrorCode(null)
    setIsPdfPreviewLoading(true)
    const timeout = window.setTimeout(async () => {
      setIsPdfPreviewLoading(true)
      setPdfPreviewError(null)

      try {
        const response = await fetch('/api/pdf', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          cache: 'no-store',
          signal: controller.signal,
          body: JSON.stringify({
            cvData,
            templateId: cv.template_id,
            title: cv.title,
            format: 'pdf',
            intent: 'preview',
            pageMode,
          }),
        })

        if (!response.ok) {
          const error = await response.json().catch(() => ({}))
          setPdfErrorCode(error.code || null)
          throw new Error(error.message || error.error || 'The PDF service could not complete this request. Retry in a moment.')
        }

        const blob = await response.blob()
        if (controller.signal.aborted) return
        const nextUrl = URL.createObjectURL(blob)

        if (pdfPreviewUrlRef.current) {
          URL.revokeObjectURL(pdfPreviewUrlRef.current)
        }

        pdfPreviewUrlRef.current = nextUrl
        setPdfPreviewUrl(nextUrl)
        setPdfPages(Number(response.headers.get('X-CV-PDF-Pages')) || null)
        const density = response.headers.get('X-CV-PDF-Density')
        if (density === 'normal' || density === 'compact' || density === 'dense') setCompiledLayout({ data:cvData,template:cv.template_id,density })
      } catch (error) {
        if (controller.signal.aborted) return
        setPdfPreviewError(error instanceof Error ? error.message : 'Failed to compile LaTeX PDF preview')
      } finally {
        if (!controller.signal.aborted) {
          setIsPdfPreviewLoading(false)
        }
      }
    }, 1200)

    return () => {
      window.clearTimeout(timeout)
      controller.abort()
    }
  }, [rightPanel, cvData, cv, pageMode, previewAttempt])

  // All content and template changes enter one queue, including photo and AI edits.
  useEffect(() => {
    const saver = saverRef.current
    if (!saver || !cvData || !cv) return
    if (saver.value.data !== cvData || saver.value.templateId !== cv.template_id || saver.value.title !== cv.title) {
      saver.change({ data: cvData, templateId: cv.template_id, title: cv.title })
    }
    if (!saver.dirty || saver.status === 'conflict') return
    const timer = window.setTimeout(() => { void saver.flush().catch(() => {}) }, 1200)
    return () => window.clearTimeout(timer)
  }, [cvData, cv])

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (saverRef.current?.dirty) { event.preventDefault(); event.returnValue = '' }
    }
    const recover = () => { void saverRef.current?.flush().catch(() => {}) }
    window.addEventListener('beforeunload', warn)
    window.addEventListener('online', recover)
    return () => { window.removeEventListener('beforeunload', warn); window.removeEventListener('online', recover); void saverRef.current?.flush().catch(() => {}) }
  }, [])

  const saveChanges = useCallback(async () => {
    try { await saverRef.current?.flush(); return true } catch (error) {
      toast({ title: error instanceof Error ? error.message : 'Save failed. Please retry.', variant: 'destructive' })
      return false
    }
  }, [toast])

  const navigateSaved = async (url: string) => {
    if (await saveChanges()) router.push(url)
  }

  const commitAI = (update: (current: CVData) => CVData) => {
    const before = dataRef.current
    if (!before) return
    const after = update(before)
    undoRef.current.push({ before, after })
    if (undoRef.current.length > 10) undoRef.current.shift()
    setCanUndoAI(true)
    dataRef.current = after
    setCvData(after)
  }

  const undoAI = () => {
    const change = undoRef.current.pop()
    const current = dataRef.current
    if (!change || !current) return
    const next = { ...current }
    // Revert only unchanged AI fields; preserve subsequent manual edits.
    for (const field of ['summary', 'skills', 'experience'] as const) {
      if (JSON.stringify(current[field]) === JSON.stringify(change.after[field])) {
        Object.assign(next, { [field]: change.before[field] })
      }
    }
    setCvData(next)
    setCanUndoAI(undoRef.current.length > 0)
    toast({ title: 'AI changes undone; later manual edits preserved' })
  }

  // Handle data changes
  const handleDataChange = (updates: Partial<CVData>) => {
    setCvData((current) => {
      if (!current) return current
      return { ...current, ...updates }
    })
  }

  const applyAISummary = (summary: string) => {
    commitAI((current) => {
      if (!current) return current
      return { ...current, summary }
    })
    toast({ title: 'AI summary applied' })
  }

  const applyAISkills = (skillsToAdd: string[]) => {
    const normalizedSkills = Array.from(
      new Set(skillsToAdd.map((skill) => skill.trim()).filter(Boolean))
    )

    if (normalizedSkills.length === 0) return

    commitAI((current) => {
      if (!current) return current

      const existingIndex = current.skills.findIndex((group) =>
        ['target role keywords', 'core skills', 'technical skills'].includes(group.category.toLowerCase())
      )

      if (existingIndex >= 0) {
        const updatedSkills = [...current.skills]
        const existingGroup = updatedSkills[existingIndex]
        updatedSkills[existingIndex] = {
          ...existingGroup,
          skills: Array.from(new Set([...(existingGroup.skills || []), ...normalizedSkills])),
        }

        return { ...current, skills: updatedSkills }
      }

      return {
        ...current,
        skills: [
          ...current.skills,
          {
            id: `ai-skills-${Date.now()}`,
            category: 'Target Role Keywords',
            skills: normalizedSkills,
          },
        ],
      }
    })

    toast({ title: 'AI skills added' })
  }

  const applyAIExperienceBullets = (experienceId: string, bullets: string[]) => {
    const cleanBullets = bullets.map((bullet) => bullet.trim()).filter(Boolean)

    if (cleanBullets.length === 0) return

    commitAI((current) => {
      if (!current) return current

      return {
        ...current,
        experience: current.experience.map((item) =>
          item.id === experienceId ? { ...item, bullets: cleanBullets } : item
        ),
      }
    })

    toast({ title: 'AI bullets applied' })
  }

  const applyAITailoredPackage = ({
    summary,
    skills,
    experienceRewrites,
  }: {
    summary: string
    skills: string[]
    experienceRewrites: Array<{ experienceId: string; bullets: string[] }>
  }) => {
    const normalizedSkills = Array.from(new Set(skills.map((skill) => skill.trim()).filter(Boolean)))

    commitAI((current) => {
      if (!current) return current

      const rewriteMap = new Map(
        experienceRewrites.map((rewrite) => [
          rewrite.experienceId,
          rewrite.bullets.map((bullet) => bullet.trim()).filter(Boolean),
        ])
      )

      const existingIndex = current.skills.findIndex((group) =>
        ['target role keywords', 'core skills', 'technical skills'].includes(group.category.toLowerCase())
      )

      const updatedSkills = [...current.skills]
      if (normalizedSkills.length > 0) {
        if (existingIndex >= 0) {
          const existingGroup = updatedSkills[existingIndex]
          updatedSkills[existingIndex] = {
            ...existingGroup,
            skills: Array.from(new Set([...(existingGroup.skills || []), ...normalizedSkills])),
          }
        } else {
          updatedSkills.push({
            id: `ai-skills-${Date.now()}`,
            category: 'Target Role Keywords',
            skills: normalizedSkills,
          })
        }
      }

      return {
        ...current,
        summary,
        skills: updatedSkills,
        experience: current.experience.map((item) =>
          rewriteMap.has(item.id)
            ? { ...item, bullets: rewriteMap.get(item.id) || item.bullets }
            : item
        ),
      }
    })

    toast({ title: 'AI tailored package applied' })
  }

  // Save as new version
  const handleSaveVersion = async () => {
    if (!cv || !cvData) return

    setIsSavingVersion(true)
    try {
      const saver = saverRef.current
      if (!saver) return
      const version = await saver.exclusive(async (_snapshot, expectedRevision) => {
        const response = await fetch(`/api/cvs/${cv.id}/versions`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ expectedRevision, note: versionNote }),
        })
        const result = await response.json()
        if (!response.ok) throw Object.assign(new Error(result.error || 'Failed to save version'), { status: response.status })
        return { result: result.version, revision: result.revision }
      })
      toast({ title: `Version ${version.version} saved` })
      setSaveVersionDialogOpen(false)
      setVersionNote('')
      setLastSavedAt(new Date().toISOString())
      setLastVersionSavedLabel(`Version ${version.version} saved`)
    } catch (error) {
      toast({ title: error instanceof Error ? error.message : 'Failed to save version', variant: 'destructive' })
    } finally {
      setIsSavingVersion(false)
    }
  }

  const saveStatusLabel = saveStatus === 'conflict' ? 'Conflicting modification' : saveStatus === 'failed' ? 'Save failed ? retry' : isSaving ? 'Saving changes...' : hasUnsavedChanges ? 'Unsaved changes' : 'All changes saved'
  const saveStatusTone = isSaving
    ? 'border-blue-200 bg-blue-50 text-blue-700'
    : hasUnsavedChanges
      ? 'border-amber-200 bg-amber-50 text-amber-700'
      : 'border-green-200 bg-green-50 text-green-700'
  const formattedSavedTime = lastSavedAt
    ? new Date(lastSavedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    : null

  // Handle template change
  const handleTemplateChange = (templateId: string) => {
    setCv(current => current ? { ...current, template_id: templateId } : current)
  }

  const handlePhotoUpload = async (file: File) => {
    const saver = saverRef.current
    if (!saver || !cv) return
    await saver.exclusive(async (_snapshot, expectedRevision) => {
      const form = new FormData()
      form.set('photo', file); form.set('target', 'cv'); form.set('cvId', cv.id)
      form.set('expectedRevision', String(expectedRevision))
      const response = await fetch('/api/upload/photo', { method: 'POST', body: form })
      const result = await response.json()
      if (!response.ok) throw Object.assign(new Error(result.error || 'Photo upload failed'), { status: response.status })
      const current = saver.value
      const next = { ...current.data, basics: { ...current.data.basics, photoUrl: result.url } }
      saver.change({ ...current, data: next })
      dataRef.current = next
      setCvData(next)
      return { result: undefined, revision: result.revision }
    })
  }

  // Download LaTeX
  const handleDownloadLatex = () => {
    const blob = new Blob([latexCode], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${cv?.title.replace(/\s+/g, '_')}_${cvData?.basics.name.replace(/\s+/g, '_') || 'cv'}.tex`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    toast({ title: 'LaTeX file downloaded' })
  }

  // Export to PDF (template-accurate LaTeX compilation)
  const handleExportPDF = async () => {
    if (isExporting) return
    setIsExporting(true)
    try {
      if (!cvData) {
        throw new Error('CV data is not loaded yet')
      }

      const saved = await saveChanges()
      if (!saved) {
        throw new Error('Save your latest changes before exporting the PDF')
      }

      const snapshot = saverRef.current?.value
      toast({ title: 'Generating PDF...' })

      const response = await fetch('/api/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify({
          cvId: cv?.id,
          expectedRevision: saverRef.current?.serverRevision,
          templateId: snapshot?.templateId || cv?.template_id,
          title: cv?.title,
          format: 'pdf',
          pageMode,
        }),
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(error.message || error.error || 'The PDF service could not complete this request. Retry in a moment.')
      }

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      const baseName = `${cvData.basics.name.replace(/\s+/g, '_') || 'cv'}_${cv?.title?.replace(/\s+/g, '_') || 'resume'}`
      a.href = url
      a.download = `${baseName}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      toast({ title: 'PDF downloaded from LaTeX' })
    } catch (error) {
      toast({
        title: error instanceof Error ? error.message : 'Failed to generate PDF',
        variant: 'destructive'
      })
    } finally {
      setIsExporting(false)
    }
  }

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b bg-card h-14">
          <div className="container mx-auto px-4 py-3 flex items-center gap-4">
            <Skeleton className="h-8 w-8" />
            <Skeleton className="h-6 w-48" />
          </div>
        </header>
        <div className="flex h-[calc(100vh-56px)]">
          <div className="w-1/2 p-4">
            <Skeleton className="h-full" />
          </div>
          <div className="w-1/2 p-4 border-l">
            <Skeleton className="h-full" />
          </div>
        </div>
      </div>
    )
  }

  if (!cv || !cvData) return null

  return (
    <div className="h-dvh min-h-0 overflow-hidden bg-background flex flex-col">
      {/* Header */}
      <header className="shrink-0 border-b bg-card z-20">
        <div className="container mx-auto px-4 py-2 flex flex-wrap gap-3 items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" aria-label="Back to dashboard" onClick={() => navigateSaved('/dashboard')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                <Input aria-label="CV title" className="h-8 max-w-56 font-semibold" maxLength={255} value={cv.title} onChange={event => setCv(current => current ? { ...current, title: event.target.value } : current)} />
              </div>
              <p className="hidden xl:block text-xs text-muted-foreground">
                Use Preview to inspect layout, then open AI Assist for review, tailoring, and factual rewrites.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Select value={cv.template_id} onValueChange={handleTemplateChange}>
              <SelectTrigger aria-label="CV template" className="w-40 h-8">
                <SelectValue placeholder="Template">{TEMPLATES.find(template => template.id === cv.template_id)?.name}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {TEMPLATES.map(t => (
                  <SelectItem key={t.id} value={t.id}>
                    <div className="flex flex-col">
                      <span>{t.name}</span>
                      <span className="text-xs text-muted-foreground">{t.desc}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <AppearanceSettings value={cvData.appearance} onChange={appearance => handleDataChange({ appearance })} />

            <Button
              variant="outline"
              size="sm"
              onClick={() => saveChanges()}
              disabled={!hasUnsavedChanges || isSaving}
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-1" />
              )}
              Save
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setSaveVersionDialogOpen(true)}
            >
              <History className="h-4 w-4 mr-1" />
              Version
            </Button>

            <Button variant="outline" size="sm" onClick={handleDownloadLatex}>
              <Download className="h-4 w-4 mr-1" />
              .tex
            </Button>

            <Button size="sm" onClick={handleExportPDF} disabled={isExporting}>
              {isExporting ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Download className="h-4 w-4 mr-1" />}
              {isExporting ? 'Exporting...' : 'PDF'}
            </Button>
          </div>
        </div>
      </header>

      <div className="shrink-0 border-b bg-muted/20">
        <div className="container mx-auto flex flex-wrap items-center gap-2 px-4 py-2 text-xs">
          <span role="status" aria-live="polite" className={`rounded-full border px-2 py-1 font-medium ${saveStatusTone}`}>
            {saveStatusLabel}
          </span>
          {saveError && <span role="alert" className="text-destructive">{saveError} <Button size="sm" variant="outline" onClick={() => {
            const blob = new Blob([JSON.stringify({ data: cvData, templateId: cv.template_id }, null, 2)], { type: 'application/json' })
            const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'unsaved-cv.json'; a.click(); URL.revokeObjectURL(url)
          }}>Download local copy</Button></span>}
          {canUndoAI && <Button variant="outline" size="sm" onClick={undoAI}>Undo AI change</Button>}
          {formattedSavedTime && (
            <span className="text-muted-foreground">Last saved at {formattedSavedTime}</span>
          )}
          {lastVersionSavedLabel && (
            <span className="rounded-full border border-primary/20 bg-primary/5 px-2 py-1 font-medium text-primary">
              {lastVersionSavedLabel}
            </span>
          )}
          <span className="hidden lg:inline text-muted-foreground">{TEMPLATES.find(template => template.id === cv.template_id)?.atsNote}</span>
          <span className="hidden xl:inline text-muted-foreground">
            Tip: save a version after major AI changes so you can compare role-specific variants later.
          </span>
        </div>
      </div>

      <div className="flex shrink-0 gap-2 border-b p-2 lg:hidden" role="group" aria-label="Editor panels">
        <Button variant={mobilePane === 'edit' ? 'default' : 'outline'} size="sm" aria-pressed={mobilePane === 'edit'} onClick={() => setMobilePane('edit')}>Edit CV</Button>
        <Button variant={mobilePane === 'tools' ? 'default' : 'outline'} size="sm" aria-pressed={mobilePane === 'tools'} onClick={() => setMobilePane('tools')}>Preview &amp; AI</Button>
      </div>
      {/* Main Content */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row">
        {/* Left Panel - Editor */}
        <div className={`w-full lg:w-1/2 lg:border-r min-h-0 flex-1 lg:flex-none flex-col ${mobilePane === 'edit' ? 'flex' : 'hidden lg:flex'}`}>
          <div className="shrink-0 border-b px-4 py-2 flex items-center justify-between bg-muted/30">
            <Tabs value={activeView} onValueChange={(v) => setActiveView(v as 'form' | 'latex')}>
              <TabsList className="h-8">
                <TabsTrigger value="form" className="text-xs h-7">
                  <Settings2 className="h-3 w-3 mr-1" />
                  Form View
                </TabsTrigger>
                <TabsTrigger value="latex" className="text-xs h-7">
                  <Code className="h-3 w-3 mr-1" />
                  LaTeX View
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* A bounded native scroller supports wheel, touch and keyboard scrolling. */}
          <div role="region" aria-label="CV form" tabIndex={0} className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            {activeView === 'form' ? (
              <div className="p-4 space-y-4">
                <SectionBasics
                  data={cvData.basics}
                  onChange={(basics) => handleDataChange({ basics })}
                  cvId={cv.id}
                  onPhotoUpload={handlePhotoUpload}
                />
                <SectionSummary
                  data={cvData.summary}
                  onChange={(summary) => handleDataChange({ summary })}
                />
                <SectionExperience
                  data={cvData.experience}
                  onChange={(experience) => handleDataChange({ experience })}
                />
                <SectionEducation
                  data={cvData.education}
                  onChange={(education) => handleDataChange({ education })}
                />
                <SectionSkills
                  data={cvData.skills}
                  onChange={(skills) => handleDataChange({ skills })}
                />
                <SectionProjects
                  data={cvData.projects}
                  onChange={(projects) => handleDataChange({ projects })}
                />
                <SectionCertifications
                  data={cvData.certifications}
                  onChange={(certifications) => handleDataChange({ certifications })}
                />
                <SectionAwards data={cvData.awards} onChange={awards => handleDataChange({ awards })} />
                <SectionCustom data={cvData.customSections} onChange={customSections => handleDataChange({ customSections })} />
                <SectionLanguages
                  languages={cvData.languages || []}
                  onChange={(languages) => handleDataChange({ languages })}
                />
              </div>
            ) : (
              <div className="p-4">
                <div className="bg-muted rounded-lg p-4 font-mono text-xs overflow-x-auto whitespace-pre-wrap">
                  {latexCode}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  This source uses the latest compiled preview layout for these edits, or the base layout while a new preview is pending.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - Preview / ATS / JD Match */}
        <div className={`w-full lg:w-1/2 min-h-0 flex-1 lg:flex-none flex-col bg-muted/20 ${mobilePane === 'tools' ? 'flex' : 'hidden lg:flex'}`}>
          <div className="border-b px-4 py-2 flex items-center justify-between bg-muted/30">
            <Tabs value={rightPanel} onValueChange={(v) => setRightPanel(v as 'preview' | 'ats' | 'jd' | 'ai')}>
              <TabsList className="h-8">
                <TabsTrigger value="preview" className="text-xs h-7">
                  <Eye className="h-3 w-3 mr-1" />
                  LaTeX PDF
                </TabsTrigger>
                <TabsTrigger value="ats" className="text-xs h-7">
                  <Shield className="h-3 w-3 mr-1" />
                  ATS Check
                </TabsTrigger>
                <TabsTrigger value="jd" className="text-xs h-7">
                  <FileSearch className="h-3 w-3 mr-1" />
                  JD Match
                </TabsTrigger>
                <TabsTrigger value="ai" className="text-xs h-7">
                  <Sparkles className="h-3 w-3 mr-1" />
                  AI Assist
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <div className={`flex-1 min-h-0 p-2 sm:p-4 ${rightPanel === 'preview' ? 'overflow-hidden' : 'overflow-y-auto'}`}>
            {rightPanel === 'preview' && (
              <div className="flex h-full flex-col overflow-hidden rounded-lg border bg-muted/20">
                <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b bg-background px-3 py-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">Compiled LaTeX PDF</p>
                    <p className="truncate text-xs text-muted-foreground">{pdfPages ? `${pdfPages} ${pdfPages === 1 ? 'page' : 'pages'} · ` : ''}LaTeX PDF</p>
                  </div>
                  <Select value={pageMode} onValueChange={value => setPageMode(value as typeof pageMode)}>
                    <SelectTrigger aria-label="PDF page mode" className="h-8 w-40"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="one-page">One page</SelectItem>
                      <SelectItem value="multi-page">Multiple pages</SelectItem>
                    </SelectContent>
                  </Select>
                  {isPdfPreviewLoading && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Compiling
                    </div>
                  )}
                </div>

                {pdfPreviewError ? (
                  <div role="alert" className="m-4 overflow-y-auto rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
                    <p className="font-medium">{pdfErrorCode === 'PDF_OVERFLOW' ? 'Your CV needs more space' : 'PDF preview unavailable'}</p>
                    <p className="mt-2 whitespace-pre-wrap text-xs">{pdfPreviewError}</p>
                    <Button variant="outline" size="sm" className="mt-3" onClick={() => pdfErrorCode === 'PDF_OVERFLOW' ? setPageMode('multi-page') : setPreviewAttempt(value => value + 1)}>
                      {pdfErrorCode === 'PDF_OVERFLOW' ? 'Allow multiple pages' : 'Retry preview'}
                    </Button>
                  </div>
                ) : pdfPreviewUrl ? (
                  <iframe
                    src={pdfPreviewUrl}
                    title="Compiled LaTeX PDF preview"
                    className="h-full w-full flex-1 bg-white"
                  />
                ) : (
                  <div className="flex h-full flex-1 items-center justify-center text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Compiling LaTeX preview...
                    </div>
                  </div>
                )}
              </div>
            )}
            {rightPanel === 'ats' && (
              <ATSPanel data={cvData} />
            )}
            {rightPanel === 'jd' && (
              <JDMatchPanel data={cvData} />
            )}
            {rightPanel === 'ai' && (
              <AIAssistantPanel
                cvId={cv.id}
                data={cvData}
                onApplySummary={applyAISummary}
                onAddSkills={applyAISkills}
                onApplyExperienceBullets={applyAIExperienceBullets}
                onApplyTailoredPackage={applyAITailoredPackage}
              />
            )}
          </div>
        </div>
      </div>

      {/* Save Version Dialog */}
      <Dialog open={saveVersionDialogOpen} onOpenChange={setSaveVersionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save as New Version</DialogTitle>
            <DialogDescription>
              Create a snapshot of your current CV. You can restore previous versions later.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="version-note">Version Note (optional)</Label>
            <Input
              id="version-note"
              placeholder="e.g., Updated for tech companies"
              value={versionNote}
              onChange={(e) => setVersionNote(e.target.value)}
              className="mt-2"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveVersionDialogOpen(false)} disabled={isSavingVersion}>
              Cancel
            </Button>
            <Button onClick={handleSaveVersion} disabled={isSavingVersion}>
              {isSavingVersion ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {isSavingVersion ? 'Saving Version...' : 'Save Version'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
