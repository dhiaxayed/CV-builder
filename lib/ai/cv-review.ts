import { runATSChecks, matchJobDescription, extractKeywords } from '@/lib/ats/checker'
import { CVData } from '@/lib/types/cv'
import { generateStructuredObject } from './openrouter'
import { aiAtsReviewSchema, aiJobTailorSchema } from './types'
import type { AIAtsReview, AIJobTailorAnalysis } from './types'

function buildCVSnapshot(cvData: CVData) {
  return JSON.stringify(
    {
      basics: cvData.basics,
      summary: cvData.summary,
      experience: cvData.experience.map((item) => ({
        id: item.id,
        role: item.role,
        company: item.company,
        location: item.location,
        startDate: item.startDate,
        endDate: item.endDate,
        current: item.current,
        technologies: item.technologies || [],
        bullets: item.bullets,
      })),
      education: cvData.education,
      skills: cvData.skills,
      projects: cvData.projects,
      certifications: cvData.certifications,
      awards: cvData.awards,
      languages: cvData.languages,
    },
    null,
    2
  )
}

function buildHeuristicSummary(cvData: CVData) {
  const report = runATSChecks(cvData)

  return JSON.stringify(
    {
      overallScore: report.overallScore,
      recommendations: report.recommendations,
      checks: report.checks.map((check) => ({
        category: check.category,
        name: check.name,
        status: check.status,
        details: check.details,
      })),
    },
    null,
    2
  )
}

function getTopExperienceBullets(cvData: CVData, limit = 4) {
  return cvData.experience
    .flatMap((item) => item.bullets.map((bullet) => ({ role: item.role, bullet })))
    .filter((item) => item.bullet.trim())
    .slice(0, limit)
}

function buildFallbackAtsReview(cvData: CVData): AIAtsReview {
  const heuristic = runATSChecks(cvData)
  const missingSections = heuristic.checks
    .filter((check) => check.status !== 'pass')
    .map((check) => check.name)
    .slice(0, 4)

  const strengths = [
    cvData.basics.title ? `Clear target title: ${cvData.basics.title}` : 'Basic profile information is present',
    cvData.experience.length > 0 ? `${cvData.experience.length} experience section(s) documented` : 'Experience should be expanded',
    cvData.skills.length > 0 ? 'Skills taxonomy is present' : 'Skills coverage needs expansion',
  ].filter(Boolean)

  const risks = [
    ...heuristic.recommendations.slice(0, 3),
    ...(missingSections.length > 0 ? [`Needs attention in: ${missingSections.join(', ')}`] : []),
  ].slice(0, 4)

  return {
    overallScore: heuristic.overallScore,
    atsReadinessScore: heuristic.overallScore,
    recruiterReadabilityScore: Math.max(45, Math.min(95, heuristic.overallScore + 5)),
    executiveSummary:
      heuristic.overallScore >= 70
        ? 'The CV is broadly ATS-friendly and readable, but still benefits from sharper role targeting and stronger keyword focus.'
        : 'The CV has a workable foundation, but key sections need stronger targeting, clearer evidence, and tighter ATS alignment.',
    strengths: strengths.slice(0, 3),
    risks: risks.length > 0 ? risks : ['Add more role-specific evidence and stronger keywords.'],
    priorityActions: [
      {
        title: 'Tighten the professional summary',
        reason: 'The summary is the fastest way to improve recruiter comprehension and keyword alignment.',
        impact: 'high',
        section: 'summary',
      },
      {
        title: 'Add role-specific keywords to skills',
        reason: 'Stronger skill coverage improves ATS matching and clarifies positioning.',
        impact: 'high',
        section: 'skills',
      },
      {
        title: 'Sharpen bullet points around measurable impact',
        reason: 'Recruiters and ATS systems both benefit from concise, evidence-based bullets.',
        impact: 'medium',
        section: 'experience',
      },
    ],
    sectionFeedback: [
      {
        section: 'summary',
        verdict: cvData.summary ? 'mixed' : 'weak',
        feedback: cvData.summary
          ? 'The summary exists, but it should be more targeted to a specific role and tighter on keywords.'
          : 'Add a professional summary that positions the candidate for the target role.',
      },
      {
        section: 'experience',
        verdict: cvData.experience.length >= 2 ? 'strong' : 'mixed',
        feedback: 'Experience is present, but bullets should emphasize outcomes, technologies, and business impact more consistently.',
      },
      {
        section: 'skills',
        verdict: cvData.skills.length > 0 ? 'mixed' : 'weak',
        feedback: 'Skills should be organized around the target role and include the most important matching keywords.',
      },
    ],
    rewrittenSummary:
      cvData.summary ||
      `${cvData.basics.title || 'Professional'} with experience delivering production systems, collaborating across teams, and driving measurable outcomes.`,
    skillsToAdd: [],
  }
}

