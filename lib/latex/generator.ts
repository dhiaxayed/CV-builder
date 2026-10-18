import { CVData } from '../types/cv'
import { resolveTemplateId, COLOR_THEMES, type TemplateId } from '../templates'

const special: Record<string,string> = { '\\': '\\textbackslash{}', '{':'\\{', '}':'\\}', '$':'\\$', '&':'\\&', '#':'\\#', '%':'\\%', '_':'\\_', '~':'\\textasciitilde{}', '^':'\\textasciicircum{}' }

export function escapeLatex(text: string): string {
  // One pass: escaping braces introduced by another escape corrupts commands.
  return (text || '').replace(/[\\{}$&#%_~^]/g, char => special[char])
    .replace(/\u00a0/g, '~').replace(/[–—]/g, '--').replace(/[‘’]/g, "'").replace(/[“”]/g, "''")
    .replace(/…/g, '\\ldots{}').replace(/•/g, '\\textbullet{}')
}

export function formatDate(value: string): string {
  if (!value) return ''
  const [year, month] = value.split('-')
  const label = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][Number(month)-1]
  return label ? `${label} ${year}` : year
}

export type RenderDensity = 'normal' | 'compact' | 'dense'
type Design = {
  accent: string; font: 'sans' | 'serif'; header: 'left' | 'center' | 'band' | 'split' | 'masthead' | 'contrast' | 'framed' | 'ledger';
  heading: 'rule' | 'plain' | 'box' | 'smallcaps' | 'marker';
  nameSize: number; body: number; margin: number; sectionGap: number;
  mono?: boolean; order?: Array<keyof CVData>;
  layout?: 'rail' | 'numbered' | 'sidebar-left' | 'sidebar-right' | 'identity-rail' | 'balanced';
  entryStyle?: 'timeline' | 'stacked'; sidebar?: Array<keyof CVData>;
  sidebarTint?: boolean; uppercase?: boolean;
}
// Design tokens change typography, composition, order and hierarchy as well as color.
export const TEMPLATE_DESIGNS: Record<TemplateId, Design> = {
  modern: { accent:'2563EB',font:'sans',header:'left',heading:'rule',nameSize:26,body:10.5,margin:15,sectionGap:7 },
  classic: { accent:'222222',font:'serif',header:'center',heading:'smallcaps',nameSize:24,body:10.5,margin:17,sectionGap:8 },
  minimal: { accent:'333333',font:'sans',header:'left',heading:'plain',nameSize:22,body:10.5,margin:18,sectionGap:10 },
  compact: { accent:'1E3A5F',font:'sans',header:'split',heading:'rule',nameSize:21,body:10,margin:12.5,sectionGap:5,entryStyle:'stacked' },
  professional: { accent:'183650',font:'sans',header:'band',heading:'box',nameSize:24,body:10.5,margin:15,sectionGap:7 },
  executive: { accent:'725839',font:'serif',header:'masthead',heading:'plain',nameSize:30,body:10.5,margin:16,sectionGap:9,layout:'rail' },
  banking: { accent:'172334',font:'serif',header:'ledger',heading:'plain',nameSize:23,body:10.5,margin:17,sectionGap:7,entryStyle:'timeline' },
  elegant: { accent:'28645F',font:'serif',header:'center',heading:'smallcaps',nameSize:26,body:10.5,margin:14,sectionGap:7,layout:'sidebar-right',sidebarTint:true },
  creative: { accent:'126B89',font:'sans',header:'split',heading:'marker',nameSize:25,body:10.5,margin:14,sectionGap:8,layout:'identity-rail',sidebarTint:true },
  fancy: { accent:'843478',font:'serif',header:'framed',heading:'smallcaps',nameSize:27,body:10.5,margin:16,sectionGap:8,layout:'numbered' },
  bold: { accent:'202020',font:'sans',header:'contrast',heading:'marker',nameSize:31,body:10.5,margin:14,sectionGap:8,uppercase:true,entryStyle:'stacked' },
  infographic: { accent:'B45309',font:'sans',header:'band',heading:'box',nameSize:24,body:10,margin:13,sectionGap:6,layout:'identity-rail',sidebarTint:true,sidebar:['skills','certifications','languages'] },
  tech: { accent:'14654B',font:'sans',header:'left',heading:'marker',nameSize:25,body:10,margin:14,sectionGap:6,mono:true,layout:'sidebar-left',sidebarTint:true,sidebar:['skills','languages','certifications'],order:['summary','projects','experience','education','awards','customSections'] },
  academic: { accent:'3F3F67',font:'serif',header:'left',heading:'rule',nameSize:24,body:10.5,margin:17,sectionGap:7,layout:'numbered',order:['summary','education','experience','projects','awards','certifications','skills','languages','customSections'] },
  casual: { accent:'246976',font:'sans',header:'center',heading:'plain',nameSize:28,body:10.5,margin:16,sectionGap:9,layout:'sidebar-left',sidebarTint:true,sidebar:['skills','languages'] },
  vintage: { accent:'705439',font:'serif',header:'masthead',heading:'smallcaps',nameSize:25,body:10.5,margin:18,sectionGap:8,layout:'balanced',sidebar:['education','skills','certifications','awards','languages'] },
  timeline: { accent:'315D79',font:'sans',header:'left',heading:'rule',nameSize:28,body:10.5,margin:15,sectionGap:8,entryStyle:'timeline' },
  editorial: { accent:'9A3B32',font:'serif',header:'split',heading:'smallcaps',nameSize:33,body:10.5,margin:15,sectionGap:9,layout:'sidebar-right',sidebar:['summary','skills','languages','certifications'],sidebarTint:false },
  consultant: { accent:'244D50',font:'sans',header:'ledger',heading:'plain',nameSize:26,body:10.5,margin:16,sectionGap:9,layout:'rail',entryStyle:'stacked' },
  architect: { accent:'343D46',font:'sans',header:'contrast',heading:'plain',nameSize:25,body:10.5,margin:14,sectionGap:8,layout:'identity-rail',sidebarTint:true,sidebar:['skills','languages','certifications'],order:['summary','projects','experience','education','awards','customSections'] },
  scholar: { accent:'583A66',font:'serif',header:'center',heading:'rule',nameSize:26,body:10.5,margin:16,sectionGap:7,layout:'sidebar-left',sidebar:['education','certifications','languages'],order:['summary','experience','projects','awards','skills','customSections'] },
  graduate: { accent:'305AA8',font:'sans',header:'band',heading:'rule',nameSize:25,body:10.5,margin:15,sectionGap:8,entryStyle:'stacked',order:['summary','education','projects','skills','experience','certifications','awards','languages','customSections'] },
  legal: { accent:'292526',font:'serif',header:'ledger',heading:'smallcaps',nameSize:24,body:10.5,margin:18,sectionGap:9,entryStyle:'stacked' },
  product: { accent:'254B8A',font:'sans',header:'split',heading:'box',nameSize:29,body:10.5,margin:14,sectionGap:7,layout:'sidebar-right',sidebarTint:true,sidebar:['skills','certifications','languages'],order:['summary','projects','experience','education','awards','customSections'] },
}

function link(url: string | undefined, label?: string): string {
  if (!url) return ''
  try {
    const parsed = new URL(/^[a-z][a-z\d+.-]*:/i.test(url) ? url : `https://${url}`)
    if (!['http:','https:','mailto:'].includes(parsed.protocol)) return escapeLatex(label || url)
    return `\\href{${escapeLatex(parsed.href)}}{\\nolinkurl{${escapeLatex(label || url.replace(/^https?:\/\//i, ''))}}}`
  } catch { return escapeLatex(label || url) }
}

function bullets(items: string[]) {
  const content = items.filter(item => item.trim()).map(item => `\\item ${escapeLatex(item)}`).join('\n')
  return content ? `\\begin{itemize}\n${content}\n\\end{itemize}` : ''
}
function entry(title: string, date: string, subtitle = '', body = '', style?: Design['entryStyle']) {
  const details = `${subtitle ? `{\\color{muted}${escapeLatex(subtitle)}}\\par\n` : ''}${body}\\par\n`
  const stacked = `\\textbf{${escapeLatex(title)}}\\par
${date ? `{\\color{muted}${escapeLatex(date)}}\\par` : ''}${details}`
  const main = style === 'stacked' ? stacked : style === 'timeline'
    ? `\\begin{list}{}{\\setlength{\\leftmargin}{0.20\\linewidth}\\setlength{\\labelwidth}{0.17\\linewidth}\\setlength{\\labelsep}{0.03\\linewidth}\\setlength{\\topsep}{0pt}\\setlength{\\parsep}{2pt}}\\item[{\\parbox[t]{\\labelwidth}{\\RaggedRight\\color{accent}${escapeLatex(date)}}}]\\textbf{${escapeLatex(title)}}\\par
${details}\\end{list}`
    : `\\begin{tabularx}{\\linewidth}{@{}>{\\raggedright\\arraybackslash}X >{\\raggedleft\\arraybackslash}p{0.29\\linewidth}@{}}
\\textbf{${escapeLatex(title)}} & {\\color{muted}${escapeLatex(date)}}\\\\
\\end{tabularx}\\par
${details}`
  return `\\Needspace{3\\baselineskip}
\\ifcvsidebar
${stacked}
\\else
${main}
\\fi
\\vspace{\\entrygap}
`
}

export function generateLatex(data: CVData, template: string, density: RenderDensity = 'normal'): string {
  const id = resolveTemplateId(template)
  const base = TEMPLATE_DESIGNS[id]
  const theme = COLOR_THEMES.find(theme => theme.id === data.appearance?.colorTheme)
  const design = { ...base,accent:theme?.color || base.accent,font:data.appearance?.font && data.appearance.font !== 'template' ? data.appearance.font : base.font }
  const level = density === 'normal' ? 0 : density === 'compact' ? 1 : 2
  const bodySize = Math.max(9.5, design.body - level * 0.5)
  const sectionGap = Math.max(4, design.sectionGap - level * 2)
  const section = (label:string, text:string) => {
    if (!text.trim()) return ''
    const title = escapeLatex(design.uppercase ? label.toUpperCase() : label)
    if (design.layout === 'rail') {
      // A list keeps the margin label alongside a section while allowing its
      // content to break across pages. Minipages would trap long work histories.
      return `\\par\\Needspace{4\\baselineskip}\\begin{list}{}{\\setlength{\\leftmargin}{0.19\\linewidth}\\setlength{\\labelwidth}{0.16\\linewidth}\\setlength{\\labelsep}{0.03\\linewidth}\\setlength{\\topsep}{${sectionGap}pt}\\setlength{\\parsep}{2pt}}\\item[{\\parbox[t]{\\labelwidth}{\\RaggedRight\\hyphenpenalty=10000\\color{accent}\\bfseries ${title}}}]${text}\\end{list}\n`
    }
    return `\\section*{${design.layout === 'numbered' ? '\\stepcounter{cvsection}\\textnormal{\\arabic{cvsection}.}\\quad ' : ''}${title}}\n${text}\n`
  }
  const renderEntry = (title:string, date:string, subtitle='', body='') => entry(title,date,subtitle,body,design.entryStyle)
  const contact = data.basics.contact
  const contactItems = [contact.email ? link(`mailto:${contact.email}`,contact.email) : '', escapeLatex(contact.phone), escapeLatex(contact.location), link(contact.linkedin), link(contact.github), link(contact.website)].filter(Boolean)
  const contacts = contactItems.join(' \\textbar{} ')
  const nameSize = design.layout === 'identity-rail' ? Math.min(23,design.nameSize) : design.nameSize
  const name = `{\\fontsize{${nameSize}}{${nameSize+3}}\\selectfont\\bfseries${design.mono ? '\\ttfamily' : ''}\\color{${design.header === 'contrast' ? 'white' : 'accent'}}${escapeLatex(data.basics.name || 'Your Name')}\\par}`
  const title = `{\\large ${escapeLatex(data.basics.title || 'Curriculum Vitae')}\\par}`
  const photo = data.basics.photoUrl ? '\\includegraphics[width=1.8cm,height=1.8cm,keepaspectratio]{cv_photo.png}\\par' : ''
  const identity = `${name}\\par\\vspace{2pt}${title}\\par\\vspace{3pt}{${contacts}}`
  const railIdentity = `${photo}${name}\\par\\vspace{4pt}${title}\\par\\vspace{9pt}{${contactItems.join('\\par\\vspace{2pt}')}}\\par\\vspace{8pt}`
  const header = design.header === 'band' ? `\\colorbox{accent!8}{\\parbox{\\dimexpr\\linewidth-2\\fboxsep\\relax}{${photo}${identity}}}`
    : design.header === 'contrast' ? `\\colorbox{accent}{\\parbox{\\dimexpr\\linewidth-2\\fboxsep\\relax}{\\color{white}${photo}${identity}}}`
    : design.header === 'framed' ? `\\fcolorbox{accent}{white}{\\parbox{\\dimexpr\\linewidth-2\\fboxsep-2\\fboxrule\\relax}{\\centering${photo}${identity}}}`
    : design.header === 'ledger' ? `\\begin{tabularx}{\\linewidth}{@{}p{0.42\\linewidth} >{\\raggedleft\\arraybackslash}X@{}}${name}\\par
${title} & {\\small ${photo}${contacts}}\\\\\\end{tabularx}\\par{\\color{accent}\\rule{\\linewidth}{0.8pt}}`
    : design.header === 'split' ? photo
      ? `\\begin{tabularx}{\\linewidth}{@{}X r@{}}\\parbox[t]{0.75\\linewidth}{${identity}} & \\includegraphics[width=1.8cm,height=1.8cm,keepaspectratio]{cv_photo.png}\\end{tabularx}`
      : `${identity}\\par\\vspace{4pt}{\\color{accent}\\rule{0.22\\linewidth}{2pt}}`
    : design.header === 'masthead' ? `\\begin{center}\\color{accent}\\rule{\\linewidth}{1.2pt}\\par\\vspace{5pt}${photo}${identity}\\par\\vspace{5pt}\\rule{\\linewidth}{0.4pt}\\end{center}`
    : design.header === 'center' ? `\\begin{center}${photo}${identity}\\end{center}` : `${photo}${identity}`

  const content: Partial<Record<keyof CVData,string>> = {
    summary: section('Profile',escapeLatex(data.summary)),
    experience: section('Experience',data.experience.map(item => renderEntry(item.role,[formatDate(item.startDate),item.current ? 'Present' : formatDate(item.endDate)].filter(Boolean).join(' -- '),[item.company,item.location].filter(Boolean).join(' | '),`${bullets(item.bullets)}${item.technologies?.length ? `\\textit{Technologies: ${escapeLatex(item.technologies.join(', '))}}` : ''}`)).join('\n')),
    education: section('Education',data.education.map(item => renderEntry(item.institution,[formatDate(item.startDate),formatDate(item.endDate)].filter(Boolean).join(' -- '),[item.degree,item.field,item.gpa ? `GPA: ${item.gpa}` : '',item.location].filter(Boolean).join(' | '),bullets(item.highlights || []))).join('\n')),
    skills: section('Skills',data.skills.map(group => `\\textbf{${escapeLatex(group.category)}:} ${escapeLatex(group.skills.join(', '))}\\par`).join('\n')),
    projects: section('Projects',data.projects.map(item => renderEntry(item.name,[formatDate(item.startDate || ''),formatDate(item.endDate || '')].filter(Boolean).join(' -- '),'',`${escapeLatex(item.description)}\\par
${item.url ? `${link(item.url)}\\par` : ''}${item.technologies.length ? `\\textit{${escapeLatex(item.technologies.join(', '))}}\\par` : ''}${bullets(item.bullets)}`)).join('\n')),
    certifications: section('Certifications',data.certifications.map(item => renderEntry(item.name,[formatDate(item.date),item.expirationDate ? `Expires ${formatDate(item.expirationDate)}` : ''].filter(Boolean).join(' | '),item.issuer,link(item.url))).join('\n')),
    awards: section('Awards & Honors',data.awards.map(item => renderEntry(item.title,item.date,item.issuer,escapeLatex(item.description || ''))).join('\n')),
    languages: section('Languages',data.languages.map(item => `${escapeLatex(item.language)} (${escapeLatex(item.proficiency)})`).join(' \\textbar{} ')),
    customSections: data.customSections.map(item => section(item.title,item.type === 'bullets' ? bullets(item.content) : item.content.map(line => escapeLatex(line) + '\\par').join('\n'))).join('\n'),
  }
  const defaultOrder: Array<keyof CVData> = ['summary','experience','education','skills','projects','certifications','awards','languages','customSections']
  const order = [...new Set([...(design.order || defaultOrder), ...defaultOrder])]
  const sidebar: Array<keyof CVData> = design.sidebar || ['skills','education','certifications','languages']
  const rightSidebar = design.layout === 'sidebar-right' || design.layout === 'balanced'
  const identityRail = design.layout === 'identity-rail'
  const hasSidebar = identityRail || rightSidebar || design.layout === 'sidebar-left'
  const mainText = order.filter(key => !sidebar.includes(key)).map(key => content[key]).join('\n')
  const sideText = sidebar.map(key => content[key]).join('\n')
  const darkRail = id === 'architect'
  const rail = `\\cvsidebartrue${darkRail ? '\\begingroup\\color{white}\\colorlet{accent}{white}\\colorlet{muted}{white!80!black}' : ''}${identityRail ? railIdentity : ''}${sideText}${darkRail ? '\\endgroup' : ''}`
  const columnSetup = `\\columnratio{${design.layout === 'balanced' ? '0.53' : rightSidebar ? '0.68' : '0.30'}}\\setlength{\\columnsep}{26pt}${design.sidebarTint ? `\\backgroundcolor{c[${rightSidebar ? 1 : 0}](8pt,6pt)}{${darkRail ? 'railbg' : 'accent!7'}}` : '\\setlength{\\columnseprule}{0.4pt}\\colseprulecolor{accent!30}'}`
  const document = hasSidebar
    ? `${columnSetup}\\begin{paracol}{2}${rightSidebar ? `\\cvsidebarfalse${mainText}\\switchcolumn${rail}` : `${rail}\\switchcolumn\\cvsidebarfalse${mainText}`}\\end{paracol}`
    : order.map(key => content[key]).join('\n')
  const heading = design.heading === 'smallcaps' ? '\\scshape' : design.heading === 'plain' ? '\\normalfont\\bfseries' : '\\bfseries'
  const after = design.heading === 'rule' || design.heading === 'smallcaps' ? '[\\color{accent}\\titlerule]' : ''
  const before = design.heading === 'marker' ? '\\color{accent}\\rule{3pt}{9pt}\\hspace{6pt}' : ''
  return `% CV Builder | template=${id} | density=${density} | body=${bodySize}pt
\\documentclass[10pt,a4paper]{article}
\\usepackage[utf8]{inputenc}
\\usepackage[T1]{fontenc}
\\usepackage{lmodern}
${design.font === 'sans' ? '\\renewcommand{\\familydefault}{\\sfdefault}' : ''}
\\usepackage[margin=${Math.max(12,design.margin-level)}mm]{geometry}
\\usepackage[hidelinks,unicode]{hyperref}
\\usepackage{xcolor,titlesec,enumitem,tabularx,needspace,ragged2e,graphicx,paracol}
\\definecolor{accent}{HTML}{${design.accent}}
\\definecolor{railbg}{HTML}{${design.accent}}
\\definecolor{muted}{HTML}{4B5563}
\\pagestyle{empty}
\\setlength{\\parindent}{0pt}
\\setlength{\\parskip}{${level === 2 ? 1 : 2}pt}
\\newlength{\\entrygap}\\setlength{\\entrygap}{${Math.max(1,3-level)}pt}
\\newif\\ifcvsidebar
\\newcounter{cvsection}
\\setlength{\\tabcolsep}{0pt}
\\setlength{\\fboxsep}{6pt}
\\emergencystretch=2em
\\RaggedRight
\\urlstyle{same}
\\titleformat{\\section}{\\color{accent}\\fontsize{${bodySize+1}}{${bodySize+3}}\\selectfont${heading}}{}{0pt}{${before}}${after}
${design.heading === 'box' ? '\\titleformat{\\section}[block]{\\color{accent}\\bfseries}{}{0pt}{}[\\vspace{-5pt}\\color{accent!25}\\rule{\\linewidth}{2pt}]' : ''}
\\titlespacing*{\\section}{0pt}{${sectionGap}pt}{3pt}
\\setlist[itemize]{leftmargin=1.25em,topsep=1pt,itemsep=${level > 0 ? 0 : 1}pt,parsep=0pt,partopsep=0pt}
\\begin{document}
\\fontsize{${bodySize}}{${bodySize*1.16}}\\selectfont
${identityRail ? '' : header}
\\par\\vspace{${level > 0 ? 3 : 5}pt}
${document}
\\end{document}
`
}
