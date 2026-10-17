import { keywordPresent, KEYWORD_TERMS } from '@/lib/keywords'
import type { CVData } from '@/lib/types/cv'
import type { AIAtsReview, AIJobTailorAnalysis } from './types'


export function candidateEvidence(data: CVData): string {
  // Photos, identifiers, contact details and dates unrelated to a rewrite stay local.
  return [data.basics.title,data.summary,...data.skills.flatMap(group => group.skills),
    ...data.experience.flatMap(item => [item.role,item.company,...item.bullets,...(item.technologies || [])]),
    ...data.projects.flatMap(item => [item.name,item.description,...item.bullets,...item.technologies]),
    ...data.education.flatMap(item => [item.degree,item.field,item.institution,...(item.highlights || [])]),
    ...data.certifications.map(item => `${item.name} ${item.issuer}`),...data.awards.map(item => `${item.title} ${item.description || ''}`),
    ...data.customSections.flatMap(item => [item.title,...item.content]),
  ].join('\n')
}

export function numericClaims(text: string): string[] {
  return (text.match(/(?<![\p{L}\p{N}])\d+(?:[.,]\d+)*(?:\s?(?:%|[kmb]\b\+?|\+))?(?![\p{L}\p{N}])/giu) || []).map(value => value.toLowerCase().replace(/\s/g,''))
}

export function preservesNumericClaims(proposed: string, original: string): boolean {
  const retained = new Set(numericClaims(proposed))
  return numericClaims(original).every(number => retained.has(number))
}

export function hasUnsupportedClaim(proposed: string, evidence: string): boolean {
  const supportedNumbers = new Set(numericClaims(evidence))
  if (numericClaims(proposed).some(number => !supportedNumbers.has(number))) return true
  // Shared technical vocabulary catches unsupported tools beyond the shortlist
  // of credentials below. Exclude words commonly used as ordinary prose.
  const ambiguous = new Set(['go','r','express','spring','rails','less','git','shell','api','apis','microservices','agile','scrum','kanban','lean','waterfall','leadership','communication','collaboration','problem-solving','analytical','strategic','innovative','detail-oriented','adobe'])
  for (const term of KEYWORD_TERMS) {
    if (!ambiguous.has(term) && keywordPresent(proposed,term) && !keywordPresent(evidence,term)) return true
  }
  // Catch newly introduced credentials, named tools, and seniority claims.
  const claims = proposed.match(/\b(?:Ph\.?D|MBA|certified|certification|expert|senior|principal|director|led|managed|AWS|Azure|GCP|React|Python|JavaScript|TypeScript|Docker|Kubernetes|Java|SQL|PostgreSQL|C\+\+)\b/gi) || []
  return claims.some(claim => !keywordPresent(evidence,claim))
}

export function groundReview(review: AIAtsReview, data: CVData): AIAtsReview {
  const evidence = candidateEvidence(data)
  return { ...review,
    rewrittenSummary: hasUnsupportedClaim(review.rewrittenSummary,evidence) ? data.summary : review.rewrittenSummary,
    skillsToAdd: review.skillsToAdd.filter(skill => keywordPresent(evidence,skill)),
  }
}

export function groundTailoring(analysis: AIJobTailorAnalysis, data: CVData): AIJobTailorAnalysis {
  const evidence = candidateEvidence(data)
  const seen = new Set<string>()
  const experienceRewrites = analysis.experienceRewrites.filter(rewrite => {
    const original = data.experience.find(item => item.id === rewrite.experienceId)
    if (!original || seen.has(original.id) || rewrite.role !== original.role || rewrite.company !== original.company || rewrite.bullets.length !== original.bullets.length) return false
    seen.add(original.id)
    const source = [original.role,original.company,...original.bullets,...(original.technologies || [])].join('\n')
    return rewrite.bullets.every((bullet,index) => preservesNumericClaims(bullet,original.bullets[index]) && !hasUnsupportedClaim(bullet,source))
  })
  return { ...analysis,
    tailoredSummary: hasUnsupportedClaim(analysis.tailoredSummary,evidence) ? data.summary : analysis.tailoredSummary,
    skillsToAdd: analysis.skillsToAdd.filter(skill => keywordPresent(evidence,skill)),
    experienceRewrites,
    recruiterConcerns: experienceRewrites.length < analysis.experienceRewrites.length
      ? ['Some generated rewrites were excluded because they changed source facts or bullet structure. Original bullets are unchanged.',...analysis.recruiterConcerns].slice(0,6)
      : analysis.recruiterConcerns,
  }
}