function buildFallbackJobTailorAnalysis({
  cvData,
  jobTitle,
  company,
  heuristicMatch,
}: {
  cvData: CVData
  jobTitle: string
  company?: string
  heuristicMatch: ReturnType<typeof matchJobDescription>
}): AIJobTailorAnalysis {
  const atsScore = runATSChecks(cvData).overallScore
  const topBullets = getTopExperienceBullets(cvData, 4)
  const missingKeywords = heuristicMatch.missingKeywords.slice(0, 8)
  const matchedStrengths = heuristicMatch.matchedKeywords.slice(0, 6)

  return {
    targetRole: jobTitle,
    company: company?.trim() || 'Target company',
    matchScore: heuristicMatch.score,
    atsFitScore: Math.round((heuristicMatch.score + atsScore) / 2),
    executiveSummary:
      heuristicMatch.score >= 70
        ? 'The CV already aligns reasonably well with this role. Focus on sharper role framing and stronger evidence around the top matched themes.'
        : 'The CV can be tailored further by aligning the summary, skills, and experience bullets with the most important job requirements.',
    matchedStrengths:
      matchedStrengths.length > 0
        ? matchedStrengths
        : ['Relevant engineering background', 'Production delivery experience', 'Cross-functional collaboration'],
    missingKeywords:
      missingKeywords.length > 0 ? missingKeywords : ['role-specific keywords', 'domain terminology'],
    recruiterConcerns: [
      'The summary can be more directly aligned to the target role.',
      'Some priority job keywords are not yet reflected clearly in the CV.',
      'Experience bullets should foreground the most relevant impact for this role.',
    ],
    tailoredSummary:
      cvData.summary ||
      `${jobTitle} candidate with experience building scalable systems, collaborating cross-functionally, and delivering measurable engineering outcomes.`,
    skillsToAdd: missingKeywords.slice(0, 6),
    experienceRewrites: cvData.experience.slice(0, 2).map((item) => ({
      experienceId: item.id,
      role: item.role,
      company: item.company,
      bullets: item.bullets.filter((bullet) => bullet.trim()).slice(0, 4),
      rationale: 'Preserved factual bullets as a safe fallback while highlighting the most relevant achievements for this target role.',
    })),
    interviewTalkingPoints:
      topBullets.length > 0
        ? topBullets.slice(0, 4).map((item) => `Be ready to discuss: ${item.bullet}`)
        : [
            'Explain how your past work maps to the target role.',
            'Describe the strongest systems or projects you shipped.',
            'Show how you collaborate with product, design, or stakeholders.',
          ],
    versionNote: `Tailored for ${jobTitle}${company ? ` at ${company}` : ''}`,
  }
}

