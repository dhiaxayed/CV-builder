import { z } from 'zod'

export const aiPriorityActionSchema = z.object({
  title: z.string(),
  reason: z.string(),
  impact: z.enum(['high', 'medium', 'low']),
  section: z.enum(['basics', 'summary', 'experience', 'education', 'skills', 'projects', 'general']),
})

export const aiSectionFeedbackSchema = z.object({
  section: z.enum(['summary', 'experience', 'skills', 'education', 'projects', 'general']),
  verdict: z.enum(['strong', 'mixed', 'weak']),
  feedback: z.string(),
})

export const aiAtsReviewSchema = z.object({
  overallScore: z.number().int().min(0).max(100),
  atsReadinessScore: z.number().int().min(0).max(100),
  recruiterReadabilityScore: z.number().int().min(0).max(100),
  executiveSummary: z.string(),
  strengths: z.array(z.string()).min(2).max(6),
  risks: z.array(z.string()).min(2).max(6),
  priorityActions: z.array(aiPriorityActionSchema).min(3).max(6),
  sectionFeedback: z.array(aiSectionFeedbackSchema).min(3).max(6),
  rewrittenSummary: z.string(),
  skillsToAdd: z.array(z.string()).max(12),
})

export type AIAtsReview = z.infer<typeof aiAtsReviewSchema>

export const aiExperienceRewriteSchema = z.object({
  experienceId: z.string(),
  role: z.string(),
  company: z.string(),
  bullets: z.array(z.string()).min(2).max(5),
  rationale: z.string(),
})

export const aiJobTailorSchema = z.object({
  targetRole: z.string(),
  company: z.string(),
  matchScore: z.number().int().min(0).max(100),
  atsFitScore: z.number().int().min(0).max(100),
  executiveSummary: z.string(),
  matchedStrengths: z.array(z.string()).min(2).max(6),
  missingKeywords: z.array(z.string()).max(15),
  recruiterConcerns: z.array(z.string()).min(2).max(6),
  tailoredSummary: z.string(),
  skillsToAdd: z.array(z.string()).max(12),
  experienceRewrites: z.array(aiExperienceRewriteSchema).max(4),
  interviewTalkingPoints: z.array(z.string()).min(3).max(6),
  versionNote: z.string(),
})

export type AIJobTailorAnalysis = z.infer<typeof aiJobTailorSchema>
