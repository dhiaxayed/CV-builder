import type { CVData } from '@/lib/types/cv'

/** Suggestions may finish after the user edits. Replace only unchanged fields. */
export function canReplaceAISummary(current:CVData, source:CVData|null, proposed:string) {
  return Boolean(source && source.summary===current.summary && proposed!==current.summary)
}

export function canReplaceAIExperience(current:CVData, source:CVData|null, id:string, bullets:string[]) {
  const before=source?.experience.find(item => item.id===id)
  const now=current.experience.find(item => item.id===id)
  return Boolean(before && now && JSON.stringify(before)===JSON.stringify(now) && JSON.stringify(now.bullets)!==JSON.stringify(bullets))
}