export async function generateAtsReview({
  cvData,
  userId,
}: {
  cvData: CVData
  userId?: string
}) {
  try {
    return await generateStructuredObject({
      schema: aiAtsReviewSchema,
      shapeInstructions: JSON.stringify(
        {
          overallScore: 'integer 0-100',
          atsReadinessScore: 'integer 0-100',
          recruiterReadabilityScore: 'integer 0-100',
          executiveSummary: 'short paragraph',
          strengths: ['string'],
          risks: ['string'],
          priorityActions: [
            {
              title: 'string',
              reason: 'string',
              impact: 'high | medium | low',
              section: 'basics | summary | experience | education | skills | projects | general',
            },
          ],
          sectionFeedback: [
            {
              section: 'summary | experience | skills | education | projects | general',
              verdict: 'strong | mixed | weak',
              feedback: 'string',
            },
          ],
          rewrittenSummary: 'fact-based ATS-friendly summary',
          skillsToAdd: ['string'],
        },
        null,
        2
      ),
      user: userId,
      messages: [
        {
          role: 'system',
          content: [
            'You are a senior resume strategist and ATS optimization expert.',
            'Review the CV for ATS readiness and recruiter readability.',
            'Do not invent experience, metrics, tools, employers, education, or achievements that are not supported by the CV.',
            'You may rewrite phrasing to make the CV sharper and more ATS-friendly, but keep factual claims grounded in the provided CV.',
            'Scores must be realistic and strict, not flattering.',
            'The rewrittenSummary must stay concise, professional, and fact-based.',
            'skillsToAdd should contain only plausible keywords missing from the CV, not fabricated achievements.',
          ].join(' '),
        },
        {
          role: 'user',
          content: [
            'Analyze this CV.',
            '',
            'Heuristic ATS report:',
            buildHeuristicSummary(cvData),
            '',
            'CV data:',
            buildCVSnapshot(cvData),
          ].join('\n'),
        },
      ],
    })
  } catch {
    return buildFallbackAtsReview(cvData)
  }
}

export async function generateJobTailorAnalysis({
  cvData,
  jobTitle,
  company,
  jobDescription,
  userId,
}: {
  cvData: CVData
  jobTitle: string
  company?: string
  jobDescription: string
  userId?: string
}) {
  const heuristicMatch = matchJobDescription(cvData, jobDescription)
  const extractedKeywords = extractKeywords(jobDescription)

  try {
    return {
      heuristicMatch,
      extractedKeywords,
      analysis: await generateStructuredObject({
        schema: aiJobTailorSchema,
        shapeInstructions: JSON.stringify(
          {
            targetRole: 'string',
            company: 'string',
            matchScore: 'integer 0-100',
            atsFitScore: 'integer 0-100',
            executiveSummary: 'short paragraph',
            matchedStrengths: ['string'],
            missingKeywords: ['string'],
            recruiterConcerns: ['string'],
            tailoredSummary: 'fact-based tailored summary',
            skillsToAdd: ['string'],
            experienceRewrites: [
              {
                experienceId: 'must match one of the provided experience ids',
                role: 'string',
                company: 'string',
                bullets: ['2-5 factual bullets'],
                rationale: 'string',
              },
            ],
            interviewTalkingPoints: ['string'],
            versionNote: 'short version label',
          },
          null,
          2
        ),
        user: userId,
        messages: [
          {
            role: 'system',
            content: [
              'You are an elite resume strategist for competitive job seekers.',
              'Tailor the CV to the job description while staying completely truthful.',
              'Never fabricate employers, responsibilities, metrics, certifications, dates, or technologies.',
              'If the CV lacks evidence for a requested skill, surface it as a gap or keyword to add only when plausible.',
              'Use only provided experience IDs in experienceRewrites.',
              'Each experience rewrite must remain ATS-friendly, concrete, and fact-preserving.',
              'The tailoredSummary should be concise, evidence-based, and aligned to the target role.',
              'The versionNote should be a short snapshot label suitable for CV version history.',
            ].join(' '),
          },
          {
            role: 'user',
            content: [
              `Target role: ${jobTitle}`,
              `Target company: ${company || 'Unknown company'}`,
              '',
              'Heuristic keyword match:',
              JSON.stringify(
                {
                  score: heuristicMatch.score,
                  matchedKeywords: heuristicMatch.matchedKeywords,
                  missingKeywords: heuristicMatch.missingKeywords,
                  suggestions: heuristicMatch.suggestions,
                  extractedKeywords,
                },
                null,
                2
              ),
              '',
              'Job description:',
              jobDescription,
              '',
              'CV data:',
              buildCVSnapshot(cvData),
            ].join('\n'),
          },
        ],
      }),
    }
  } catch {
    return {
      heuristicMatch,
      extractedKeywords,
      analysis: buildFallbackJobTailorAnalysis({
        cvData,
        jobTitle,
        company,
        heuristicMatch,
      }),
    }
  }
}
