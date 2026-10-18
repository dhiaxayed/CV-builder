'use client'

import { useEffect, useMemo, useState, useCallback } from 'react'
import { canReplaceAISummary, canReplaceAIExperience } from '@/lib/ai/editor-guards'
import { AIAtsReview, AIJobTailorAnalysis } from '@/lib/ai/types'
import { ATSReport, CVData } from '@/lib/types/cv'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/lib/auth-context'
import {
  Sparkles,
  Loader2,
  Lightbulb,
  Wand2,
  Shield,
  Briefcase,
  Lock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
} from 'lucide-react'
import { PRO_CONTACT_URL } from '@/lib/billing/contact'
import type { Condensation } from '@/lib/ai/condense'
import { cn } from '@/lib/utils'

interface AIAssistantPanelProps {
  cvId: string
  data: CVData
  onApplySummary: (summary: string) => void
  onAddSkills: (skills: string[]) => void
  onApplyExperienceBullets: (experienceId: string, bullets: string[]) => void
  onApplyTailoredPackage: (payload: {
    summary: string
    skills: string[]
    experienceRewrites: AIJobTailorAnalysis['experienceRewrites']
  }) => void
}

type ReviewResponse = {
  review: AIAtsReview
  heuristicReport: ATSReport
  source: 'groq' | 'openrouter' | 'heuristic-fallback'
  aiError?: string
}

type TailorResponse = {
  analysis: AIJobTailorAnalysis
  source: 'groq' | 'openrouter' | 'heuristic-fallback'
  aiError?: string
  savedJobDescriptionId?: string | null
  heuristicMatch: {
    extractedKeywords: string[]
    matchedKeywords: string[]
    missingKeywords: string[]
    score: number
    suggestions: string[]
  }
}

type JobDescriptionHistoryItem = {
  id: string
  title: string
  company: string | null
  match_score: number | null
  created_at: string
}

async function readApiResponse<T>(response: Response): Promise<T & { error?: string; code?: string }> {
  const body = await response.text()

  if (!body.trim()) {
    return {} as T & { error?: string; code?: string }
  }

  try {
    return JSON.parse(body) as T & { error?: string; code?: string }
  } catch {
    return {
      error: 'The server returned an invalid response. Please retry.',
    } as T & { error?: string; code?: string }
  }
}

