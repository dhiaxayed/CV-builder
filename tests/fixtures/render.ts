import { createSampleCVData, type CVData } from '../../lib/types/cv'

export function renderFixture(): CVData {
  const data = createSampleCVData()
  data.basics.name = 'José François'
  data.basics.title = 'Software Engineer'
  data.summary = 'Software engineer building reliable web applications with React, TypeScript and PostgreSQL. Delivered faster services and mentored junior engineers.'
  data.experience = data.experience.map((item,index) => ({ ...item, bullets:item.bullets.slice(0,index === 0 ? 2 : 1), technologies:item.technologies?.slice(0,3) }))
  data.skills = data.skills.slice(0,2)
  data.projects[0].bullets = data.projects[0].bullets.slice(0,1)
  data.customSections = [{ id:'volunteer',title:'Community',type:'bullets',content:['Mentored students at a local coding club.'] }]
  return data
}
export function overflowFixture(): CVData {
  const data = renderFixture()
  data.experience = Array.from({ length:20 },(_,index) => ({ ...data.experience[0],id:`exp-${index}`,company:`Company ${index}`,bullets:Array.from({ length:5 },(_,bullet) => `Delivered service ${index}-${bullet}, collaborating with customers and engineers to improve reliability, performance and maintainability across production applications.`) }))
  return data
}
