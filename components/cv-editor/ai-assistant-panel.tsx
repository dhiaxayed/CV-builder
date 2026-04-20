'use client'

import { useMemo, useState } from 'react'
import { AIAtsReview, AIJobTailorAnalysis } from '@/lib/ai/types'
import { ATSReport, CVData } from '@/lib/types/cv'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import {
  Sparkles,
  Loader2,
  Lightbulb,
  Wand2,
  Shield,
  Briefcase,
  CheckCircle2,
  AlertTriangle,
  XCircle,
} from 'lucide-react'
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
}

type TailorResponse = {
  analysis: AIJobTailorAnalysis
  heuristicMatch: {
    extractedKeywords: string[]
    matchedKeywords: string[]
    missingKeywords: string[]
    score: number
    suggestions: string[]
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
  const { toast } = useToast()
  const [isReviewLoading, setIsReviewLoading] = useState(false)
  const [isTailorLoading, setIsTailorLoading] = useState(false)
  const [reviewData, setReviewData] = useState<ReviewResponse | null>(null)
  const [tailorData, setTailorData] = useState<TailorResponse | null>(null)
  const [reviewError, setReviewError] = useState<string | null>(null)
  const [tailorError, setTailorError] = useState<string | null>(null)
  const [jobTitle, setJobTitle] = useState('')
  const [company, setCompany] = useState('')
  const [jobDescription, setJobDescription] = useState('')

  const scoreTone = useMemo(() => {
    const score = reviewData?.review.atsReadinessScore ?? tailorData?.analysis.atsFitScore ?? 0
    if (score >= 75) return 'text-green-600'
    if (score >= 55) return 'text-yellow-600'
    return 'text-red-600'
  }, [reviewData, tailorData])

  const handleReview = async () => {
    setIsReviewLoading(true)
    setReviewError(null)

    try {
      const response = await fetch('/api/ai/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cvId, cvData: data }),
      })

      const payload = (await response.json()) as ReviewResponse & { error?: string }

      if (!response.ok) {
        throw new Error(payload.error || 'Failed to generate AI ATS review')
      }

      setReviewData(payload)
      toast({ title: 'AI ATS review ready' })
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

      const payload = (await response.json()) as TailorResponse & { error?: string }

      if (!response.ok) {
        throw new Error(payload.error || 'Failed to tailor CV')
      }

      setTailorData(payload)
      toast({ title: 'AI job tailoring ready' })
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
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Sparkles className="h-5 w-5" />
          AI Career Assistant
        </CardTitle>
      </CardHeader>
      <CardContent className="h-[calc(100%-72px)]">
        <ScrollArea className="h-full pr-4">
          <div className="space-y-4">
            <div className="rounded-lg border bg-primary/5 p-3">
              <p className="text-sm font-medium">How to use this assistant</p>
              <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                <p>1. Run a CV review first to see ATS gaps and quick fixes.</p>
                <p>2. Paste a job description to tailor your summary, keywords, and bullets.</p>
                <p>3. Apply only the changes that match your real experience, then save a new version.</p>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                Requests on the free model can take 30-60 seconds. Keep this panel open while results are loading.
              </p>
            </div>

            <div className="rounded-lg border bg-muted/30 p-3">
              <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                <Shield className="h-4 w-4" />
                1. Review Your CV
              </div>
              <p className="mb-3 text-xs text-muted-foreground">
                Run a stricter AI ATS and recruiter review, then apply a sharper summary or missing skills.
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
                  Generating a strict ATS review and recruiter readability check...
                </p>
              )}
            </div>

            {reviewData && (
              <div className="space-y-3 rounded-lg border p-3">
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-md bg-muted p-2">
                    <div className={cn('text-2xl font-bold', scoreTone)}>{reviewData.review.atsReadinessScore}%</div>
                    <div className="text-[11px] text-muted-foreground">AI ATS</div>
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
                  <p className="text-xs text-muted-foreground">{reviewData.review.rewrittenSummary}</p>
                  <Button size="sm" variant="outline" onClick={() => onApplySummary(reviewData.review.rewrittenSummary)}>
                    Apply Summary
                  </Button>
                </div>

                {reviewData.review.skillsToAdd.length > 0 && (
                  <div className="space-y-2 rounded-md border p-3">
                    <div className="text-sm font-medium">Recommended Skills to Add</div>
                    <div className="flex flex-wrap gap-1">
                      {reviewData.review.skillsToAdd.map((skill) => (
                        <Badge key={skill} variant="secondary">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                    <Button size="sm" variant="outline" onClick={() => onAddSkills(reviewData.review.skillsToAdd)}>
                      Add Skills to CV
                    </Button>
                  </div>
                )}
              </div>
            )}

            <div className="rounded-lg border bg-muted/30 p-3">
              <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                <Briefcase className="h-4 w-4" />
                2. Tailor For A Job
              </div>
              <p className="mb-3 text-xs text-muted-foreground">
                Paste a role description to get a targeted summary, missing keywords, interview angles, and bullet rewrites.
              </p>
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
                    onChange={(e) => setJobDescription(e.target.value)}
                    className="min-h-40"
                  />
                </div>
                <Button onClick={handleTailor} disabled={isTailorLoading || !jobDescription.trim()} className="w-full">
                  {isTailorLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="mr-2 h-4 w-4" />
                  )}
                  Tailor CV for This Role
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
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-md bg-muted p-2">
                    <div className="text-2xl font-bold text-primary">{tailorData.analysis.matchScore}%</div>
                    <div className="text-[11px] text-muted-foreground">AI Match</div>
                  </div>
                  <div className="rounded-md bg-muted p-2">
                    <div className="text-2xl font-bold text-blue-600">{tailorData.analysis.atsFitScore}%</div>
                    <div className="text-[11px] text-muted-foreground">ATS Fit</div>
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
                  <p className="text-xs text-muted-foreground">{tailorData.analysis.tailoredSummary}</p>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => onApplySummary(tailorData.analysis.tailoredSummary)}>
                      Apply Summary
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        onApplyTailoredPackage({
                          summary: tailorData.analysis.tailoredSummary,
                          skills: tailorData.analysis.skillsToAdd,
                          experienceRewrites: tailorData.analysis.experienceRewrites,
                        })
                      }
                    >
                      Apply Full Package
                    </Button>
                  </div>
                </div>

                {tailorData.analysis.skillsToAdd.length > 0 && (
                  <div className="space-y-2 rounded-md border p-3">
                    <div className="text-sm font-medium">Keywords / Skills to Add</div>
                    <div className="flex flex-wrap gap-1">
                      {tailorData.analysis.skillsToAdd.map((skill) => (
                        <Badge key={skill} variant="secondary">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                    <Button size="sm" variant="outline" onClick={() => onAddSkills(tailorData.analysis.skillsToAdd)}>
                      Add Skills to CV
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
                            onClick={() => onApplyExperienceBullets(rewrite.experienceId, rewrite.bullets)}
                          >
                            Apply Bullets
                          </Button>
                        </div>
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
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
