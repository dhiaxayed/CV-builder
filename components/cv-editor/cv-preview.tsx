'use client'

import { CVData } from '@/lib/types/cv'
import { Card } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'

interface CVPreviewProps {
  data: CVData
  templateId: string
  className?: string
}

// Format date for display
function formatDate(dateStr: string): string {
  if (!dateStr) return ''
  const [year, month] = dateStr.split('-')
  if (!year) return ''
  
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const monthIndex = parseInt(month, 10) - 1
  
  if (isNaN(monthIndex) || monthIndex < 0 || monthIndex > 11) {
    return year
  }
  
  return `${months[monthIndex]} ${year}`
}

export function CVPreview({ data, templateId, className }: CVPreviewProps) {
  // Safe defaults for all arrays and nested objects
  const basics = data?.basics || { name: '', title: '', contact: {} }
  const contact = basics.contact || { email: '', phone: '', location: '', linkedin: '', github: '', website: '' }
  const summary = data?.summary || ''
  const experience = data?.experience || []
  const education = data?.education || []
  const skills = data?.skills || []
  const projects = data?.projects || []
  const certifications = data?.certifications || []
  const awards = data?.awards || []
  const languages = data?.languages || []
  
  // Template-specific styles
  const getTemplateStyles = () => {
    switch (templateId) {
      case 'modern':
      case 'modern-ats':
        return {
          container: 'font-sans',
          header: 'text-center mb-6',
          name: 'text-2xl font-bold text-gray-900',
          title: 'text-lg text-gray-600 mt-1',
          contact: 'text-sm text-gray-500 mt-2 flex flex-wrap justify-center gap-2',
          section: 'mb-5',
          sectionTitle: 'text-sm font-bold text-gray-900 uppercase tracking-wide border-b border-gray-300 pb-1 mb-3',
          itemTitle: 'font-semibold text-gray-900',
          itemSubtitle: 'text-gray-700',
          itemMeta: 'text-sm text-gray-500',
          bullet: 'text-sm text-gray-700 ml-4',
        }
      case 'classic':
      case 'classic-ats':
        return {
          container: 'font-serif',
          header: 'mb-6',
          name: 'text-2xl font-bold text-gray-900',
          title: 'text-base text-gray-700 mt-1',
          contact: 'text-sm text-gray-600 mt-2 space-y-0.5',
          section: 'mb-5',
          sectionTitle: 'text-xs font-bold text-gray-900 uppercase tracking-wider border-b-2 border-gray-900 pb-1 mb-3',
          itemTitle: 'font-bold text-gray-900',
          itemSubtitle: 'text-gray-700',
          itemMeta: 'text-sm text-gray-600 italic',
          bullet: 'text-sm text-gray-700 ml-4',
        }
      case 'minimal':
      case 'minimal-ats':
        return {
          container: 'font-sans',
          header: 'text-center mb-4',
          name: 'text-xl font-bold text-gray-900',
          title: 'text-base text-gray-600',
          contact: 'text-xs text-gray-500 mt-1 flex flex-wrap justify-center gap-1',
          section: 'mb-4',
          sectionTitle: 'text-xs font-bold text-gray-700 uppercase mb-2',
          itemTitle: 'font-semibold text-gray-900 text-sm',
          itemSubtitle: 'text-gray-700 text-sm',
          itemMeta: 'text-xs text-gray-500',
          bullet: 'text-xs text-gray-700 ml-3',
        }
      case 'professional':
        return {
          container: 'font-serif',
          header: 'text-center mb-6 border-b-2 border-blue-900 pb-4',
          name: 'text-3xl font-bold text-blue-900',
          title: 'text-lg text-gray-600 mt-1 italic',
          contact: 'text-sm text-gray-500 mt-3 flex flex-wrap justify-center gap-2',
          section: 'mb-5',
          sectionTitle: 'text-sm font-bold text-blue-900 uppercase tracking-wide border-b border-blue-900 pb-1 mb-3',
          itemTitle: 'font-bold text-gray-900',
          itemSubtitle: 'text-gray-600 italic',
          itemMeta: 'text-sm text-gray-500',
          bullet: 'text-sm text-gray-700 ml-4',
        }
      case 'creative':
        return {
          container: 'font-sans',
          header: 'text-center mb-6',
          name: 'text-3xl font-bold text-slate-800',
          title: 'text-xl text-blue-500 mt-2',
          contact: 'text-sm text-gray-500 mt-3 flex flex-wrap justify-center gap-2',
          section: 'mb-5',
          sectionTitle: 'text-base font-bold text-slate-800 border-b-2 border-blue-400 pb-1 mb-3',
          itemTitle: 'font-bold text-slate-800',
          itemSubtitle: 'text-gray-600',
          itemMeta: 'text-sm text-blue-500',
          bullet: 'text-sm text-gray-700 ml-4',
        }
      case 'academic':
        return {
          container: 'font-serif',
          header: 'text-center mb-6',
          name: 'text-2xl font-bold text-gray-900 tracking-wide',
          title: 'text-lg text-gray-700 mt-1',
          contact: 'text-sm text-gray-600 mt-2 flex flex-wrap justify-center gap-2',
          section: 'mb-5',
          sectionTitle: 'text-sm font-bold text-gray-900 uppercase tracking-wider border-b border-gray-400 pb-1 mb-3',
          itemTitle: 'font-bold text-gray-900',
          itemSubtitle: 'text-gray-700',
          itemMeta: 'text-sm text-gray-500 italic',
          bullet: 'text-sm text-gray-700 ml-4',
        }
      case 'tech':
        return {
          container: 'font-mono',
          header: 'text-center mb-6',
          name: 'text-2xl font-bold text-blue-600',
          title: 'text-lg text-gray-600 mt-1',
          contact: 'text-xs text-gray-500 mt-2 font-mono flex flex-wrap justify-center gap-2',
          section: 'mb-5',
          sectionTitle: 'text-sm font-bold text-blue-600 border-b border-gray-300 pb-1 mb-3',
          itemTitle: 'font-bold text-gray-900',
          itemSubtitle: 'text-gray-700 font-mono text-sm',
          itemMeta: 'text-xs text-gray-500 font-mono',
          bullet: 'text-sm text-gray-700 ml-4',
        }
      case 'executive':
        return {
          container: 'font-serif',
          header: 'text-center mb-6 border-b-2 border-amber-600 pb-4',
          name: 'text-3xl font-bold text-slate-900 tracking-wide',
          title: 'text-xl text-amber-600 mt-2',
          contact: 'text-sm text-gray-500 mt-3 flex flex-wrap justify-center gap-2',
          section: 'mb-5',
          sectionTitle: 'text-sm font-bold text-slate-900 uppercase tracking-wider border-b-2 border-amber-500 pb-1 mb-3',
          itemTitle: 'font-bold text-slate-900',
          itemSubtitle: 'text-gray-700',
          itemMeta: 'text-sm text-gray-500 italic',
          bullet: 'text-sm text-gray-700 ml-4',
        }
      default:
        return {
          container: 'font-sans',
          header: 'text-center mb-6',
          name: 'text-2xl font-bold text-gray-900',
          title: 'text-lg text-gray-600 mt-1',
          contact: 'text-sm text-gray-500 mt-2 flex flex-wrap justify-center gap-2',
          section: 'mb-5',
          sectionTitle: 'text-sm font-bold text-gray-900 uppercase tracking-wide border-b border-gray-300 pb-1 mb-3',
          itemTitle: 'font-semibold text-gray-900',
          itemSubtitle: 'text-gray-700',
          itemMeta: 'text-sm text-gray-500',
          bullet: 'text-sm text-gray-700 ml-4',
        }
    }
  }
  
  const styles = getTemplateStyles()
  
  return (
    <Card className={cn("bg-white shadow-lg", className)}>
      <ScrollArea className="h-full">
        <div className={cn("p-8 min-h-full", styles.container)} style={{ fontSize: '11px', lineHeight: '1.4' }}>
          {/* Header */}
          <header className={styles.header}>
            <h1 className={styles.name}>{basics.name || 'Your Name'}</h1>
            {basics.title && <p className={styles.title}>{basics.title}</p>}
            <div className={styles.contact}>
              {contact.email && <span>{contact.email}</span>}
              {contact.phone && <><span className="text-gray-300">|</span><span>{contact.phone}</span></>}
              {contact.location && <><span className="text-gray-300">|</span><span>{contact.location}</span></>}
              {contact.linkedin && <><span className="text-gray-300">|</span><span>{contact.linkedin}</span></>}
              {contact.github && <><span className="text-gray-300">|</span><span>{contact.github}</span></>}
            </div>
          </header>
          
          {/* Summary */}
          {summary && (
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>Summary</h2>
              <p className="text-sm text-gray-700">{summary}</p>
            </section>
          )}
          
          {/* Experience */}
          {experience.length > 0 && (
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>Experience</h2>
              <div className="space-y-4">
                {experience.map((exp) => (
                  <div key={exp.id}>
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className={styles.itemTitle}>{exp.role}</h3>
                        <p className={styles.itemSubtitle}>{exp.company}{exp.location && `, ${exp.location}`}</p>
                      </div>
                      <span className={styles.itemMeta}>
                        {formatDate(exp.startDate)} – {exp.current ? 'Present' : formatDate(exp.endDate)}
                      </span>
                    </div>
                    {exp.technologies && exp.technologies.length > 0 && (
                      <p className="text-xs text-gray-500 italic mt-1">
                        Technologies: {exp.technologies.join(', ')}
                      </p>
                    )}
                    <ul className="mt-2 space-y-1">
                      {(exp.bullets || []).filter(b => b.trim()).map((bullet, i) => (
                        <li key={i} className={styles.bullet}>• {bullet}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </section>
          )}
          
          {/* Education */}
          {education.length > 0 && (
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>Education</h2>
              <div className="space-y-3">
                {education.map((edu) => (
                  <div key={edu.id}>
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className={styles.itemTitle}>{edu.institution}</h3>
                        <p className={styles.itemSubtitle}>
                          {edu.degree} in {edu.field}
                          {edu.gpa && ` | GPA: ${edu.gpa}`}
                        </p>
                      </div>
                      <span className={styles.itemMeta}>
                        {formatDate(edu.startDate)} – {formatDate(edu.endDate)}
                      </span>
                    </div>
                    {edu.highlights && edu.highlights.length > 0 && (
                      <p className="text-xs text-gray-600 mt-1">{edu.highlights.join(' | ')}</p>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}
          
          {/* Skills */}
          {skills.length > 0 && (
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>Skills</h2>
              <div className="space-y-1">
                {skills.map((group) => (
                  <p key={group.id} className="text-sm">
                    <span className="font-semibold text-gray-900">{group.category}:</span>{' '}
                    <span className="text-gray-700">{(group.skills || []).join(', ')}</span>
                  </p>
                ))}
              </div>
            </section>
          )}
          
          {/* Projects */}
          {projects.length > 0 && (
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>Projects</h2>
              <div className="space-y-3">
                {projects.map((project) => (
                  <div key={project.id}>
                    <h3 className={styles.itemTitle}>
                      {project.name}
                      {project.url && <span className="font-normal text-gray-500 ml-2">| {project.url}</span>}
                    </h3>
                    <p className="text-sm text-gray-700">{project.description}</p>
                    {(project.technologies || []).length > 0 && (
                      <p className="text-xs text-gray-500 italic mt-1">
                        Technologies: {(project.technologies || []).join(', ')}
                      </p>
                    )}
                    {(project.bullets || []).filter(b => b.trim()).length > 0 && (
                      <ul className="mt-1 space-y-0.5">
                        {(project.bullets || []).filter(b => b.trim()).map((bullet, i) => (
                          <li key={i} className={styles.bullet}>• {bullet}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}
          
          {/* Certifications */}
          {certifications.length > 0 && (
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>Certifications</h2>
              <div className="space-y-1">
                {certifications.map((cert) => (
                  <p key={cert.id} className="text-sm">
                    <span className="font-semibold text-gray-900">{cert.name}</span>
                    <span className="text-gray-700"> – {cert.issuer}, {formatDate(cert.date)}</span>
                  </p>
                ))}
              </div>
            </section>
          )}
          
          {/* Awards */}
          {awards.length > 0 && (
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>Awards & Honors</h2>
              <div className="space-y-1">
                {awards.map((award) => (
                  <p key={award.id} className="text-sm">
                    <span className="font-semibold text-gray-900">{award.title}</span>
                    <span className="text-gray-700"> – {award.issuer}, {award.date}</span>
                    {award.description && <span className="text-gray-600"> – {award.description}</span>}
                  </p>
                ))}
              </div>
            </section>
          )}
          
          {/* Languages */}
          {languages.length > 0 && (
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>Languages</h2>
              <p className="text-sm text-gray-700">
                {languages.map(lang => `${lang.language} (${lang.proficiency})`).join(', ')}
              </p>
            </section>
          )}
        </div>
      </ScrollArea>
    </Card>
  )
}
