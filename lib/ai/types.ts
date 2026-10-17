import { z } from 'zod'

const scoreSchema = z.coerce.number().transform(Math.round).pipe(z.number().int().min(0).max(100))

export const aiPriorityActionSchema = z.object({
  title: z.string().max(4000),
  reason: z.string().max(4000),
  impact: z.enum(['high', 'medium', 'low']),
  section: z.enum(['basics', 'summary', 'experience', 'education', 'skills', 'projects', 'general']),
})

export const aiSectionFeedbackSchema = z.object({
  section: z.enum(['summary', 'experience', 'skills', 'education', 'projects', 'general']),
  verdict: z.enum(['strong', 'mixed', 'weak']),
  feedback: z.string().max(4000),
})

export const aiAtsReviewSchema = z.object({
  overallScore: scoreSchema,
  atsReadinessScore: scoreSchema,
  recruiterReadabilityScore: scoreSchema,
  executiveSummary: z.string().max(4000),
  strengths: z.array(z.string().max(4000)).min(1).max(6),
  risks: z.array(z.string().max(4000)).min(1).max(6),
  priorityActions: z.array(aiPriorityActionSchema).min(1).max(6),
  sectionFeedback: z.array(aiSectionFeedbackSchema).min(1).max(6),
  rewrittenSummary: z.string().max(4000),
  skillsToAdd: z.array(z.string().max(4000)).max(12),
})

export type AIAtsReview = z.infer<typeof aiAtsReviewSchema>

export const aiExperienceRewriteSchema = z.object({
  experienceId: z.string().max(4000),
  role: z.string().max(4000),
  company: z.string().max(4000),
  bullets: z.array(z.string().max(4000)).min(1).max(50),
  rationale: z.string().max(4000),
})

export const aiJobTailorSchema = z.object({
  targetRole: z.string().max(4000),
  company: z.string().max(4000),
  matchScore: scoreSchema,
  atsFitScore: scoreSchema,
  executiveSummary: z.string().max(4000),
  matchedStrengths: z.array(z.string().max(4000)).min(1).max(6),
  missingKeywords: z.array(z.string().max(4000)).max(15),
  recruiterConcerns: z.array(z.string().max(4000)).min(1).max(6),
  tailoredSummary: z.string().max(4000),
  skillsToAdd: z.array(z.string().max(4000)).max(12),
  experienceRewrites: z.array(aiExperienceRewriteSchema).max(4),
  interviewTalkingPoints: z.array(z.string().max(4000)).min(1).max(6),
  versionNote: z.string().max(4000),
})

export type AIJobTailorAnalysis = z.infer<typeof aiJobTailorSchema>
