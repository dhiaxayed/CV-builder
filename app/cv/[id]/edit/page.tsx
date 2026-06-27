'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { CVData } from '@/lib/types/cv'
import { generateLatex } from '@/lib/latex/generator'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
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

// Template definitions - 16 Professional Templates
const TEMPLATES = [
  // ATS-Friendly
  { id: 'modern', name: 'Modern', desc: 'Clean & ATS-friendly', category: 'ATS-Friendly' },
  { id: 'classic', name: 'Classic', desc: 'Traditional professional', category: 'ATS-Friendly' },
  { id: 'minimal', name: 'Minimal', desc: 'Simple & elegant', category: 'ATS-Friendly' },
  { id: 'compact', name: 'Compact', desc: 'Ultra space-efficient', category: 'ATS-Friendly' },
  // Professional
  { id: 'professional', name: 'Professional', desc: 'Executive business', category: 'Professional' },
  { id: 'executive', name: 'Executive', desc: 'C-level & senior', category: 'Professional' },
  { id: 'banking', name: 'Banking', desc: 'Corporate & finance', category: 'Professional' },
  { id: 'elegant', name: 'Elegant', desc: 'Premium sidebar design', category: 'Professional' },
  // Creative
  { id: 'creative', name: 'Creative', desc: 'Modern & visual', category: 'Creative' },
  { id: 'fancy', name: 'Fancy', desc: 'Decorative & stylish', category: 'Creative' },
  { id: 'bold', name: 'Bold', desc: 'High contrast statement', category: 'Creative' },
  { id: 'infographic', name: 'Infographic', desc: 'Visual with skill bars', category: 'Creative' },
  // Specialized
  { id: 'tech', name: 'Tech', desc: 'Developer focused', category: 'Specialized' },
  { id: 'academic', name: 'Academic', desc: 'Research & education', category: 'Specialized' },
  { id: 'casual', name: 'Casual', desc: 'Friendly & approachable', category: 'Specialized' },
  { id: 'vintage', name: 'Vintage', desc: 'Traditional elegance', category: 'Specialized' },
]

// Default CV data structure
const DEFAULT_CV_DATA: CVData = {
  basics: {
    name: '',
    title: '',
    contact: {
      email: '',
      phone: '',
      location: '',
      linkedin: '',
      github: '',
      website: '',
    },
  },
  summary: '',
  experience: [],
  education: [],
  skills: [],
  projects: [],
  certifications: [],
  languages: [],
  awards: [],
  customSections: [],
}