export function AIAssistantPanel({
  cvId,
  data,
  onApplySummary,
  onAddSkills,
  onApplyExperienceBullets,
  onApplyTailoredPackage,
}: AIAssistantPanelProps) {
  const { user } = useAuth()
  const { toast } = useToast()
  const [isReviewLoading, setIsReviewLoading] = useState(false)
  const [condensation, setCondensation] = useState<(Condensation & { source: string }) | null>(null)
  const [isCondensing, setIsCondensing] = useState(false)
  const [selected, setSelected] = useState<string[]>([])
  const toggle = (key: string) => setSelected(current => current.includes(key) ? current.filter(item => item !== key) : [...current,key])
  const [isTailorLoading, setIsTailorLoading] = useState(false)
  const [reviewSource,setReviewSource]=useState<CVData|null>(null)
  const [tailorSource,setTailorSource]=useState<CVData|null>(null)
  const [condenseSource,setCondenseSource]=useState<CVData|null>(null)
  const [reviewData, setReviewData] = useState<ReviewResponse | null>(null)
  const [tailorData, setTailorData] = useState<TailorResponse | null>(null)
  const [reviewError, setReviewError] = useState<string | null>(null)
  const [tailorError, setTailorError] = useState<string | null>(null)
  const [jobHistory, setJobHistory] = useState<JobDescriptionHistoryItem[]>([])
  const [jobTitle, setJobTitle] = useState('')
  const [company, setCompany] = useState('')
  const [jobDescription, setJobDescription] = useState('')
  const isProUser = user?.tier === 'pro'

  const loadJobHistory = useCallback(async () => {
    if (!isProUser) {
      setJobHistory([])
      return
    }

    const response = await fetch('/api/ai/job-descriptions')
    if (!response.ok) return

    const payload = await readApiResponse<{ jobDescriptions?: JobDescriptionHistoryItem[] }>(response)
    setJobHistory(payload.jobDescriptions || [])
  }, [isProUser])

  useEffect(() => {
    void loadJobHistory().catch(() => {})
  }, [loadJobHistory])

  const scoreTone = useMemo(() => {
    const score = reviewData?.review.atsReadinessScore ?? tailorData?.analysis.atsFitScore ?? 0
    if (score >= 75) return 'text-green-600'
    if (score >= 55) return 'text-yellow-600'
    return 'text-red-600'
  }, [reviewData, tailorData])

  const handleCondense = async () => {
    setIsCondensing(true)
    try {
      const response = await fetch('/api/ai/condense', { method:'POST',headers:{ 'Content-Type':'application/json' },body:JSON.stringify({ cvId,cvData:data }) })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Could not suggest reductions')
      setCondensation(result); setCondenseSource(data)
    } catch (error) { toast({ title:error instanceof Error ? error.message : 'Could not suggest reductions',variant:'destructive' }) }
    finally { setIsCondensing(false) }
  }

  const handleReview = async () => {
    setIsReviewLoading(true)
    setReviewError(null)

    try {
      const response = await fetch('/api/ai/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cvId, cvData: data }),
      })

      const payload = await readApiResponse<ReviewResponse>(response)

      if (!response.ok) {
        throw new Error(payload.error || 'Failed to generate AI ATS review')
      }

      setReviewData(payload); setReviewSource(data)
      toast({
        title:
          payload.source === 'heuristic-fallback'
            ? 'ATS review ready (heuristic fallback)'
            : 'AI ATS review ready',
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to generate AI ATS review'
      setReviewError(message)
      toast({
        title: message,
        variant: 'destructive',
      })
    } finally {
      setIsReviewLoading(false)
    }
  }

  const handleTailor = async () => {
    if (!isProUser) {
      const message = 'Job description tailoring is available on Pro plan only.'
      setTailorError(message)
      toast({
        title: message,
        variant: 'destructive',
      })
      return
    }

    if (!jobDescription.trim()) return

    setIsTailorLoading(true)
    setTailorError(null)

    try {
      const response = await fetch('/api/ai/tailor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cvId,
          cvData: data,
          jobTitle,
          company,
          jobDescription,
          saveToHistory: true,
        }),
      })

      const payload = await readApiResponse<TailorResponse>(response)

      if (!response.ok) {
        const message =
          response.status === 403 && payload.code === 'PRO_PLAN_REQUIRED'
            ? 'Job description tailoring is available on Pro plan only.'
            : payload.error || 'Failed to tailor CV'
        throw new Error(message)
      }

      setTailorData(payload); setTailorSource(data); setSelected([])
      await loadJobHistory()
      toast({
        title:
          payload.source === 'heuristic-fallback'
            ? 'Job tailoring ready (heuristic fallback)'
            : 'AI job tailoring ready',
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to tailor CV'
      setTailorError(message)
      toast({
        title: message,
        variant: 'destructive',
      })
    } finally {
      setIsTailorLoading(false)
    }
  }

  return (
    <Card className="h-full min-h-0">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Sparkles className="h-5 w-5" />
          AI Career Assistant
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 min-h-0 overflow-y-auto space-y-4">
        <p className="text-xs text-muted-foreground">AI actions send career content to the configured provider (Groq or OpenRouter), without your photo or contact details. Scores estimate content quality; they do not measure ATS certification or hiring probability. Review every proposed claim.</p>
        {[reviewSource,tailorSource,condenseSource].some(source => source && JSON.stringify(source)!==JSON.stringify(data)) && (
          <p role="status" className="rounded border bg-amber-50 p-2 text-xs text-amber-900">Your CV changed since these suggestions. Applied or manually edited fields are protected. Run the relevant action again for updated suggestions and scores.</p>
        )}
        {!isProUser && <p className="text-xs"><a className="underline" href={PRO_CONTACT_URL}>Contact Us to Upgrade to Pro</a>. Online payment integration coming soon.</p>}
        <div className="space-y-3 rounded border p-3">
          <p className="font-medium text-sm">Fit a readable page</p>
          <Button size="sm" variant="outline" disabled={isCondensing} onClick={handleCondense}>{isCondensing ? 'Suggesting reductions...' : 'Suggest shorter content'}</Button>
          {condensation && <div className="space-y-3 text-xs">
            <p>{condensation.source !== 'heuristic-fallback' ? 'AI suggestions' : 'Local wording suggestions'}: {condensation.explanation}</p>
            <p><strong>Current summary:</strong> {data.summary}</p><p><strong>Proposed:</strong> {condensation.summary}</p>
            <Button size="sm" variant="outline" disabled={!canReplaceAISummary(data,condenseSource,condensation.summary)} onClick={() => onApplySummary(condensation.summary)}>Apply shorter summary</Button>
            {condensation.experienceRewrites.map(rewrite => <div className="space-y-2 border-t pt-2" key={rewrite.experienceId}>
              <p>{data.experience.find(item => item.id === rewrite.experienceId)?.role}</p>
              <p><strong>Current:</strong> {data.experience.find(item => item.id === rewrite.experienceId)?.bullets.join('; ')}</p>
              <p><strong>Proposed:</strong> {rewrite.bullets.join('; ')}</p><p>{rewrite.rationale}</p>
              <Button size="sm" variant="outline" disabled={!canReplaceAIExperience(data,condenseSource,rewrite.experienceId,rewrite.bullets)} onClick={() => onApplyExperienceBullets(rewrite.experienceId,rewrite.bullets)}>Apply shorter bullets</Button>
            </div>)}
            <Button variant="ghost" size="sm" onClick={() => setCondensation(null)}>Dismiss reduction suggestions</Button>
            <p>After applying, open Preview to compile and verify the page count. Use Undo AI change to recover earlier wording.</p>
          </div>}
        </div>

        <div className="pr-1">
          <div className="space-y-4">
            <div className="rounded-lg border bg-primary/5 p-3">
              <p className="text-sm font-medium">How to use this assistant</p>
              <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                <p>1. Run a CV review first to see ATS gaps and quick fixes.</p>
                <p>2. Paste a job description to tailor your summary, keywords, and bullets.</p>
                <p>3. Apply only the changes that match your real experience, then save a new version.</p>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                Keep this panel open while results are loading. Provider failures return labelled local checks.
              </p>
            </div>

            <div className="rounded-lg border bg-muted/30 p-3">
              <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                <Shield className="h-4 w-4" />
                1. Review Your CV
              </div>
              <p className="mb-3 text-xs text-muted-foreground">
                Review content quality, then compare and apply suggestions grounded in your existing experience.
              </p>
              {reviewError && (
                <div className="mb-3 rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                  <div className="flex items-start gap-2">
                    <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    <div>
                      <p className="font-medium">AI review failed</p>
                      <p className="mt-1">{reviewError}</p>
                    </div>
                  </div>
                </div>
              )}
              <Button onClick={handleReview} disabled={isReviewLoading} className="w-full">
                {isReviewLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                Run AI ATS Review
              </Button>
              {isReviewLoading && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Reviewing CV content and readability...
                </p>
              )}
            </div>

            {reviewData && (
              <div className="space-y-3 rounded-lg border p-3">
                {reviewData.source === 'heuristic-fallback' && (
                  <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                    <p>AI was unavailable, so this review used the local ATS heuristic engine.</p>
                    {reviewData.aiError && <p className="mt-1">Reason: {reviewData.aiError}</p>}
                  </div>
                )}
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-md bg-muted p-2">
                    <div className={cn('text-2xl font-bold', scoreTone)}>{reviewData.review.atsReadinessScore}%</div>
                    <div className="text-[11px] text-muted-foreground">Content estimate</div>
                  </div>
                  <div className="rounded-md bg-muted p-2">
                    <div className="text-2xl font-bold text-blue-600">{reviewData.review.recruiterReadabilityScore}%</div>
                    <div className="text-[11px] text-muted-foreground">Readability</div>
                  </div>
                  <div className="rounded-md bg-muted p-2">
                    <div className="text-2xl font-bold text-slate-700">{reviewData.heuristicReport.overallScore}%</div>
                    <div className="text-[11px] text-muted-foreground">Heuristic</div>
                  </div>
                </div>

                <Progress value={reviewData.review.overallScore} className="h-2" />

                <div className="rounded-md border bg-primary/5 p-3">
                  <p className="text-sm font-medium">AI Snapshot</p>
                  <p className="mt-1 text-xs text-muted-foreground">{reviewData.review.executiveSummary}</p>
                </div>

                <div>
                  <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    Strengths
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {reviewData.review.strengths.map((item) => (
                      <Badge key={item} variant="secondary" className="bg-green-100 text-green-700">
                        {item}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                    <AlertTriangle className="h-4 w-4 text-yellow-600" />
                    Risks
                  </div>
                  <ul className="space-y-1">
                    {reviewData.review.risks.map((item) => (
                      <li key={item} className="text-xs text-muted-foreground">
                        - {item}
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                    <Lightbulb className="h-4 w-4 text-primary" />
                    Priority Actions
                  </div>
                  <div className="space-y-2">
                    {reviewData.review.priorityActions.map((action) => (
                      <div key={`${action.section}-${action.title}`} className="rounded-md border p-2">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-medium">{action.title}</p>
                          <Badge variant="outline">{action.impact}</Badge>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">{action.reason}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2 rounded-md border p-3">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Wand2 className="h-4 w-4 text-primary" />
                    Rewritten Summary
                  </div>
                  <p className="text-xs text-muted-foreground"><strong>Current:</strong> {data.summary}</p><p className="text-xs text-muted-foreground"><strong>Proposed:</strong> {reviewData.review.rewrittenSummary}</p>
                  <Button size="sm" variant="outline" disabled={!canReplaceAISummary(data,reviewSource,reviewData.review.rewrittenSummary)} onClick={() => onApplySummary(reviewData.review.rewrittenSummary)}>
                    Apply Summary
                  </Button>
                </div>

                {reviewData.review.skillsToAdd.length > 0 && (
                  <div className="space-y-2 rounded-md border p-3">
                    <div className="text-sm font-medium">Recommended Skills to Add</div>
                    <div className="flex flex-wrap gap-1">
                      {reviewData.review.skillsToAdd.map((skill) => (
                        <label key={skill} className="flex items-center gap-1 text-xs"><input type="checkbox" checked={selected.includes(`skill:${skill}`)} onChange={() => toggle(`skill:${skill}`)} />{skill}</label>
                      ))}
                    </div>
                    <Button size="sm" variant="outline" onClick={() => onAddSkills(reviewData.review.skillsToAdd.filter(skill => selected.includes(`skill:${skill}`)))}>
                      Add Selected Skills
                    </Button>
                  </div>
                )}
              </div>
            )}

            <div className="rounded-lg border bg-muted/30 p-3">
              <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                <Briefcase className="h-4 w-4" />
                2. Tailor For A Job (Pro)
              </div>
              <p className="mb-3 text-xs text-muted-foreground">
                Paste a role description to get a targeted summary, missing keywords, interview angles, and bullet rewrites.
              </p>
              {!isProUser && (
                <div className="mb-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                  <div className="flex items-start gap-2">
                    <Lock className="mt-0.5 h-4 w-4 shrink-0" />
                    <div>
                      <p className="font-medium">Pro feature</p>
                      <p className="mt-1">
                        Job description tailoring is locked on Free plan. Upgrade to Pro to unlock this action.
                      </p>
                    </div>
                  </div>
                </div>
              )}
              {tailorError && (
                <div className="mb-3 rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                  <div className="flex items-start gap-2">
                    <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    <div>
                      <p className="font-medium">Job tailoring failed</p>
                      <p className="mt-1">{tailorError}</p>
                    </div>
                  </div>
                </div>
              )}
              <div className="space-y-3">
                {isProUser && jobHistory.length > 0 && (
                  <div className="rounded-md border bg-background p-3">
                    <p className="mb-2 text-xs font-medium">Recent job targets</p>
                    <div className="space-y-2">
                      {jobHistory.slice(0, 3).map((item) => (
                        <div key={item.id} className="flex items-center justify-between gap-2 text-xs">
                          <div className="min-w-0">
                            <p className="truncate font-medium">{item.title}</p>
                            {item.company && <p className="truncate text-muted-foreground">{item.company}</p>}
                          </div>
                          {typeof item.match_score === 'number' && (
                            <Badge variant="outline">{item.match_score}%</Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div className="space-y-1">
                  <Label htmlFor="ai-target-job-title" className="text-xs font-medium">
                    Target Job Title
                  </Label>
                  <Input
                    id="ai-target-job-title"
                    placeholder="Senior Product Designer"
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="ai-target-company" className="text-xs font-medium">
                    Company Name
                  </Label>
                  <Input
                    id="ai-target-company"
                    placeholder="Company name (optional)"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="ai-job-description" className="text-xs font-medium">
                    Job Description
                  </Label>
                  <Textarea
                    id="ai-job-description"
                    placeholder="Paste the job description here..."
                    value={jobDescription}
                maxLength={20000}
                    onChange={(e) => setJobDescription(e.target.value)}
                    className="min-h-40"
                  />
                </div>
                <Button onClick={handleTailor} disabled={!isProUser || isTailorLoading || !jobDescription.trim()} className="w-full">
                  {isTailorLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="mr-2 h-4 w-4" />
                  )}
                  {isProUser ? 'Tailor CV for This Role' : 'Tailor CV for This Role (Pro)'}
                </Button>
                {isTailorLoading && (
                  <p className="text-xs text-muted-foreground">
                    Comparing your CV against the job description and generating safe, fact-based suggestions...
                  </p>
                )}
              </div>
            </div>

            {tailorData && (
              <div className="space-y-3 rounded-lg border p-3">
                {tailorData.source === 'heuristic-fallback' && (
                  <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                    <p>AI was unavailable, so this tailoring package used local keyword and ATS heuristics.</p>
                    {tailorData.aiError && <p className="mt-1">Reason: {tailorData.aiError}</p>}
                  </div>
                )}
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-md bg-muted p-2">
                    <div className="text-2xl font-bold text-primary">{tailorData.analysis.matchScore}%</div>
                    <div className="text-[11px] text-muted-foreground">AI Match</div>
                  </div>
                  <div className="rounded-md bg-muted p-2">
                    <div className="text-2xl font-bold text-blue-600">{tailorData.analysis.atsFitScore}%</div>
                    <div className="text-[11px] text-muted-foreground">Content fit estimate</div>
                  </div>
                  <div className="rounded-md bg-muted p-2">
                    <div className="text-2xl font-bold text-slate-700">{tailorData.heuristicMatch.score}%</div>
                    <div className="text-[11px] text-muted-foreground">Keyword Match</div>
                  </div>
                </div>

                <div className="rounded-md border bg-primary/5 p-3">
                  <p className="text-sm font-medium">Tailoring Snapshot</p>
                  <p className="mt-1 text-xs text-muted-foreground">{tailorData.analysis.executiveSummary}</p>
                </div>

                <div className="space-y-2 rounded-md border p-3">
                  <div className="text-sm font-medium">Tailored Summary</div>
                  <p className="text-xs text-muted-foreground"><strong>Current:</strong> {data.summary}</p><p className="text-xs text-muted-foreground"><strong>Proposed:</strong> {tailorData.analysis.tailoredSummary}</p>
                  <label className="flex gap-2 text-xs"><input type="checkbox" checked={selected.includes('summary')} onChange={() => toggle('summary')} />Include proposed summary</label>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" disabled={!canReplaceAISummary(data,tailorSource,tailorData.analysis.tailoredSummary)} onClick={() => onApplySummary(tailorData.analysis.tailoredSummary)}>
                      Apply Summary
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={selected.length===0 || (selected.includes('summary') && !canReplaceAISummary(data,tailorSource,tailorData.analysis.tailoredSummary)) || tailorData.analysis.experienceRewrites.some(rewrite => selected.includes(`experience:${rewrite.experienceId}`) && !canReplaceAIExperience(data,tailorSource,rewrite.experienceId,rewrite.bullets))}
                      onClick={() =>
                        onApplyTailoredPackage({
                          summary: selected.includes('summary') ? tailorData.analysis.tailoredSummary : data.summary,
                          skills: tailorData.analysis.skillsToAdd.filter(skill => selected.includes(`skill:${skill}`)),
                          experienceRewrites: tailorData.analysis.experienceRewrites.filter(rewrite => selected.includes(`experience:${rewrite.experienceId}`)),
                        })
                      }
                    >
                      Apply Selected Changes
                    </Button>
                  </div>
                </div>

                {tailorData.analysis.skillsToAdd.length > 0 && (
                  <div className="space-y-2 rounded-md border p-3">
                    <div className="text-sm font-medium">Keywords / Skills to Add</div>
                    <div className="flex flex-wrap gap-1">
                      {tailorData.analysis.skillsToAdd.map((skill) => (
                        <label key={skill} className="flex items-center gap-1 text-xs"><input type="checkbox" checked={selected.includes(`skill:${skill}`)} onChange={() => toggle(`skill:${skill}`)} />{skill}</label>
                      ))}
                    </div>
                    <Button size="sm" variant="outline" onClick={() => onAddSkills(tailorData.analysis.skillsToAdd.filter(skill => selected.includes(`skill:${skill}`)))}>
                      Add Selected Skills
                    </Button>
                  </div>
                )}

                {tailorData.analysis.experienceRewrites.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-sm font-medium">Experience Rewrites</div>
                    {tailorData.analysis.experienceRewrites.map((rewrite) => (
                      <div key={rewrite.experienceId} className="rounded-md border p-3">
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <p className="text-sm font-medium">{rewrite.role}</p>
                            <p className="text-xs text-muted-foreground">{rewrite.company}</p>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={!canReplaceAIExperience(data,tailorSource,rewrite.experienceId,rewrite.bullets)}
                            onClick={() => onApplyExperienceBullets(rewrite.experienceId, rewrite.bullets)}
                          >
                            Apply Bullets
                          </Button>
                        </div>
                        <label className="flex gap-2 text-xs mt-2"><input type="checkbox" checked={selected.includes(`experience:${rewrite.experienceId}`)} onChange={() => toggle(`experience:${rewrite.experienceId}`)} />Include these bullets</label>
                        <p className="text-xs text-muted-foreground mt-2"><strong>Current:</strong> {data.experience.find(item => item.id === rewrite.experienceId)?.bullets.join('; ')}</p>
                        <ul className="mt-2 space-y-1">
                          {rewrite.bullets.map((bullet) => (
                            <li key={bullet} className="text-xs text-muted-foreground">
                              - {bullet}
                            </li>
                          ))}
                        </ul>
                        <p className="mt-2 text-[11px] text-muted-foreground">{rewrite.rationale}</p>
                      </div>
                    ))}
                  </div>
                )}

                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-md border p-3">
                    <div className="mb-2 text-sm font-medium">Matched Strengths</div>
                    <div className="flex flex-wrap gap-1">
                      {tailorData.analysis.matchedStrengths.map((item) => (
                        <Badge key={item} variant="secondary" className="bg-green-100 text-green-700">
                          {item}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-md border p-3">
                    <div className="mb-2 text-sm font-medium">Missing Keywords</div>
                    <div className="flex flex-wrap gap-1">
                      {tailorData.analysis.missingKeywords.map((item) => (
                        <Badge key={item} variant="secondary" className="bg-red-100 text-red-700">
                          {item}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="rounded-md border p-3">
                  <div className="mb-2 text-sm font-medium">Interview Talking Points</div>
                  <ul className="space-y-1">
                    {tailorData.analysis.interviewTalkingPoints.map((point) => (
                      <li key={point} className="text-xs text-muted-foreground">
                        - {point}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