interface DbCV {
  id: string
  user_id: string
  title: string
  template_id: string
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
  const [activeView, setActiveView] = useState<'form' | 'latex'>('form')
  const [rightPanel, setRightPanel] = useState<'preview' | 'ats' | 'jd' | 'ai'>('preview')
  const [latexCode, setLatexCode] = useState('')
  const [saveVersionDialogOpen, setSaveVersionDialogOpen] = useState(false)
  const [versionNote, setVersionNote] = useState('')
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null)
  const [lastVersionSavedLabel, setLastVersionSavedLabel] = useState<string | null>(null)
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null)
  const [isPdfPreviewLoading, setIsPdfPreviewLoading] = useState(false)
  const [pdfPreviewError, setPdfPreviewError] = useState<string | null>(null)
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const pdfPreviewUrlRef = useRef<string | null>(null)
  
  // Load CV data from database
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/signin')
      return
    }
    
    if (user && params.id) {
      loadCV()
    }
  }, [authLoading, user, params.id])
  
  const loadCV = async () => {
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
      setCv(loadedCV)
      setCvData(loadedCV.data || DEFAULT_CV_DATA)
      setLastSavedAt(loadedCV.updated_at || new Date().toISOString())
    } catch (error) {
      console.error('Error loading CV:', error)
      toast({ title: 'Failed to load CV', variant: 'destructive' })
      router.push('/dashboard')
    } finally {
      setIsLoading(false)
    }
  }
  
  // Generate LaTeX when data changes
  useEffect(() => {
    if (cvData && cv) {
      const latex = generateLatex(cvData, cv.template_id)
      setLatexCode(latex)
    }
  }, [cvData, cv])

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
          }),
        })

        if (!response.ok) {
          const error = await response.json().catch(() => ({}))
          throw new Error(error.message || 'Failed to compile LaTeX PDF preview')
        }

        const blob = await response.blob()
        const nextUrl = URL.createObjectURL(blob)

        if (pdfPreviewUrlRef.current) {
          URL.revokeObjectURL(pdfPreviewUrlRef.current)
        }

        pdfPreviewUrlRef.current = nextUrl
        setPdfPreviewUrl(nextUrl)
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return
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
  }, [rightPanel, cvData, cv])
  
  // Auto-save with debounce
  useEffect(() => {
    if (hasUnsavedChanges && cv && cvData) {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
      
      saveTimeoutRef.current = setTimeout(() => {
        saveChanges()
      }, 2000) // Auto-save after 2 seconds of inactivity
    }
    
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [hasUnsavedChanges, cvData])
  
  // Save changes to database
  const saveChanges = useCallback(async () => {
    if (!cv || !cvData) return
    
    setIsSaving(true)
    try {
      const response = await fetch(`/api/cvs/${cv.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify({ data: cvData }),
      })
      
      if (!response.ok) throw new Error('Failed to save')
      
      setHasUnsavedChanges(false)
      setLastSavedAt(new Date().toISOString())
      toast({ title: 'Changes saved' })
      return true
    } catch {
      toast({ title: 'Failed to save changes', variant: 'destructive' })
      return false
    } finally {
      setIsSaving(false)
    }
  }, [cv, cvData, toast])
  
  // Handle data changes
  const handleDataChange = (updates: Partial<CVData>) => {
    setCvData((current) => {
      if (!current) return current
      return { ...current, ...updates }
    })
    setHasUnsavedChanges(true)
  }

  const applyAISummary = (summary: string) => {
    setCvData((current) => {
      if (!current) return current
      return { ...current, summary }
    })
    setHasUnsavedChanges(true)
    toast({ title: 'AI summary applied' })
  }

  const applyAISkills = (skillsToAdd: string[]) => {
    const normalizedSkills = Array.from(
      new Set(skillsToAdd.map((skill) => skill.trim()).filter(Boolean))
    )

    if (normalizedSkills.length === 0) return

    setCvData((current) => {
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

    setHasUnsavedChanges(true)
    toast({ title: 'AI skills added' })
  }

  const applyAIExperienceBullets = (experienceId: string, bullets: string[]) => {
    const cleanBullets = bullets.map((bullet) => bullet.trim()).filter(Boolean)

    if (cleanBullets.length === 0) return

    setCvData((current) => {
      if (!current) return current

      return {
        ...current,
        experience: current.experience.map((item) =>
          item.id === experienceId ? { ...item, bullets: cleanBullets } : item
        ),
      }
    })

    setHasUnsavedChanges(true)
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

    setCvData((current) => {
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

    setHasUnsavedChanges(true)
    toast({ title: 'AI tailored package applied' })
  }
  
  // Save as new version
  const handleSaveVersion = async () => {
    if (!cv || !cvData) return

    setIsSavingVersion(true)
    try {
      const response = await fetch(`/api/cvs/${cv.id}/versions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: cvData, note: versionNote }),
      })
      
      if (!response.ok) throw new Error('Failed to save version')
      
      const { version } = await response.json()
      toast({ title: `Version ${version.version} saved` })
      setSaveVersionDialogOpen(false)
      setVersionNote('')
      setHasUnsavedChanges(false)
      setLastSavedAt(new Date().toISOString())
      setLastVersionSavedLabel(`Version ${version.version} saved`)
    } catch {
      toast({ title: 'Failed to save version', variant: 'destructive' })
    } finally {
      setIsSavingVersion(false)
    }
  }

  const saveStatusLabel = isSaving ? 'Saving changes...' : hasUnsavedChanges ? 'Unsaved changes' : 'All changes saved'
  const saveStatusTone = isSaving
    ? 'border-blue-200 bg-blue-50 text-blue-700'
    : hasUnsavedChanges
      ? 'border-amber-200 bg-amber-50 text-amber-700'
      : 'border-green-200 bg-green-50 text-green-700'
  const formattedSavedTime = lastSavedAt
    ? new Date(lastSavedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    : null
  
  // Handle template change
  const handleTemplateChange = async (templateId: string) => {
    if (!cv) return
    
    try {
      // Update local state immediately for responsiveness
      setCv({ ...cv, template_id: templateId })
      
      // Save to database
      const response = await fetch(`/api/cvs/${cv.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateId }),
      })

      if (!response.ok) {
        throw new Error('Failed to change template')
      }
      
      toast({ title: 'Template changed' })
    } catch {
      toast({ title: 'Failed to change template', variant: 'destructive' })
    }
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
    try {
      if (!cvData) {
        throw new Error('CV data is not loaded yet')
      }

      if (hasUnsavedChanges) {
        const saved = await saveChanges()
        if (!saved) {
          throw new Error('Save your latest changes before exporting the PDF')
        }
      }

      toast({ title: 'Generating PDF...' })
      
      const response = await fetch('/api/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify({ 
          cvData, 
          cvId: cv?.id,
          templateId: cv?.template_id,
          title: cv?.title,
          format: 'pdf',
        }),
      })
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(error.message || 'Failed to generate PDF')
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
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b bg-card sticky top-0 z-20">
        <div className="container mx-auto px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => router.push('/dashboard')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                <span className="font-semibold">{cv.title}</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Use Preview to inspect layout, then open AI Assist for review, tailoring, and factual rewrites.
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Select value={cv.template_id} onValueChange={handleTemplateChange}>
              <SelectTrigger className="w-40 h-8">
                <SelectValue placeholder="Template" />
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
            
            <Button 
              variant="outline" 
              size="sm"
              onClick={saveChanges}
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
            
            <Button size="sm" onClick={handleExportPDF}>
              <Download className="h-4 w-4 mr-1" />
              PDF
            </Button>
          </div>
        </div>
      </header>

      <div className="border-b bg-muted/20">
        <div className="container mx-auto flex flex-wrap items-center gap-2 px-4 py-2 text-xs">
          <span className={`rounded-full border px-2 py-1 font-medium ${saveStatusTone}`}>
            {saveStatusLabel}
          </span>
          {formattedSavedTime && (
            <span className="text-muted-foreground">Last saved at {formattedSavedTime}</span>
          )}
          {lastVersionSavedLabel && (
            <span className="rounded-full border border-primary/20 bg-primary/5 px-2 py-1 font-medium text-primary">
              {lastVersionSavedLabel}
            </span>
          )}
          <span className="text-muted-foreground">
            Tip: save a version after major AI changes so you can compare role-specific variants later.
          </span>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel - Editor */}
        <div className="w-1/2 border-r flex flex-col">
          <div className="border-b px-4 py-2 flex items-center justify-between bg-muted/30">
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
          
          <ScrollArea className="flex-1">
            {activeView === 'form' ? (
              <div className="p-4 space-y-4">
                <SectionBasics 
                  data={cvData.basics} 
                  onChange={(basics) => handleDataChange({ basics })}
                  cvId={cv.id}
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
                  This is the generated LaTeX source used to build your PDF export.
                </p>
              </div>
            )}
          </ScrollArea>
        </div>
        
        {/* Right Panel - Preview / ATS / JD Match */}
        <div className="w-1/2 flex flex-col bg-muted/20">
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
          
          <div className="flex-1 p-4 overflow-hidden">
            {rightPanel === 'preview' && (
              <div className="flex h-full flex-col overflow-hidden rounded-lg border bg-muted/20">
                <div className="flex items-center justify-between border-b bg-background px-3 py-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">Compiled LaTeX PDF</p>
                    <p className="truncate text-xs text-muted-foreground">Renderer: LaTeX</p>
                  </div>
                  {isPdfPreviewLoading && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Compiling
                    </div>
                  )}
                </div>

                {pdfPreviewError ? (
                  <div className="m-4 rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
                    <p className="font-medium">LaTeX compilation failed</p>
                    <p className="mt-2 whitespace-pre-wrap text-xs">{pdfPreviewError}</p>
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
