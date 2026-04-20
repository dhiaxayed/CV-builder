import { CVData, ExperienceItem, EducationItem, ProjectItem, SkillGroup, CertificationItem, AwardItem, LanguageItem, CustomSection } from '../types/cv'

// LaTeX special characters that need escaping
const LATEX_SPECIAL_CHARS: Record<string, string> = {
  '\\': '\\textbackslash{}',
  '{': '\\{',
  '}': '\\}',
  '$': '\\$',
  '&': '\\&',
  '#': '\\#',
  '%': '\\%',
  '_': '\\_',
  '~': '\\textasciitilde{}',
  '^': '\\textasciicircum{}',
}

// Escape LaTeX special characters to prevent injection
export function escapeLatex(text: string): string {
  if (!text) return ''
  
  let escaped = text
  // Handle backslash first
  escaped = escaped.replace(/\\/g, '\\textbackslash{}')
  // Then handle other special characters
  escaped = escaped.replace(/[{}$&#%_~^]/g, (match) => LATEX_SPECIAL_CHARS[match] || match)
  
  return escaped
}

// Safe array accessor to prevent "Cannot read properties of undefined" errors
function safeArray<T>(arr: T[] | undefined | null): T[] {
  return arr || []
}

// Format date for display
export function formatDate(dateStr: string): string {
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

// Format date with full month name
export function formatDateFull(dateStr: string): string {
  if (!dateStr) return ''
  const [year, month] = dateStr.split('-')
  if (!year) return ''
  
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
  const monthIndex = parseInt(month, 10) - 1
  
  if (isNaN(monthIndex) || monthIndex < 0 || monthIndex > 11) {
    return year
  }
  
  return `${months[monthIndex]} ${year}`
}

// ============================================================================
// TEMPLATE: MODERN (Clean, Contemporary Design - Jake's Resume Style)
// ============================================================================
export function generateModernTemplate(data: CVData): string {
  const { basics, summary } = data
  
  const contactItems = [
    basics.contact.email,
    basics.contact.phone,
    basics.contact.location,
    basics.contact.linkedin,
    basics.contact.github,
    basics.contact.website,
  ].filter((item): item is string => Boolean(item)).map(escapeLatex).join(' \\textbar{} ')
  
  const experienceSection = data.experience.length > 0 ? `\\resumeSubHeadingListStart
${data.experience.map(exp => {
  const dateRange = exp.current 
    ? `${formatDate(exp.startDate)} -- Present`
    : `${formatDate(exp.startDate)} -- ${formatDate(exp.endDate)}`
  
  const bullets = safeArray(exp.bullets)
    .filter(b => b.trim())
    .map(b => `      \\resumeItem{${escapeLatex(b)}}`)
    .join('\n')
  
  const tech = exp.technologies?.length 
    ? `\n      \\resumeItem{\\textit{Technologies: ${escapeLatex(exp.technologies.join(', '))}}}`
    : ''
  
  return `  \\resumeSubheading
    {${escapeLatex(exp.role)}}{${dateRange}}
    {${escapeLatex(exp.company)}}{${escapeLatex(exp.location)}}
    \\resumeItemListStart
${bullets}${tech}
    \\resumeItemListEnd`
}).join('\n')}
\\resumeSubHeadingListEnd` : ''

  const educationSection = data.education.length > 0 ? `\\resumeSubHeadingListStart
${data.education.map(edu => {
  const dateRange = `${formatDate(edu.startDate)} -- ${formatDate(edu.endDate)}`
  const gpa = edu.gpa ? ` \\textbar{} GPA: ${escapeLatex(edu.gpa)}` : ''
  
  return `  \\resumeSubheading
    {${escapeLatex(edu.institution)}}{${escapeLatex(edu.location)}}
    {${escapeLatex(edu.degree)} in ${escapeLatex(edu.field)}${gpa}}{${dateRange}}`
}).join('\n')}
\\resumeSubHeadingListEnd` : ''

  const skillsSection = data.skills.length > 0 ? `\\begin{itemize}[leftmargin=0.15in, label={}]
  \\small{\\item{
${data.skills.map(g => `    \\textbf{${escapeLatex(g.category)}:} ${escapeLatex(safeArray(g.skills).join(', '))}`).join(' \\\\\n')}
  }}
\\end{itemize}` : ''

  const projectsSection = data.projects.length > 0 ? `\\resumeSubHeadingListStart
${data.projects.map(proj => {
  const url = proj.url ? ` \\textbar{} \\href{${escapeLatex(proj.url)}}{\\underline{Link}}` : ''
  const tech = safeArray(proj.technologies).length 
    ? `${escapeLatex(safeArray(proj.technologies).join(', '))}`
    : ''
  const bullets = safeArray(proj.bullets)
    .filter(b => b.trim())
    .map(b => `      \\resumeItem{${escapeLatex(b)}}`)
    .join('\n')
  
  return `  \\resumeProjectHeading
    {\\textbf{${escapeLatex(proj.name)}}${url}}{${tech}}
    \\resumeItemListStart
${bullets}
    \\resumeItemListEnd`
}).join('\n')}
\\resumeSubHeadingListEnd` : ''

  const certificationsSection = data.certifications.length > 0 ? `\\begin{itemize}[leftmargin=0.15in, label={}]
  \\small{\\item{
${data.certifications.map(c => {
  const expiry = c.expirationDate ? ` (Valid until ${formatDate(c.expirationDate)})` : ''
  return `    \\textbf{${escapeLatex(c.name)}} -- ${escapeLatex(c.issuer)}, ${formatDate(c.date)}${expiry}`
}).join(' \\\\\n')}
  }}
\\end{itemize}` : ''

  const languagesSection = data.languages.length > 0 
    ? data.languages.map(l => `${escapeLatex(l.language)} (${escapeLatex(l.proficiency)})`).join(' \\textbar{} ')
    : ''

  const awardsSection = data.awards.length > 0 ? `\\begin{itemize}[leftmargin=0.15in, label={}]
  \\small{\\item{
${data.awards.map(a => {
  const desc = a.description ? ` -- ${escapeLatex(a.description)}` : ''
  return `    \\textbf{${escapeLatex(a.title)}} -- ${escapeLatex(a.issuer)}, ${escapeLatex(a.date)}${desc}`
}).join(' \\\\\n')}
  }}
\\end{itemize}` : ''

  return `%-------------------------
% Modern CV Template
% Based on Jake's Resume - ATS Optimized
%-------------------------

\\documentclass[letterpaper,11pt]{article}

\\usepackage{latexsym}
\\usepackage[empty]{fullpage}
\\usepackage{titlesec}
\\usepackage{marvosym}
\\usepackage[usenames,dvipsnames]{color}
\\usepackage{verbatim}
\\usepackage{enumitem}
\\usepackage[hidelinks]{hyperref}
\\usepackage{fancyhdr}
\\usepackage[english]{babel}
\\usepackage{tabularx}
\\input{glyphtounicode}

\\pagestyle{fancy}
\\fancyhf{}
\\fancyfoot{}
\\renewcommand{\\headrulewidth}{0pt}
\\renewcommand{\\footrulewidth}{0pt}

% Adjust margins
\\addtolength{\\oddsidemargin}{-0.5in}
\\addtolength{\\evensidemargin}{-0.5in}
\\addtolength{\\textwidth}{1in}
\\addtolength{\\topmargin}{-.5in}
\\addtolength{\\textheight}{1.0in}

\\urlstyle{same}
\\raggedbottom
\\raggedright
\\setlength{\\tabcolsep}{0in}

% Sections formatting
\\titleformat{\\section}{
  \\vspace{-4pt}\\scshape\\raggedright\\large
}{}{0em}{}[\\color{black}\\titlerule \\vspace{-5pt}]

% ATS Parsable
\\pdfgentounicode=1

%-------------------------
% Custom commands
\\newcommand{\\resumeItem}[1]{
  \\item\\small{
    {#1 \\vspace{-2pt}}
  }
}

\\newcommand{\\resumeSubheading}[4]{
  \\vspace{-2pt}\\item
    \\begin{tabular*}{0.97\\textwidth}[t]{l@{\\extracolsep{\\fill}}r}
      \\textbf{#1} & #2 \\\\
      \\textit{\\small#3} & \\textit{\\small #4} \\\\
    \\end{tabular*}\\vspace{-7pt}
}

\\newcommand{\\resumeSubSubheading}[2]{
    \\item
    \\begin{tabular*}{0.97\\textwidth}{l@{\\extracolsep{\\fill}}r}
      \\textit{\\small#1} & \\textit{\\small #2} \\\\
    \\end{tabular*}\\vspace{-7pt}
}

\\newcommand{\\resumeProjectHeading}[2]{
    \\item
    \\begin{tabular*}{0.97\\textwidth}{l@{\\extracolsep{\\fill}}r}
      \\small#1 & #2 \\\\
    \\end{tabular*}\\vspace{-7pt}
}

\\newcommand{\\resumeSubItem}[1]{\\resumeItem{#1}\\vspace{-4pt}}

\\renewcommand\\labelitemii{$\\vcenter{\\hbox{\\tiny$\\bullet$}}$}

\\newcommand{\\resumeSubHeadingListStart}{\\begin{itemize}[leftmargin=0.15in, label={}]}
\\newcommand{\\resumeSubHeadingListEnd}{\\end{itemize}}
\\newcommand{\\resumeItemListStart}{\\begin{itemize}}
\\newcommand{\\resumeItemListEnd}{\\end{itemize}\\vspace{-5pt}}

%-------------------------------------------
\\begin{document}

%----------HEADING----------
\\begin{center}
    \\textbf{\\Huge \\scshape ${escapeLatex(basics.name)}} \\\\ \\vspace{1pt}
    \\small ${escapeLatex(basics.title)} \\\\ \\vspace{1pt}
    ${contactItems}
\\end{center}

${summary ? `%-----------SUMMARY-----------
\\section{Summary}
${escapeLatex(summary)}` : ''}

${experienceSection ? `%-----------EXPERIENCE-----------
\\section{Experience}
${experienceSection}` : ''}

${educationSection ? `%-----------EDUCATION-----------
\\section{Education}
${educationSection}` : ''}

${skillsSection ? `%-----------SKILLS-----------
\\section{Technical Skills}
${skillsSection}` : ''}

${projectsSection ? `%-----------PROJECTS-----------
\\section{Projects}
${projectsSection}` : ''}

${certificationsSection ? `%-----------CERTIFICATIONS-----------
\\section{Certifications}
${certificationsSection}` : ''}

${awardsSection ? `%-----------AWARDS-----------
\\section{Awards \\& Honors}
${awardsSection}` : ''}

${languagesSection ? `%-----------LANGUAGES-----------
\\section{Languages}
${languagesSection}` : ''}

%-------------------------------------------
\\end{document}
`
}

// ============================================================================
// TEMPLATE: CLASSIC (Traditional, Serif Font, Business Professional)
// ============================================================================
export function generateClassicTemplate(data: CVData): string {
  const { basics, summary } = data
  
  const experienceSection = data.experience.length > 0 ? data.experience.map(exp => {
    const dateRange = exp.current 
      ? `${formatDateFull(exp.startDate)} -- Present`
      : `${formatDateFull(exp.startDate)} -- ${formatDateFull(exp.endDate)}`
    const bullets = safeArray(exp.bullets).filter(b => b.trim()).map(b => `    \\item ${escapeLatex(b)}`).join('\n')
    const tech = safeArray(exp.technologies).length 
      ? `\\\\[2pt]\\textit{Technologies: ${escapeLatex(safeArray(exp.technologies).join(', '))}}`
      : ''
    return `\\textbf{${escapeLatex(exp.role)}} \\hfill ${dateRange}\\\\
\\textit{${escapeLatex(exp.company)}}, ${escapeLatex(exp.location)}${tech}
\\begin{itemize}[leftmargin=*, nosep, topsep=4pt]
${bullets}
\\end{itemize}
\\vspace{6pt}`
  }).join('\n') : ''

  const educationSection = data.education.length > 0 ? data.education.map(edu => {
    const dateRange = `${formatDateFull(edu.startDate)} -- ${formatDateFull(edu.endDate)}`
    const gpa = edu.gpa ? ` | GPA: ${escapeLatex(edu.gpa)}` : ''
    return `\\textbf{${escapeLatex(edu.degree)} in ${escapeLatex(edu.field)}} \\hfill ${dateRange}\\\\
\\textit{${escapeLatex(edu.institution)}}, ${escapeLatex(edu.location)}${gpa}
\\vspace{6pt}`
  }).join('\n') : ''

  const skillsSection = data.skills.length > 0 
    ? data.skills.map(g => `\\textbf{${escapeLatex(g.category)}:} ${escapeLatex(safeArray(g.skills).join(', '))}`).join('\\\\[3pt]\n')
    : ''

  const projectsSection = data.projects.length > 0 ? data.projects.map(proj => {
    const url = proj.url ? ` | \\href{${escapeLatex(proj.url)}}{Link}` : ''
    const tech = safeArray(proj.technologies).length 
      ? `\\\\\\textit{Technologies: ${escapeLatex(safeArray(proj.technologies).join(', '))}}`
      : ''
    const bullets = safeArray(proj.bullets).filter(b => b.trim()).map(b => `    \\item ${escapeLatex(b)}`).join('\n')
    return `\\textbf{${escapeLatex(proj.name)}}${url}${tech}
\\begin{itemize}[leftmargin=*, nosep, topsep=4pt]
${bullets}
\\end{itemize}
\\vspace{4pt}`
  }).join('\n') : ''

  const certificationsSection = data.certifications.length > 0 
    ? data.certifications.map(c => {
        const expiry = c.expirationDate ? ` (Expires: ${formatDate(c.expirationDate)})` : ''
        return `\\textbf{${escapeLatex(c.name)}} -- ${escapeLatex(c.issuer)} \\hfill ${formatDate(c.date)}${expiry}`
      }).join('\\\\[2pt]\n')
    : ''

  const languagesSection = data.languages.length > 0 
    ? data.languages.map(l => `${escapeLatex(l.language)} (${escapeLatex(l.proficiency)})`).join(' | ')
    : ''

  const awardsSection = data.awards.length > 0 
    ? data.awards.map(a => {
        const desc = a.description ? ` -- ${escapeLatex(a.description)}` : ''
        return `\\textbf{${escapeLatex(a.title)}} -- ${escapeLatex(a.issuer)} \\hfill ${escapeLatex(a.date)}${desc}`
      }).join('\\\\[2pt]\n')
    : ''

  return `%-------------------------
% Classic CV Template
% Traditional Professional Design
%-------------------------

\\documentclass[11pt,letterpaper]{article}

\\usepackage[utf8]{inputenc}
\\usepackage[T1]{fontenc}
\\usepackage{charter}
\\usepackage[margin=0.75in]{geometry}
\\usepackage{enumitem}
\\usepackage[hidelinks]{hyperref}
\\usepackage{xcolor}
\\usepackage{titlesec}

\\pagestyle{empty}

% Section styling
\\titleformat{\\section}
  {\\large\\bfseries\\scshape}{}{0em}{}[\\titlerule]
\\titlespacing*{\\section}{0pt}{12pt}{8pt}

\\hypersetup{
  colorlinks=true,
  linkcolor=black,
  urlcolor=blue!70!black,
}

\\begin{document}

%----------HEADING----------
\\begin{center}
  {\\LARGE\\bfseries\\scshape ${escapeLatex(basics.name)}}\\\\[4pt]
  {\\large ${escapeLatex(basics.title)}}\\\\[8pt]
  ${basics.contact.email ? `${escapeLatex(basics.contact.email)}` : ''}
  ${basics.contact.phone ? ` \\quad ${escapeLatex(basics.contact.phone)}` : ''}
  ${basics.contact.location ? ` \\quad ${escapeLatex(basics.contact.location)}` : ''}\\\\[2pt]
  ${basics.contact.linkedin ? `${escapeLatex(basics.contact.linkedin)}` : ''}
  ${basics.contact.github ? ` \\quad ${escapeLatex(basics.contact.github)}` : ''}
  ${basics.contact.website ? ` \\quad ${escapeLatex(basics.contact.website)}` : ''}
\\end{center}

${summary ? `\\section{Professional Summary}
${escapeLatex(summary)}` : ''}

${experienceSection ? `\\section{Professional Experience}
${experienceSection}` : ''}

${educationSection ? `\\section{Education}
${educationSection}` : ''}

${skillsSection ? `\\section{Skills}
${skillsSection}` : ''}

${projectsSection ? `\\section{Projects}
${projectsSection}` : ''}

${certificationsSection ? `\\section{Certifications}
${certificationsSection}` : ''}

${awardsSection ? `\\section{Awards \\& Honors}
${awardsSection}` : ''}

${languagesSection ? `\\section{Languages}
${languagesSection}` : ''}

\\end{document}
`
}

// ============================================================================
// TEMPLATE: MINIMAL (Simple, Elegant, Space-Efficient)
// ============================================================================
export function generateMinimalTemplate(data: CVData): string {
  const { basics, summary } = data
  
  const contact = [
    basics.contact.email,
    basics.contact.phone,
    basics.contact.location,
  ].filter((item): item is string => Boolean(item)).map(escapeLatex).join(' $\\cdot$ ')
  
  const links = [
    basics.contact.linkedin,
    basics.contact.github,
    basics.contact.website,
  ].filter((item): item is string => Boolean(item)).map(escapeLatex).join(' $\\cdot$ ')
  
  const experienceSection = data.experience.length > 0 ? data.experience.map(exp => {
    const dateRange = exp.current 
      ? `${formatDate(exp.startDate)} -- Present`
      : `${formatDate(exp.startDate)} -- ${formatDate(exp.endDate)}`
    const bullets = safeArray(exp.bullets).filter(b => b.trim()).map(b => `\\item ${escapeLatex(b)}`).join('\n')
    return `\\textbf{${escapeLatex(exp.role)}} at \\textit{${escapeLatex(exp.company)}} \\hfill ${dateRange}
\\begin{itemize}
${bullets}
\\end{itemize}`
  }).join('\n\\vspace{2pt}\n') : ''

  const educationSection = data.education.length > 0 ? data.education.map(edu => {
    return `\\textbf{${escapeLatex(edu.institution)}} \\hfill ${formatDate(edu.endDate)}\\\\
${escapeLatex(edu.degree)} in ${escapeLatex(edu.field)}${edu.gpa ? ` | GPA: ${escapeLatex(edu.gpa)}` : ''}`
  }).join('\\\\[4pt]\n') : ''

  const skillsSection = data.skills.length > 0 
    ? data.skills.map(g => `\\textbf{${escapeLatex(g.category)}:} ${escapeLatex(safeArray(g.skills).join(', '))}`).join(' | ')
    : ''

  const projectsSection = data.projects.length > 0 ? data.projects.map(proj => {
    const tech = safeArray(proj.technologies).length ? ` (${escapeLatex(safeArray(proj.technologies).join(', '))})` : ''
    return `\\textbf{${escapeLatex(proj.name)}}${tech} -- ${escapeLatex(proj.description)}`
  }).join('\\\\[2pt]\n') : ''

  return `%-------------------------
% Minimal CV Template
% Clean and Space-Efficient
%-------------------------

\\documentclass[10pt,a4paper]{article}

\\usepackage[utf8]{inputenc}
\\usepackage[T1]{fontenc}
\\usepackage{helvet}
\\renewcommand{\\familydefault}{\\sfdefault}
\\usepackage[margin=0.6in]{geometry}
\\usepackage{enumitem}
\\usepackage[hidelinks]{hyperref}
\\usepackage{titlesec}

\\pagestyle{empty}

% Minimal section style
\\titleformat{\\section}
  {\\normalsize\\bfseries\\uppercase}{}{0em}{}
\\titlespacing*{\\section}{0pt}{10pt}{4pt}

\\setlist[itemize]{leftmargin=*, nosep, topsep=2pt}

\\begin{document}

%----------HEADING----------
\\begin{center}
{\\Large\\bfseries ${escapeLatex(basics.name)}}\\\\[2pt]
${escapeLatex(basics.title)}\\\\[4pt]
{\\small ${contact}}\\\\
{\\small ${links}}
\\end{center}

${summary ? `\\section{Summary}
{\\small ${escapeLatex(summary)}}` : ''}

${experienceSection ? `\\section{Experience}
${experienceSection}` : ''}

${educationSection ? `\\section{Education}
${educationSection}` : ''}

${skillsSection ? `\\section{Skills}
${skillsSection}` : ''}

${projectsSection ? `\\section{Projects}
${projectsSection}` : ''}

\\end{document}
`
}

// ============================================================================
// TEMPLATE: PROFESSIONAL (Executive, Business-Focused with Subtle Color)
// ============================================================================
export function generateProfessionalTemplate(data: CVData): string {
  const { basics, summary } = data

  const experienceSection = data.experience.length > 0 ? data.experience.map(exp => {
    const dateRange = exp.current 
      ? `${formatDate(exp.startDate)} -- Present`
      : `${formatDate(exp.startDate)} -- ${formatDate(exp.endDate)}`
    const bullets = safeArray(exp.bullets).filter(b => b.trim()).map(b => `    \\item ${escapeLatex(b)}`).join('\n')
    const tech = exp.technologies?.length 
      ? `\\\\[-4pt]\\hspace{0.5em}\\textit{Key Technologies: ${escapeLatex(exp.technologies.join(', '))}}`
      : ''
    return `\\experienceitem{${escapeLatex(exp.company)}}{${escapeLatex(exp.role)}}{${escapeLatex(exp.location)}}{${dateRange}}${tech}
\\begin{itemize}
${bullets}
\\end{itemize}`
  }).join('\n\\vspace{4pt}\n') : ''

  const educationSection = data.education.length > 0 ? data.education.map(edu => {
    const dateRange = `${formatDate(edu.startDate)} -- ${formatDate(edu.endDate)}`
    const gpa = edu.gpa ? `, GPA: ${escapeLatex(edu.gpa)}` : ''
    return `\\educationitem{${escapeLatex(edu.institution)}}{${escapeLatex(edu.degree)} in ${escapeLatex(edu.field)}${gpa}}{${escapeLatex(edu.location)}}{${dateRange}}`
  }).join('\n') : ''

  const skillsSection = data.skills.length > 0 
    ? data.skills.map(g => `\\skillcategory{${escapeLatex(g.category)}}{${escapeLatex(safeArray(g.skills).join(' $\\bullet$ '))}}`).join('\n')
    : ''

  const projectsSection = data.projects.length > 0 ? data.projects.map(proj => {
    const tech = safeArray(proj.technologies).length ? ` | ${escapeLatex(safeArray(proj.technologies).join(', '))}` : ''
    const bullets = safeArray(proj.bullets).filter(b => b.trim()).map(b => `  \\item ${escapeLatex(b)}`).join('\n')
    return `\\projectitem{${escapeLatex(proj.name)}}{${escapeLatex(proj.description)}${tech}}
\\begin{itemize}
${bullets}
\\end{itemize}`
  }).join('\n') : ''

  const certificationsSection = data.certifications.length > 0 
    ? data.certifications.map(c => `\\textbf{${escapeLatex(c.name)}} $|$ ${escapeLatex(c.issuer)} \\hfill ${formatDate(c.date)}`).join('\\\\\n')
    : ''

  return `%-------------------------
% Professional CV Template
% Executive Business Design
%-------------------------

\\documentclass[11pt,letterpaper]{article}

\\usepackage[utf8]{inputenc}
\\usepackage[T1]{fontenc}
\\usepackage{ebgaramond}
\\usepackage[margin=0.75in]{geometry}
\\usepackage{enumitem}
\\usepackage[hidelinks]{hyperref}
\\usepackage{xcolor}
\\usepackage{titlesec}
\\usepackage{fancyhdr}

\\definecolor{primary}{RGB}{0,51,102}
\\definecolor{secondary}{RGB}{102,102,102}

\\pagestyle{fancy}
\\fancyhf{}
\\renewcommand{\\headrulewidth}{0pt}
\\fancyfoot[C]{\\textcolor{secondary}{\\small Page \\thepage}}

% Section styling
\\titleformat{\\section}
  {\\color{primary}\\large\\bfseries\\scshape}{}{0em}{}[\\color{primary}\\titlerule]
\\titlespacing*{\\section}{0pt}{14pt}{8pt}

% Custom commands
\\newcommand{\\experienceitem}[4]{%
  \\textbf{#1} \\hfill \\textit{#4}\\\\
  \\textit{\\textcolor{secondary}{#2}} \\hfill \\textcolor{secondary}{#3}%
}

\\newcommand{\\educationitem}[4]{%
  \\textbf{#1} \\hfill \\textit{#4}\\\\
  \\textit{#2} \\hfill \\textcolor{secondary}{#3}\\\\[4pt]%
}

\\newcommand{\\skillcategory}[2]{%
  \\textbf{#1:} #2\\\\[2pt]%
}

\\newcommand{\\projectitem}[2]{%
  \\textbf{#1}\\\\
  \\textit{\\textcolor{secondary}{#2}}%
}

\\setlist[itemize]{leftmargin=*, nosep, topsep=4pt}

\\begin{document}

%----------HEADING----------
\\begin{center}
  {\\color{primary}\\Huge\\bfseries\\scshape ${escapeLatex(basics.name)}}\\\\[6pt]
  {\\large\\textit{${escapeLatex(basics.title)}}}\\\\[10pt]
  \\textcolor{secondary}{
    ${basics.contact.email ? `${escapeLatex(basics.contact.email)}` : ''}
    ${basics.contact.phone ? `\\quad $|$ \\quad ${escapeLatex(basics.contact.phone)}` : ''}
    ${basics.contact.location ? `\\quad $|$ \\quad ${escapeLatex(basics.contact.location)}` : ''}
  }\\\\[2pt]
  \\textcolor{secondary}{
    ${basics.contact.linkedin ? `${escapeLatex(basics.contact.linkedin)}` : ''}
    ${basics.contact.github ? `\\quad $|$ \\quad ${escapeLatex(basics.contact.github)}` : ''}
    ${basics.contact.website ? `\\quad $|$ \\quad ${escapeLatex(basics.contact.website)}` : ''}
  }
\\end{center}

${summary ? `\\section{Executive Summary}
${escapeLatex(summary)}` : ''}

${experienceSection ? `\\section{Professional Experience}
${experienceSection}` : ''}

${educationSection ? `\\section{Education}
${educationSection}` : ''}

${skillsSection ? `\\section{Core Competencies}
${skillsSection}` : ''}

${projectsSection ? `\\section{Key Projects}
${projectsSection}` : ''}

${certificationsSection ? `\\section{Certifications}
${certificationsSection}` : ''}

${data.languages.length > 0 ? `\\section{Languages}
${data.languages.map(l => `${escapeLatex(l.language)} (${escapeLatex(l.proficiency)})`).join(' $|$ ')}` : ''}

\\end{document}
`
}

// ============================================================================
// TEMPLATE: CREATIVE (Modern Design with Visual Appeal)
// ============================================================================
export function generateCreativeTemplate(data: CVData): string {
  const { basics, summary } = data

  const experienceSection = data.experience.length > 0 ? data.experience.map(exp => {
    const dateRange = exp.current 
      ? `${formatDate(exp.startDate)} -- Present`
      : `${formatDate(exp.startDate)} -- ${formatDate(exp.endDate)}`
    const bullets = safeArray(exp.bullets).filter(b => b.trim()).map(b => `    \\item ${escapeLatex(b)}`).join('\n')
    const tech = exp.technologies?.length 
      ? `\\\\[2pt]\\colorbox{lightgray!30}{\\small\\strut ${escapeLatex(exp.technologies.join(' | '))}}`
      : ''
    return `\\cvevent{${escapeLatex(exp.role)}}{${escapeLatex(exp.company)}}{${dateRange}}{${escapeLatex(exp.location)}}${tech}
\\begin{itemize}[leftmargin=*, nosep]
${bullets}
\\end{itemize}`
  }).join('\n\\vspace{8pt}\n') : ''

  const educationSection = data.education.length > 0 ? data.education.map(edu => {
    const gpa = edu.gpa ? ` | GPA: ${escapeLatex(edu.gpa)}` : ''
    return `\\cvevent{${escapeLatex(edu.degree)} in ${escapeLatex(edu.field)}}{${escapeLatex(edu.institution)}}{${formatDate(edu.endDate)}}{${escapeLatex(edu.location)}}${gpa}`
  }).join('\n\\vspace{4pt}\n') : ''

  const skillsSection = data.skills.length > 0 ? data.skills.map(g => {
    const skillTags = safeArray(g.skills).map(s => `\\cvtag{${escapeLatex(s)}}`).join(' ')
    return `\\textbf{${escapeLatex(g.category)}}\\\\[4pt]
${skillTags}`
  }).join('\n\\vspace{6pt}\n') : ''

  const projectsSection = data.projects.length > 0 ? data.projects.map(proj => {
    const url = proj.url ? ` (\\href{${escapeLatex(proj.url)}}{link})` : ''
    const tech = safeArray(proj.technologies).length 
      ? `\\\\[2pt]${safeArray(proj.technologies).map(t => `\\cvtag{${escapeLatex(t)}}`).join(' ')}`
      : ''
    return `\\textbf{${escapeLatex(proj.name)}}${url}\\\\
\\textit{${escapeLatex(proj.description)}}${tech}`
  }).join('\n\\vspace{6pt}\n') : ''

  return `%-------------------------
% Creative CV Template
% Modern Design with Visual Appeal
%-------------------------

\\documentclass[11pt,a4paper]{article}

\\usepackage[utf8]{inputenc}
\\usepackage[T1]{fontenc}
\\usepackage{lmodern}
\\usepackage[margin=0.75in]{geometry}
\\usepackage{enumitem}
\\usepackage[hidelinks]{hyperref}
\\usepackage{xcolor}
\\usepackage{tikz}
\\usepackage{titlesec}
\\usepackage{multicol}

\\definecolor{accent}{RGB}{52,152,219}
\\definecolor{emphasis}{RGB}{44,62,80}
\\definecolor{body}{RGB}{102,102,102}

\\pagestyle{empty}

% Section styling with color
\\titleformat{\\section}
  {\\color{emphasis}\\Large\\bfseries}{}{0em}{}[\\color{accent}\\titlerule]
\\titlespacing*{\\section}{0pt}{12pt}{8pt}

% Custom commands
\\newcommand{\\cvevent}[4]{%
  {\\large\\textbf{\\color{emphasis}#1}}\\\\[2pt]
  \\textbf{#2} \\hfill {\\color{accent}#3}\\\\
  {\\color{body}#4}\\\\[2pt]
}

\\newcommand{\\cvtag}[1]{%
  \\tikz[baseline]\\node[anchor=base,draw=accent!50,rounded corners=3pt,inner xsep=4pt,inner ysep=2pt,text height=1.5ex,text depth=.25ex,fill=accent!10]{\\small\\color{emphasis}#1};
}

\\newcommand{\\divider}{\\textcolor{accent!30}{\\hrulefill}\\\\[4pt]}

\\setlist[itemize]{leftmargin=*, nosep, topsep=4pt, label={\\color{accent}$\\bullet$}}

\\begin{document}

%----------HEADING----------
\\begin{center}
  {\\color{emphasis}\\fontsize{28pt}{32pt}\\selectfont\\bfseries ${escapeLatex(basics.name)}}\\\\[8pt]
  {\\Large\\color{accent}${escapeLatex(basics.title)}}\\\\[12pt]
  {\\color{body}
    ${basics.contact.email ? `${escapeLatex(basics.contact.email)}` : ''}
    ${basics.contact.phone ? ` $\\cdot$ ${escapeLatex(basics.contact.phone)}` : ''}
    ${basics.contact.location ? ` $\\cdot$ ${escapeLatex(basics.contact.location)}` : ''}
  }\\\\[4pt]
  {\\color{accent}
    ${basics.contact.linkedin ? `\\href{${escapeLatex(basics.contact.linkedin)}}{LinkedIn}` : ''}
    ${basics.contact.github ? ` $\\cdot$ \\href{${escapeLatex(basics.contact.github)}}{GitHub}` : ''}
    ${basics.contact.website ? ` $\\cdot$ \\href{${escapeLatex(basics.contact.website)}}{Website}` : ''}
  }
\\end{center}

\\vspace{8pt}

${summary ? `\\section{About Me}
{\\color{body}${escapeLatex(summary)}}` : ''}

${experienceSection ? `\\section{Experience}
${experienceSection}` : ''}

${educationSection ? `\\section{Education}
${educationSection}` : ''}

${skillsSection ? `\\section{Skills}
${skillsSection}` : ''}

${projectsSection ? `\\section{Projects}
${projectsSection}` : ''}

${data.certifications.length > 0 ? `\\section{Certifications}
${data.certifications.map(c => `\\textbf{${escapeLatex(c.name)}} -- ${escapeLatex(c.issuer)} \\hfill {\\color{accent}${formatDate(c.date)}}`).join('\\\\\n')}` : ''}

${data.languages.length > 0 ? `\\section{Languages}
${data.languages.map(l => `\\cvtag{${escapeLatex(l.language)} -- ${escapeLatex(l.proficiency)}}`).join(' ')}` : ''}

\\end{document}
`
}

// ============================================================================
// TEMPLATE: ACADEMIC (For Researchers, Professors, Scientists)
// ============================================================================
export function generateAcademicTemplate(data: CVData): string {
  const { basics, summary } = data

  const experienceSection = data.experience.length > 0 ? data.experience.map(exp => {
    const dateRange = exp.current 
      ? `${formatDate(exp.startDate)} -- present`
      : `${formatDate(exp.startDate)} -- ${formatDate(exp.endDate)}`
    const bullets = safeArray(exp.bullets).filter(b => b.trim()).map(b => `  \\item ${escapeLatex(b)}`).join('\n')
    return `\\entry{${dateRange}}{${escapeLatex(exp.role)}}{${escapeLatex(exp.company)}, ${escapeLatex(exp.location)}}
\\begin{itemize}
${bullets}
\\end{itemize}`
  }).join('\n\n') : ''

  const educationSection = data.education.length > 0 ? data.education.map(edu => {
    const dateRange = `${formatDate(edu.startDate)} -- ${formatDate(edu.endDate)}`
    const gpa = edu.gpa ? `\\\\GPA: ${escapeLatex(edu.gpa)}` : ''
    const highlights = edu.highlights?.filter(h => h.trim()).map(h => escapeLatex(h)).join('; ')
    return `\\entry{${dateRange}}{${escapeLatex(edu.degree)} in ${escapeLatex(edu.field)}}{${escapeLatex(edu.institution)}, ${escapeLatex(edu.location)}}${gpa}${highlights ? `\\\\\\textit{${highlights}}` : ''}`
  }).join('\n\n') : ''

  const projectsSection = data.projects.length > 0 ? data.projects.map(proj => {
    const dateRange = proj.startDate && proj.endDate 
      ? `${formatDate(proj.startDate)} -- ${formatDate(proj.endDate)}`
      : ''
    const bullets = safeArray(proj.bullets).filter(b => b.trim()).map(b => `  \\item ${escapeLatex(b)}`).join('\n')
    return `\\entry{${dateRange}}{${escapeLatex(proj.name)}}{${escapeLatex(proj.description)}}
\\begin{itemize}
${bullets}
\\end{itemize}`
  }).join('\n\n') : ''

  return `%-------------------------
% Academic CV Template
% For Researchers, Professors, Scientists
%-------------------------

\\documentclass[11pt,a4paper]{article}

\\usepackage[utf8]{inputenc}
\\usepackage[T1]{fontenc}
\\usepackage{libertine}
\\usepackage[margin=1in]{geometry}
\\usepackage{enumitem}
\\usepackage[hidelinks]{hyperref}
\\usepackage{titlesec}

\\pagestyle{plain}

% Section styling
\\titleformat{\\section}
  {\\large\\bfseries\\scshape}{}{0em}{}[\\titlerule]
\\titlespacing*{\\section}{0pt}{14pt}{8pt}

% Entry command for timeline items
\\newcommand{\\entry}[3]{%
  \\noindent\\textbf{#2}\\hfill\\textit{#1}\\\\
  #3\\\\[4pt]
}

\\setlist[itemize]{leftmargin=*, nosep, topsep=2pt}

\\begin{document}

%----------HEADING----------
\\begin{center}
  {\\LARGE\\bfseries\\scshape ${escapeLatex(basics.name)}}\\\\[4pt]
  {\\large ${escapeLatex(basics.title)}}\\\\[10pt]
  ${basics.contact.email || ''}
  ${basics.contact.phone ? ` \\quad ${escapeLatex(basics.contact.phone)}` : ''}
  ${basics.contact.location ? ` \\quad ${escapeLatex(basics.contact.location)}` : ''}\\\\[2pt]
  ${basics.contact.website || ''}
  ${basics.contact.github ? ` \\quad ${escapeLatex(basics.contact.github)}` : ''}
\\end{center}

${summary ? `\\section{Research Interests}
${escapeLatex(summary)}` : ''}

${educationSection ? `\\section{Education}
${educationSection}` : ''}

${experienceSection ? `\\section{Academic \\& Professional Experience}
${experienceSection}` : ''}

${projectsSection ? `\\section{Research Projects}
${projectsSection}` : ''}

${data.skills.length > 0 ? `\\section{Technical Skills}
${data.skills.map(g => `\\textbf{${escapeLatex(g.category)}:} ${escapeLatex(safeArray(g.skills).join(', '))}`).join('\\\\[2pt]\n')}` : ''}

${data.certifications.length > 0 ? `\\section{Certifications \\& Training}
${data.certifications.map(c => `\\textbf{${escapeLatex(c.name)}}, ${escapeLatex(c.issuer)} \\hfill ${formatDate(c.date)}`).join('\\\\\n')}` : ''}

${data.awards.length > 0 ? `\\section{Honors \\& Awards}
\\begin{itemize}[leftmargin=*]
${data.awards.map(a => {
  const desc = a.description ? ` -- ${escapeLatex(a.description)}` : ''
  return `  \\item \\textbf{${escapeLatex(a.title)}}, ${escapeLatex(a.issuer)}, ${escapeLatex(a.date)}${desc}`
}).join('\n')}
\\end{itemize}` : ''}

${data.languages.length > 0 ? `\\section{Languages}
${data.languages.map(l => `${escapeLatex(l.language)} (${escapeLatex(l.proficiency)})`).join(', ')}` : ''}

\\end{document}
`
}

// ============================================================================
// TEMPLATE: TECH (Software Developer, Engineer Focus)
// ============================================================================
export function generateTechTemplate(data: CVData): string {
  const { basics, summary } = data

  const experienceSection = data.experience.length > 0 ? data.experience.map(exp => {
    const dateRange = exp.current 
      ? `${formatDate(exp.startDate)} - Present`
      : `${formatDate(exp.startDate)} - ${formatDate(exp.endDate)}`
    const bullets = safeArray(exp.bullets).filter(b => b.trim()).map(b => `    \\item ${escapeLatex(b)}`).join('\n')
    const tech = exp.technologies?.length 
      ? `\\\\[2pt]\\texttt{${escapeLatex(exp.technologies.join(' | '))}}`
      : ''
    return `\\jobentry{${escapeLatex(exp.role)}}{${escapeLatex(exp.company)}}{${escapeLatex(exp.location)}}{${dateRange}}${tech}
\\begin{itemize}
${bullets}
\\end{itemize}`
  }).join('\n\\vspace{4pt}\n') : ''

  const projectsSection = data.projects.length > 0 ? data.projects.map(proj => {
    const url = proj.url ? ` | \\href{${escapeLatex(proj.url)}}{GitHub}` : ''
    const tech = safeArray(proj.technologies).length 
      ? `\\\\\\texttt{${escapeLatex(safeArray(proj.technologies).join(' | '))}}`
      : ''
    const bullets = safeArray(proj.bullets).filter(b => b.trim()).map(b => `  \\item ${escapeLatex(b)}`).join('\n')
    return `\\projectentry{${escapeLatex(proj.name)}${url}}{${escapeLatex(proj.description)}}${tech}
\\begin{itemize}
${bullets}
\\end{itemize}`
  }).join('\n\\vspace{4pt}\n') : ''

  const skillsSection = data.skills.length > 0 ? `\\begin{multicols}{2}
${data.skills.map(g => `\\skillsection{${escapeLatex(g.category)}}
${safeArray(g.skills).map(s => `\\texttt{${escapeLatex(s)}}`).join(' $\\bullet$ ')}`).join('\n\\vspace{4pt}\n')}
\\end{multicols}` : ''

  return `%-------------------------
% Tech CV Template
% Software Developer & Engineer Focus
%-------------------------

\\documentclass[10pt,a4paper]{article}

\\usepackage[utf8]{inputenc}
\\usepackage[T1]{fontenc}
\\usepackage{inconsolata}
\\usepackage{lmodern}
\\usepackage[margin=0.6in]{geometry}
\\usepackage{enumitem}
\\usepackage[hidelinks]{hyperref}
\\usepackage{xcolor}
\\usepackage{titlesec}
\\usepackage{multicol}

\\definecolor{codeblue}{RGB}{0,102,204}
\\definecolor{codegray}{RGB}{102,102,102}

\\pagestyle{empty}

% Section styling
\\titleformat{\\section}
  {\\color{codeblue}\\large\\bfseries}{}{0em}{}[\\color{codegray}\\titlerule]
\\titlespacing*{\\section}{0pt}{10pt}{6pt}

% Custom commands
\\newcommand{\\jobentry}[4]{%
  {\\large\\textbf{#1}} \\hfill \\texttt{#4}\\\\
  \\textit{#2}, #3\\\\[2pt]
}

\\newcommand{\\projectentry}[2]{%
  {\\large\\textbf{#1}}\\\\
  \\textit{\\color{codegray}#2}\\\\[2pt]
}

\\newcommand{\\skillsection}[1]{%
  {\\textbf{\\color{codeblue}#1}}\\\\[2pt]
}

\\setlist[itemize]{leftmargin=*, nosep, topsep=2pt, label={\\color{codeblue}$\\bullet$}}

\\begin{document}

%----------HEADING----------
\\begin{center}
  {\\color{codeblue}\\Huge\\bfseries ${escapeLatex(basics.name)}}\\\\[4pt]
  {\\large ${escapeLatex(basics.title)}}\\\\[8pt]
  ${basics.contact.email ? `\\texttt{${escapeLatex(basics.contact.email)}}` : ''}
  ${basics.contact.phone ? ` $|$ ${escapeLatex(basics.contact.phone)}` : ''}
  ${basics.contact.github ? ` $|$ \\href{${escapeLatex(basics.contact.github)}}{GitHub}` : ''}
  ${basics.contact.linkedin ? ` $|$ \\href{${escapeLatex(basics.contact.linkedin)}}{LinkedIn}` : ''}\\\\[2pt]
  ${basics.contact.website ? `\\href{${escapeLatex(basics.contact.website)}}{${escapeLatex(basics.contact.website)}}` : ''}
\\end{center}

${summary ? `\\section{About}
${escapeLatex(summary)}` : ''}

${data.skills.length > 0 ? `\\section{Tech Stack}
${skillsSection}` : ''}

${experienceSection ? `\\section{Experience}
${experienceSection}` : ''}

${projectsSection ? `\\section{Projects}
${projectsSection}` : ''}

${data.education.length > 0 ? `\\section{Education}
${data.education.map(edu => {
  return `\\textbf{${escapeLatex(edu.institution)}} \\hfill ${formatDate(edu.endDate)}\\\\
${escapeLatex(edu.degree)} in ${escapeLatex(edu.field)}${edu.gpa ? ` | GPA: ${escapeLatex(edu.gpa)}` : ''}`
}).join('\\\\[6pt]\n')}` : ''}

${data.certifications.length > 0 ? `\\section{Certifications}
${data.certifications.map(c => `\\textbf{${escapeLatex(c.name)}} -- ${escapeLatex(c.issuer)} \\hfill ${formatDate(c.date)}`).join('\\\\\n')}` : ''}

\\end{document}
`
}

// ============================================================================
// TEMPLATE: EXECUTIVE (C-Level, Senior Management)
// ============================================================================
export function generateExecutiveTemplate(data: CVData): string {
  const { basics, summary } = data

  const experienceSection = data.experience.length > 0 ? data.experience.map(exp => {
    const dateRange = exp.current 
      ? `${formatDate(exp.startDate)} -- Present`
      : `${formatDate(exp.startDate)} -- ${formatDate(exp.endDate)}`
    const bullets = safeArray(exp.bullets).filter(b => b.trim()).map(b => `  \\item ${escapeLatex(b)}`).join('\n')
    return `\\position{${escapeLatex(exp.role)}}{${escapeLatex(exp.company)}}{${dateRange}}{${escapeLatex(exp.location)}}
\\begin{achievements}
${bullets}
\\end{achievements}`
  }).join('\n\\vspace{8pt}\n') : ''

  return `%-------------------------
% Executive CV Template
% C-Level & Senior Management
%-------------------------

\\documentclass[11pt,letterpaper]{article}

\\usepackage[utf8]{inputenc}
\\usepackage[T1]{fontenc}
\\usepackage{ebgaramond}
\\usepackage[margin=0.85in]{geometry}
\\usepackage{enumitem}
\\usepackage[hidelinks]{hyperref}
\\usepackage{xcolor}
\\usepackage{titlesec}

\\definecolor{navy}{RGB}{0,31,63}
\\definecolor{gold}{RGB}{180,155,100}

\\pagestyle{empty}

% Section styling
\\titleformat{\\section}
  {\\color{navy}\\Large\\bfseries\\scshape}{}{0em}{}[\\color{gold}\\titlerule[1pt]]
\\titlespacing*{\\section}{0pt}{16pt}{10pt}

% Custom commands
\\newcommand{\\position}[4]{%
  {\\large\\textbf{\\color{navy}#1}}\\\\[2pt]
  \\textbf{#2} \\hfill \\textit{#3}\\\\
  \\textit{#4}\\\\[4pt]
}

\\newlist{achievements}{itemize}{1}
\\setlist[achievements]{leftmargin=*, nosep, topsep=4pt, label={\\color{gold}$\\bullet$}}

\\begin{document}

%----------HEADING----------
\\begin{center}
  {\\color{navy}\\fontsize{26pt}{30pt}\\selectfont\\bfseries\\scshape ${escapeLatex(basics.name)}}\\\\[8pt]
  {\\Large\\color{gold}${escapeLatex(basics.title)}}\\\\[12pt]
  ${basics.contact.email || ''} ${basics.contact.phone ? `\\quad|\\quad ${escapeLatex(basics.contact.phone)}` : ''} ${basics.contact.location ? `\\quad|\\quad ${escapeLatex(basics.contact.location)}` : ''}\\\\[4pt]
  ${basics.contact.linkedin || ''} ${basics.contact.website ? `\\quad|\\quad ${escapeLatex(basics.contact.website)}` : ''}
\\end{center}

\\vspace{8pt}

${summary ? `\\section{Executive Profile}
${escapeLatex(summary)}` : ''}

${experienceSection ? `\\section{Leadership Experience}
${experienceSection}` : ''}

${data.education.length > 0 ? `\\section{Education}
${data.education.map(edu => {
  return `\\textbf{${escapeLatex(edu.degree)} in ${escapeLatex(edu.field)}}\\\\
${escapeLatex(edu.institution)}, ${escapeLatex(edu.location)} \\hfill ${formatDate(edu.endDate)}`
}).join('\\\\[8pt]\n')}` : ''}

${data.skills.length > 0 ? `\\section{Core Competencies}
${data.skills.map(g => `\\textbf{${escapeLatex(g.category)}:} ${escapeLatex(safeArray(g.skills).join(' $\\bullet$ '))}`).join('\\\\[4pt]\n')}` : ''}

${data.certifications.length > 0 ? `\\section{Board Memberships \\& Certifications}
${data.certifications.map(c => `\\textbf{${escapeLatex(c.name)}}, ${escapeLatex(c.issuer)} \\hfill ${formatDate(c.date)}`).join('\\\\\n')}` : ''}

${data.awards.length > 0 ? `\\section{Recognition \\& Awards}
${data.awards.map(a => `\\textbf{${escapeLatex(a.title)}}, ${escapeLatex(a.issuer)} \\hfill ${escapeLatex(a.date)}`).join('\\\\\n')}` : ''}

\\end{document}
`
}

// ============================================================================
// TEMPLATE: CASUAL (ModernCV Casual - Friendly & Approachable)
// ============================================================================
export function generateCasualTemplate(data: CVData): string {
  const { basics, summary } = data

  const experienceSection = data.experience.length > 0 ? data.experience.map(exp => {
    const dateRange = exp.current 
      ? `${formatDate(exp.startDate)} -- Present`
      : `${formatDate(exp.startDate)} -- ${formatDate(exp.endDate)}`
    const bullets = safeArray(exp.bullets).filter(b => b.trim()).map(b => `\\item ${escapeLatex(b)}`).join('\n')
    const tech = exp.technologies?.length 
      ? `\\\\\\textit{Technologies: ${escapeLatex(exp.technologies.join(', '))}}`
      : ''
    return `\\cventry{${dateRange}}{${escapeLatex(exp.role)}}{${escapeLatex(exp.company)}}{${escapeLatex(exp.location)}}{}{}${tech}
\\begin{itemize}
${bullets}
\\end{itemize}`
  }).join('\n\\vspace{4pt}\n') : ''

  const educationSection = data.education.length > 0 ? data.education.map(edu => {
    const dateRange = `${formatDate(edu.startDate)} -- ${formatDate(edu.endDate)}`
    const gpa = edu.gpa ? `GPA: ${escapeLatex(edu.gpa)}` : ''
    return `\\cventry{${dateRange}}{${escapeLatex(edu.degree)} in ${escapeLatex(edu.field)}}{${escapeLatex(edu.institution)}}{${escapeLatex(edu.location)}}{${gpa}}{}`
  }).join('\n') : ''

  const skillsSection = data.skills.length > 0 
    ? data.skills.map(g => `\\cvitem{${escapeLatex(g.category)}}{${escapeLatex(safeArray(g.skills).join(', '))}}`).join('\n')
    : ''

  const projectsSection = data.projects.length > 0 ? data.projects.map(proj => {
    const url = proj.url ? ` -- \\href{${escapeLatex(proj.url)}}{Link}` : ''
    const tech = safeArray(proj.technologies).length ? ` (${escapeLatex(safeArray(proj.technologies).join(', '))})` : ''
    return `\\cvitem{${escapeLatex(proj.name)}}{${escapeLatex(proj.description)}${tech}${url}}`
  }).join('\n') : ''

  return `%-------------------------
% Casual CV Template (ModernCV Style)
% Friendly & Approachable Design
%-------------------------

\\documentclass[11pt,a4paper,sans]{moderncv}

\\moderncvstyle{casual}
\\moderncvcolor{blue}

\\usepackage[utf8]{inputenc}
\\usepackage[scale=0.85]{geometry}

% Personal information
\\name{${escapeLatex(basics.name.split(' ')[0] || '')}}{${escapeLatex(basics.name.split(' ').slice(1).join(' ') || '')}}
\\title{${escapeLatex(basics.title)}}
${basics.contact.email ? `\\email{${escapeLatex(basics.contact.email)}}` : ''}
${basics.contact.phone ? `\\phone[mobile]{${escapeLatex(basics.contact.phone)}}` : ''}
${basics.contact.location ? `\\address{${escapeLatex(basics.contact.location)}}{}{}` : ''}
${basics.contact.linkedin ? `\\social[linkedin]{${escapeLatex(basics.contact.linkedin.replace('https://linkedin.com/in/', '').replace('https://www.linkedin.com/in/', ''))}}` : ''}
${basics.contact.github ? `\\social[github]{${escapeLatex(basics.contact.github.replace('https://github.com/', ''))}}` : ''}
${basics.contact.website ? `\\homepage{${escapeLatex(basics.contact.website.replace('https://', '').replace('http://', ''))}}` : ''}

\\begin{document}

\\makecvtitle

${summary ? `\\section{About Me}
${escapeLatex(summary)}` : ''}

${experienceSection ? `\\section{Experience}
${experienceSection}` : ''}

${educationSection ? `\\section{Education}
${educationSection}` : ''}

${skillsSection ? `\\section{Skills}
${skillsSection}` : ''}

${projectsSection ? `\\section{Projects}
${projectsSection}` : ''}

${data.certifications.length > 0 ? `\\section{Certifications}
${data.certifications.map(c => `\\cvitem{${formatDate(c.date)}}{\\textbf{${escapeLatex(c.name)}} -- ${escapeLatex(c.issuer)}}`).join('\n')}` : ''}

${data.languages.length > 0 ? `\\section{Languages}
${data.languages.map(l => `\\cvitemwithcomment{${escapeLatex(l.language)}}{${escapeLatex(l.proficiency)}}{}`).join('\n')}` : ''}

\\end{document}
`
}

// ============================================================================
// TEMPLATE: BANKING (ModernCV Banking - Corporate & Clean)
// ============================================================================
export function generateBankingTemplate(data: CVData): string {
  const { basics, summary } = data

  const experienceSection = data.experience.length > 0 ? data.experience.map(exp => {
    const dateRange = exp.current 
      ? `${formatDate(exp.startDate)} -- Present`
      : `${formatDate(exp.startDate)} -- ${formatDate(exp.endDate)}`
    const bullets = safeArray(exp.bullets).filter(b => b.trim()).map(b => `\\item ${escapeLatex(b)}`).join('\n')
    return `\\cventry{${dateRange}}{${escapeLatex(exp.role)}}{${escapeLatex(exp.company)}}{${escapeLatex(exp.location)}}{}{}
\\begin{itemize}
${bullets}
\\end{itemize}`
  }).join('\n') : ''

  const educationSection = data.education.length > 0 ? data.education.map(edu => {
    const dateRange = `${formatDate(edu.startDate)} -- ${formatDate(edu.endDate)}`
    const gpa = edu.gpa ? `GPA: ${escapeLatex(edu.gpa)}` : ''
    return `\\cventry{${dateRange}}{${escapeLatex(edu.degree)} in ${escapeLatex(edu.field)}}{${escapeLatex(edu.institution)}}{${escapeLatex(edu.location)}}{${gpa}}{}`
  }).join('\n') : ''

  return `%-------------------------
% Banking CV Template (ModernCV Style)
% Corporate & Minimalist Design
%-------------------------

\\documentclass[11pt,a4paper,sans]{moderncv}

\\moderncvstyle{banking}
\\moderncvcolor{black}

\\usepackage[utf8]{inputenc}
\\usepackage[scale=0.85]{geometry}

% Personal information
\\name{${escapeLatex(basics.name.split(' ')[0] || '')}}{${escapeLatex(basics.name.split(' ').slice(1).join(' ') || '')}}
\\title{${escapeLatex(basics.title)}}
${basics.contact.email ? `\\email{${escapeLatex(basics.contact.email)}}` : ''}
${basics.contact.phone ? `\\phone[mobile]{${escapeLatex(basics.contact.phone)}}` : ''}
${basics.contact.location ? `\\address{${escapeLatex(basics.contact.location)}}{}{}` : ''}
${basics.contact.linkedin ? `\\social[linkedin]{${escapeLatex(basics.contact.linkedin.replace('https://linkedin.com/in/', '').replace('https://www.linkedin.com/in/', ''))}}` : ''}
${basics.contact.website ? `\\homepage{${escapeLatex(basics.contact.website.replace('https://', '').replace('http://', ''))}}` : ''}

\\begin{document}

\\makecvtitle

${summary ? `\\section{Professional Summary}
${escapeLatex(summary)}` : ''}

${experienceSection ? `\\section{Professional Experience}
${experienceSection}` : ''}

${educationSection ? `\\section{Education}
${educationSection}` : ''}

${data.skills.length > 0 ? `\\section{Core Competencies}
${data.skills.map(g => `\\cvitem{${escapeLatex(g.category)}}{${escapeLatex(safeArray(g.skills).join(' \\textbullet{} '))}}`).join('\n')}` : ''}

${data.certifications.length > 0 ? `\\section{Professional Certifications}
${data.certifications.map(c => `\\cvitem{${formatDate(c.date)}}{${escapeLatex(c.name)}, ${escapeLatex(c.issuer)}}`).join('\n')}` : ''}

${data.awards.length > 0 ? `\\section{Awards \\& Recognition}
${data.awards.map(a => `\\cvitem{${escapeLatex(a.date)}}{${escapeLatex(a.title)}, ${escapeLatex(a.issuer)}}`).join('\n')}` : ''}

${data.languages.length > 0 ? `\\section{Languages}
${data.languages.map(l => `\\cvitem{${escapeLatex(l.language)}}{${escapeLatex(l.proficiency)}}`).join('\n')}` : ''}

\\end{document}
`
}

// ============================================================================
// TEMPLATE: VINTAGE (ModernCV Oldstyle - Traditional Elegance)
// ============================================================================
export function generateVintageTemplate(data: CVData): string {
  const { basics, summary } = data

  const experienceSection = data.experience.length > 0 ? data.experience.map(exp => {
    const dateRange = exp.current 
      ? `${formatDateFull(exp.startDate)} -- Present`
      : `${formatDateFull(exp.startDate)} -- ${formatDateFull(exp.endDate)}`
    const bullets = safeArray(exp.bullets).filter(b => b.trim()).map(b => `\\item ${escapeLatex(b)}`).join('\n')
    return `\\cventry{${dateRange}}{${escapeLatex(exp.role)}}{${escapeLatex(exp.company)}}{${escapeLatex(exp.location)}}{}{}
\\begin{itemize}
${bullets}
\\end{itemize}`
  }).join('\n\\vspace{4pt}\n') : ''

  const educationSection = data.education.length > 0 ? data.education.map(edu => {
    const dateRange = `${formatDateFull(edu.startDate)} -- ${formatDateFull(edu.endDate)}`
    const gpa = edu.gpa ? `GPA: ${escapeLatex(edu.gpa)}` : ''
    return `\\cventry{${dateRange}}{${escapeLatex(edu.degree)} in ${escapeLatex(edu.field)}}{${escapeLatex(edu.institution)}}{${escapeLatex(edu.location)}}{${gpa}}{}`
  }).join('\n') : ''

  return `%-------------------------
% Vintage CV Template (ModernCV Oldstyle)
% Traditional Elegant Design
%-------------------------

\\documentclass[11pt,a4paper,roman]{moderncv}

\\moderncvstyle{oldstyle}
\\moderncvcolor{burgundy}

\\usepackage[utf8]{inputenc}
\\usepackage[scale=0.82]{geometry}

% Personal information
\\name{${escapeLatex(basics.name.split(' ')[0] || '')}}{${escapeLatex(basics.name.split(' ').slice(1).join(' ') || '')}}
\\title{${escapeLatex(basics.title)}}
${basics.contact.email ? `\\email{${escapeLatex(basics.contact.email)}}` : ''}
${basics.contact.phone ? `\\phone[mobile]{${escapeLatex(basics.contact.phone)}}` : ''}
${basics.contact.location ? `\\address{${escapeLatex(basics.contact.location)}}{}{}` : ''}
${basics.contact.linkedin ? `\\social[linkedin]{${escapeLatex(basics.contact.linkedin.replace('https://linkedin.com/in/', '').replace('https://www.linkedin.com/in/', ''))}}` : ''}
${basics.contact.website ? `\\homepage{${escapeLatex(basics.contact.website.replace('https://', '').replace('http://', ''))}}` : ''}

\\begin{document}

\\makecvtitle

${summary ? `\\section{Personal Statement}
${escapeLatex(summary)}` : ''}

${experienceSection ? `\\section{Career History}
${experienceSection}` : ''}

${educationSection ? `\\section{Education}
${educationSection}` : ''}

${data.skills.length > 0 ? `\\section{Expertise}
${data.skills.map(g => `\\cvitem{${escapeLatex(g.category)}}{${escapeLatex(safeArray(g.skills).join(', '))}}`).join('\n')}` : ''}

${data.projects.length > 0 ? `\\section{Notable Projects}
${data.projects.map(proj => {
  const tech = safeArray(proj.technologies).length ? ` (${escapeLatex(safeArray(proj.technologies).join(', '))})` : ''
  return `\\cvitem{${escapeLatex(proj.name)}}{${escapeLatex(proj.description)}${tech}}`
}).join('\n')}` : ''}

${data.certifications.length > 0 ? `\\section{Certifications}
${data.certifications.map(c => `\\cvitem{${formatDate(c.date)}}{${escapeLatex(c.name)}, ${escapeLatex(c.issuer)}}`).join('\n')}` : ''}

${data.languages.length > 0 ? `\\section{Languages}
${data.languages.map(l => `\\cvitemwithcomment{${escapeLatex(l.language)}}{${escapeLatex(l.proficiency)}}{}`).join('\n')}` : ''}

\\end{document}
`
}

// ============================================================================
// TEMPLATE: FANCY (ModernCV Fancy - Decorative Accents)
// ============================================================================
export function generateFancyTemplate(data: CVData): string {
  const { basics, summary } = data

  const experienceSection = data.experience.length > 0 ? data.experience.map(exp => {
    const dateRange = exp.current 
      ? `${formatDate(exp.startDate)} -- Present`
      : `${formatDate(exp.startDate)} -- ${formatDate(exp.endDate)}`
    const bullets = safeArray(exp.bullets).filter(b => b.trim()).map(b => `\\item ${escapeLatex(b)}`).join('\n')
    const tech = exp.technologies?.length 
      ? `\\\\\\small\\textit{Stack: ${escapeLatex(exp.technologies.join(' | '))}}`
      : ''
    return `\\cventry{${dateRange}}{${escapeLatex(exp.role)}}{${escapeLatex(exp.company)}}{${escapeLatex(exp.location)}}{}{}${tech}
\\begin{itemize}
${bullets}
\\end{itemize}`
  }).join('\n\\vspace{4pt}\n') : ''

  const educationSection = data.education.length > 0 ? data.education.map(edu => {
    const dateRange = `${formatDate(edu.startDate)} -- ${formatDate(edu.endDate)}`
    const gpa = edu.gpa ? `GPA: ${escapeLatex(edu.gpa)}` : ''
    return `\\cventry{${dateRange}}{${escapeLatex(edu.degree)} in ${escapeLatex(edu.field)}}{${escapeLatex(edu.institution)}}{${escapeLatex(edu.location)}}{${gpa}}{}`
  }).join('\n') : ''

  return `%-------------------------
% Fancy CV Template (ModernCV Style)
% Decorative & Stylish Design
%-------------------------

\\documentclass[11pt,a4paper,sans]{moderncv}

\\moderncvstyle{fancy}
\\moderncvcolor{purple}

\\usepackage[utf8]{inputenc}
\\usepackage[scale=0.85]{geometry}

% Personal information
\\name{${escapeLatex(basics.name.split(' ')[0] || '')}}{${escapeLatex(basics.name.split(' ').slice(1).join(' ') || '')}}
\\title{${escapeLatex(basics.title)}}
${basics.contact.email ? `\\email{${escapeLatex(basics.contact.email)}}` : ''}
${basics.contact.phone ? `\\phone[mobile]{${escapeLatex(basics.contact.phone)}}` : ''}
${basics.contact.location ? `\\address{${escapeLatex(basics.contact.location)}}{}{}` : ''}
${basics.contact.linkedin ? `\\social[linkedin]{${escapeLatex(basics.contact.linkedin.replace('https://linkedin.com/in/', '').replace('https://www.linkedin.com/in/', ''))}}` : ''}
${basics.contact.github ? `\\social[github]{${escapeLatex(basics.contact.github.replace('https://github.com/', ''))}}` : ''}
${basics.contact.website ? `\\homepage{${escapeLatex(basics.contact.website.replace('https://', '').replace('http://', ''))}}` : ''}

\\begin{document}

\\makecvtitle

${summary ? `\\section{Profile}
${escapeLatex(summary)}` : ''}

${experienceSection ? `\\section{Experience}
${experienceSection}` : ''}

${educationSection ? `\\section{Education}
${educationSection}` : ''}

${data.skills.length > 0 ? `\\section{Skills}
${data.skills.map(g => `\\cvitem{${escapeLatex(g.category)}}{${escapeLatex(safeArray(g.skills).join(' \\textbullet{} '))}}`).join('\n')}` : ''}

${data.projects.length > 0 ? `\\section{Projects}
${data.projects.map(proj => {
  const url = proj.url ? ` -- \\href{${escapeLatex(proj.url)}}{View}` : ''
  return `\\cvitem{${escapeLatex(proj.name)}}{${escapeLatex(proj.description)}${url}}`
}).join('\n')}` : ''}

${data.certifications.length > 0 ? `\\section{Certifications}
${data.certifications.map(c => `\\cvitem{${formatDate(c.date)}}{${escapeLatex(c.name)} -- ${escapeLatex(c.issuer)}}`).join('\n')}` : ''}

${data.languages.length > 0 ? `\\section{Languages}
${data.languages.map(l => `\\cvitemwithcomment{${escapeLatex(l.language)}}{${escapeLatex(l.proficiency)}}{}`).join('\n')}` : ''}

\\end{document}
`
}

// ============================================================================
// TEMPLATE: ELEGANT (Premium Design with Sidebar)
// ============================================================================
export function generateElegantTemplate(data: CVData): string {
  const { basics, summary } = data

  const contactInfo = [
    basics.contact.email ? `\\faEnvelope\\ ${escapeLatex(basics.contact.email)}` : '',
    basics.contact.phone ? `\\faPhone\\ ${escapeLatex(basics.contact.phone)}` : '',
    basics.contact.location ? `\\faMapMarker\\ ${escapeLatex(basics.contact.location)}` : '',
    basics.contact.linkedin ? `\\faLinkedin\\ ${escapeLatex(basics.contact.linkedin.replace('https://linkedin.com/in/', '').replace('https://www.linkedin.com/in/', ''))}` : '',
    basics.contact.github ? `\\faGithub\\ ${escapeLatex(basics.contact.github.replace('https://github.com/', ''))}` : '',
    basics.contact.website ? `\\faGlobe\\ ${escapeLatex(basics.contact.website.replace('https://', '').replace('http://', ''))}` : '',
  ].filter(Boolean).join('\\\\[4pt]\n    ')

  const experienceSection = data.experience.length > 0 ? data.experience.map(exp => {
    const dateRange = exp.current 
      ? `${formatDate(exp.startDate)} -- Present`
      : `${formatDate(exp.startDate)} -- ${formatDate(exp.endDate)}`
    const bullets = safeArray(exp.bullets).filter(b => b.trim()).map(b => `    \\item ${escapeLatex(b)}`).join('\n')
    const tech = exp.technologies?.length 
      ? `\\\\[2pt]\\textit{\\small ${escapeLatex(exp.technologies.join(' | '))}}`
      : ''
    return `\\experienceentry{${escapeLatex(exp.role)}}{${escapeLatex(exp.company)}}{${dateRange}}{${escapeLatex(exp.location)}}${tech}
\\begin{itemize}[leftmargin=*, nosep]
${bullets}
\\end{itemize}`
  }).join('\n\\vspace{8pt}\n') : ''

  const educationSection = data.education.length > 0 ? data.education.map(edu => {
    const gpa = edu.gpa ? ` | GPA: ${escapeLatex(edu.gpa)}` : ''
    return `\\educationentry{${escapeLatex(edu.degree)} in ${escapeLatex(edu.field)}}{${escapeLatex(edu.institution)}}{${formatDate(edu.endDate)}}{${escapeLatex(edu.location)}${gpa}}`
  }).join('\n\\vspace{4pt}\n') : ''

  return `%-------------------------
% Elegant CV Template
% Premium Design with Sidebar Contact
%-------------------------

\\documentclass[11pt,a4paper]{article}

\\usepackage[utf8]{inputenc}
\\usepackage[T1]{fontenc}
\\usepackage{raleway}
\\renewcommand{\\familydefault}{\\sfdefault}
\\usepackage[left=1cm,right=1cm,top=1cm,bottom=1cm]{geometry}
\\usepackage{enumitem}
\\usepackage[hidelinks]{hyperref}
\\usepackage{xcolor}
\\usepackage{titlesec}
\\usepackage{fontawesome5}
\\usepackage{tikz}
\\usepackage{parskip}

\\definecolor{sidebar}{RGB}{45,55,72}
\\definecolor{main}{RGB}{51,51,51}
\\definecolor{accent}{RGB}{56,178,172}
\\definecolor{light}{RGB}{240,240,240}

\\pagestyle{empty}

% Section styling
\\titleformat{\\section}
  {\\color{sidebar}\\large\\bfseries\\uppercase}{}{0em}{}[\\color{accent}\\titlerule]
\\titlespacing*{\\section}{0pt}{14pt}{8pt}

% Custom commands
\\newcommand{\\experienceentry}[4]{%
  {\\large\\textbf{\\color{sidebar}#1}}\\\\[2pt]
  \\textbf{#2} \\hfill {\\color{accent}#3}\\\\
  {\\color{main}#4}\\\\[4pt]
}

\\newcommand{\\educationentry}[4]{%
  \\textbf{#1}\\\\
  #2 \\hfill {\\color{accent}#3}\\\\
  {\\small\\color{main}#4}\\\\[2pt]
}

\\newcommand{\\skillbar}[2]{%
  \\textbf{#1}\\\\[2pt]
  {\\small #2}\\\\[4pt]
}

\\begin{document}

%----------HEADER WITH SIDEBAR EFFECT----------
\\begin{tikzpicture}[remember picture, overlay]
  \\fill[sidebar] (current page.north west) rectangle ([xshift=6cm, yshift=-4.5cm]current page.north west);
\\end{tikzpicture}

\\begin{minipage}[t]{0.35\\textwidth}
  \\vspace{0pt}
  \\textcolor{white}{
    {\\fontsize{22pt}{26pt}\\selectfont\\bfseries ${escapeLatex(basics.name)}}\\\\[8pt]
    {\\large ${escapeLatex(basics.title)}}\\\\[16pt]
    ${contactInfo}
  }
\\end{minipage}%
\\hfill%
\\begin{minipage}[t]{0.58\\textwidth}
  \\vspace{12pt}
  ${summary ? `{\\color{main}${escapeLatex(summary)}}` : ''}
\\end{minipage}

\\vspace{2cm}

%----------MAIN CONTENT----------
\\begin{minipage}[t]{0.48\\textwidth}
${experienceSection ? `\\section{Experience}
${experienceSection}` : ''}
\\end{minipage}%
\\hfill%
\\begin{minipage}[t]{0.48\\textwidth}
${educationSection ? `\\section{Education}
${educationSection}` : ''}

${data.skills.length > 0 ? `\\section{Skills}
${data.skills.map(g => `\\skillbar{${escapeLatex(g.category)}}{${escapeLatex(safeArray(g.skills).join(' \\textbullet{} '))}}`).join('\n')}` : ''}

${data.certifications.length > 0 ? `\\section{Certifications}
${data.certifications.map(c => `\\textbf{${escapeLatex(c.name)}}\\\\${escapeLatex(c.issuer)} | ${formatDate(c.date)}\\\\[4pt]`).join('\n')}` : ''}

${data.languages.length > 0 ? `\\section{Languages}
${data.languages.map(l => `${escapeLatex(l.language)} (${escapeLatex(l.proficiency)})`).join(' | ')}` : ''}
\\end{minipage}

\\end{document}
`
}

// ============================================================================
// TEMPLATE: COMPACT (Ultra Space-Efficient for Dense Info)
// ============================================================================
export function generateCompactTemplate(data: CVData): string {
  const { basics, summary } = data

  const contact = [
    basics.contact.email,
    basics.contact.phone,
    basics.contact.location,
    basics.contact.linkedin,
    basics.contact.github,
  ].filter((item): item is string => Boolean(item)).map(escapeLatex).join(' | ')

  const experienceSection = data.experience.length > 0 ? data.experience.map(exp => {
    const dateRange = exp.current 
      ? `${formatDate(exp.startDate)}--Now`
      : `${formatDate(exp.startDate)}--${formatDate(exp.endDate)}`
    const bullets = safeArray(exp.bullets).filter(b => b.trim()).slice(0, 3).map(b => `\\item ${escapeLatex(b)}`).join(' ')
    const tech = exp.technologies?.length ? ` [${escapeLatex(exp.technologies.slice(0, 5).join(', '))}]` : ''
    return `\\textbf{${escapeLatex(exp.role)}} @ ${escapeLatex(exp.company)} \\hfill ${dateRange}${tech}
\\begin{itemize*} ${bullets} \\end{itemize*}`
  }).join('\n\\vspace{2pt}\n') : ''

  const educationSection = data.education.length > 0 
    ? data.education.map(edu => `\\textbf{${escapeLatex(edu.degree)}} in ${escapeLatex(edu.field)}, ${escapeLatex(edu.institution)} \\hfill ${formatDate(edu.endDate)}${edu.gpa ? ` (${escapeLatex(edu.gpa)})` : ''}`).join(' \\\\ ')
    : ''

  const skillsSection = data.skills.length > 0 
    ? data.skills.map(g => `\\textbf{${escapeLatex(g.category)}:} ${escapeLatex(safeArray(g.skills).join(', '))}`).join(' | ')
    : ''

  return `%-------------------------
% Compact CV Template
% Ultra Space-Efficient Design
%-------------------------

\\documentclass[9pt,a4paper]{article}

\\usepackage[utf8]{inputenc}
\\usepackage[T1]{fontenc}
\\usepackage{helvet}
\\renewcommand{\\familydefault}{\\sfdefault}
\\usepackage[margin=0.4in]{geometry}
\\usepackage{enumitem}
\\usepackage[hidelinks]{hyperref}
\\usepackage{titlesec}
\\usepackage{mdwlist}

\\pagestyle{empty}

% Ultra compact section styling
\\titleformat{\\section}
  {\\normalsize\\bfseries\\scshape}{}{0em}{}[\\titlerule]
\\titlespacing*{\\section}{0pt}{6pt}{3pt}

\\setlist[itemize]{leftmargin=*, nosep, topsep=0pt, itemsep=0pt}
\\newenvironment{itemize*}%
  {\\begin{itemize}[leftmargin=*, label=$\\cdot$, nosep, itemsep=0pt]}%
  {\\end{itemize}}

\\begin{document}

%----------HEADING----------
\\begin{center}
{\\Large\\bfseries ${escapeLatex(basics.name)}} | ${escapeLatex(basics.title)}\\\\[2pt]
{\\scriptsize ${contact}}
\\end{center}

${summary ? `\\section{Summary}
{\\small ${escapeLatex(summary.substring(0, 300))}}` : ''}

${experienceSection ? `\\section{Experience}
${experienceSection}` : ''}

${educationSection ? `\\section{Education}
{\\small ${educationSection}}` : ''}

${skillsSection ? `\\section{Skills}
{\\small ${skillsSection}}` : ''}

${data.projects.length > 0 ? `\\section{Projects}
{\\small ${data.projects.slice(0, 3).map(proj => `\\textbf{${escapeLatex(proj.name)}}${safeArray(proj.technologies).length ? ` (${escapeLatex(safeArray(proj.technologies).slice(0, 3).join(', '))})` : ''}: ${escapeLatex(proj.description.substring(0, 80))}`).join(' | ')}}` : ''}

${data.certifications.length > 0 ? `\\section{Certifications}
{\\small ${data.certifications.map(c => `${escapeLatex(c.name)} (${escapeLatex(c.issuer)})`).join(' | ')}}` : ''}

\\end{document}
`
}

// ============================================================================
// TEMPLATE: BOLD (High Contrast, Statement Design)
// ============================================================================
export function generateBoldTemplate(data: CVData): string {
  const { basics, summary } = data

  const experienceSection = data.experience.length > 0 ? data.experience.map(exp => {
    const dateRange = exp.current 
      ? `${formatDate(exp.startDate)} — PRESENT`
      : `${formatDate(exp.startDate)} — ${formatDate(exp.endDate)}`
    const bullets = safeArray(exp.bullets).filter(b => b.trim()).map(b => `    \\item ${escapeLatex(b)}`).join('\n')
    const tech = exp.technologies?.length 
      ? `\\\\[4pt]\\fcolorbox{black}{lightgray}{\\small ${escapeLatex(exp.technologies.join(' | '))}}`
      : ''
    return `{\\LARGE\\textbf{${escapeLatex(exp.role)}}}\\\\[2pt]
{\\large ${escapeLatex(exp.company)}} \\hfill \\textbf{${dateRange}}\\\\
{\\color{gray}${escapeLatex(exp.location)}}${tech}
\\begin{itemize}[leftmargin=*, nosep]
${bullets}
\\end{itemize}`
  }).join('\n\\vspace{12pt}\n') : ''

  const educationSection = data.education.length > 0 ? data.education.map(edu => {
    return `{\\large\\textbf{${escapeLatex(edu.degree)}}} in ${escapeLatex(edu.field)}\\\\
${escapeLatex(edu.institution)}, ${escapeLatex(edu.location)} \\hfill ${formatDate(edu.endDate)}${edu.gpa ? ` | GPA: ${escapeLatex(edu.gpa)}` : ''}`
  }).join('\\\\[8pt]\n') : ''

  return `%-------------------------
% Bold CV Template
% High Contrast Statement Design
%-------------------------

\\documentclass[11pt,a4paper]{article}

\\usepackage[utf8]{inputenc}
\\usepackage[T1]{fontenc}
\\usepackage{montserrat}
\\renewcommand{\\familydefault}{\\sfdefault}
\\usepackage[margin=0.75in]{geometry}
\\usepackage{enumitem}
\\usepackage[hidelinks]{hyperref}
\\usepackage{xcolor}
\\usepackage{titlesec}
\\usepackage{tikz}

\\definecolor{black}{RGB}{0,0,0}
\\definecolor{gray}{RGB}{100,100,100}
\\definecolor{lightgray}{RGB}{240,240,240}

\\pagestyle{empty}

% Bold section styling
\\titleformat{\\section}
  {\\huge\\bfseries\\uppercase}{}{0em}{}
\\titlespacing*{\\section}{0pt}{20pt}{10pt}

\\setlist[itemize]{leftmargin=*, nosep, topsep=4pt, label={$\\blacksquare$}}

\\begin{document}

%----------BOLD HEADER----------
\\begin{tikzpicture}[remember picture, overlay]
  \\fill[black] (current page.north west) rectangle ([yshift=-5cm]current page.north east);
\\end{tikzpicture}

\\begin{center}
\\vspace{-1cm}
\\textcolor{white}{
  {\\fontsize{36pt}{40pt}\\selectfont\\textbf{${escapeLatex(basics.name.toUpperCase())}}}\\\\[8pt]
  {\\Large ${escapeLatex(basics.title)}}\\\\[12pt]
  ${basics.contact.email || ''}${basics.contact.phone ? ` \\quad|\\quad ${escapeLatex(basics.contact.phone)}` : ''}${basics.contact.location ? ` \\quad|\\quad ${escapeLatex(basics.contact.location)}` : ''}\\\\[4pt]
  ${basics.contact.linkedin || ''}${basics.contact.github ? ` \\quad|\\quad ${escapeLatex(basics.contact.github)}` : ''}
}
\\end{center}

\\vspace{2cm}

${summary ? `\\section{Profile}
{\\large ${escapeLatex(summary)}}` : ''}

${experienceSection ? `\\section{Experience}
${experienceSection}` : ''}

${educationSection ? `\\section{Education}
${educationSection}` : ''}

${data.skills.length > 0 ? `\\section{Skills}
${data.skills.map(g => `{\\large\\textbf{${escapeLatex(g.category)}}}\\\\${escapeLatex(safeArray(g.skills).join(' $\\bullet$ '))}`).join('\\\\[8pt]\n')}` : ''}

${data.certifications.length > 0 ? `\\section{Certifications}
${data.certifications.map(c => `\\textbf{${escapeLatex(c.name)}} | ${escapeLatex(c.issuer)} \\hfill ${formatDate(c.date)}`).join('\\\\\n')}` : ''}

\\end{document}
`
}

// ============================================================================
// TEMPLATE: INFOGRAPHIC (Visual Data-Driven Design)
// ============================================================================
export function generateInfographicTemplate(data: CVData): string {
  const { basics, summary } = data

  const experienceSection = data.experience.length > 0 ? data.experience.map((exp, i) => {
    const dateRange = exp.current 
      ? `${formatDate(exp.startDate)} -- Present`
      : `${formatDate(exp.startDate)} -- ${formatDate(exp.endDate)}`
    const bullets = safeArray(exp.bullets).filter(b => b.trim()).slice(0, 3).map(b => `    \\item ${escapeLatex(b)}`).join('\n')
    return `\\timelineentry{${i === 0 ? 'first' : ''}}{${dateRange}}{${escapeLatex(exp.role)}}{${escapeLatex(exp.company)}}{${escapeLatex(exp.location)}}
\\begin{itemize}[leftmargin=2em, nosep]
${bullets}
\\end{itemize}`
  }).join('\n') : ''

  const skillsSection = data.skills.length > 0 ? data.skills.map(g => {
    const skillBars = safeArray(g.skills).slice(0, 5).map((s, i) => {
      const level = 100 - (i * 10) // Decreasing skill levels for visual variety
      return `\\skillbar{${escapeLatex(s)}}{${level}}`
    }).join('\n')
    return `\\subsection*{${escapeLatex(g.category)}}
${skillBars}`
  }).join('\n\\vspace{6pt}\n') : ''

  return `%-------------------------
% Infographic CV Template
% Visual Data-Driven Design
%-------------------------

\\documentclass[11pt,a4paper]{article}

\\usepackage[utf8]{inputenc}
\\usepackage[T1]{fontenc}
\\usepackage{opensans}
\\renewcommand{\\familydefault}{\\sfdefault}
\\usepackage[left=1.5cm,right=1.5cm,top=1cm,bottom=1cm]{geometry}
\\usepackage{enumitem}
\\usepackage[hidelinks]{hyperref}
\\usepackage{xcolor}
\\usepackage{titlesec}
\\usepackage{tikz}
\\usepackage{fontawesome5}

\\definecolor{primary}{RGB}{41,128,185}
\\definecolor{secondary}{RGB}{52,73,94}
\\definecolor{accent}{RGB}{231,76,60}
\\definecolor{light}{RGB}{236,240,241}

\\pagestyle{empty}

% Section styling
\\titleformat{\\section}
  {\\color{primary}\\Large\\bfseries}{}{0em}{}
\\titlespacing*{\\section}{0pt}{12pt}{8pt}

% Timeline entry
\\newcommand{\\timelineentry}[5]{%
  \\noindent%
  \\begin{tikzpicture}[baseline=(current bounding box.north)]
    \\node[circle, fill=primary, inner sep=3pt] at (0,0) {};
    \\draw[primary, thick] (0,-0.15) -- (0,-1.5);
  \\end{tikzpicture}%
  \\hspace{0.5em}%
  \\begin{minipage}[t]{0.9\\textwidth}
    {\\color{primary}\\small #2}\\\\[2pt]
    {\\large\\textbf{#3}}\\\\
    {\\color{secondary}#4, #5}\\\\[4pt]
  \\end{minipage}\\\\[2pt]
}

% Skill bar
\\newcommand{\\skillbar}[2]{%
  \\noindent\\begin{minipage}{0.4\\textwidth}
    \\small #1
  \\end{minipage}%
  \\begin{minipage}{0.55\\textwidth}
    \\begin{tikzpicture}[baseline=0.5ex]
      \\fill[light] (0,0) rectangle (5,0.25);
      \\fill[primary] (0,0) rectangle ({5*#2/100},0.25);
    \\end{tikzpicture}
  \\end{minipage}\\\\[4pt]
}

% Stat box
\\newcommand{\\statbox}[2]{%
  \\begin{tikzpicture}
    \\node[draw=primary, rounded corners=5pt, minimum width=2cm, minimum height=1.5cm, align=center] {
      {\\Large\\color{primary}\\textbf{#1}}\\\\
      {\\tiny #2}
    };
  \\end{tikzpicture}
}

\\begin{document}

%----------VISUAL HEADER----------
\\begin{tikzpicture}[remember picture, overlay]
  \\fill[primary] (current page.north west) rectangle ([yshift=-4cm]current page.north east);
  \\fill[secondary] ([yshift=-4cm]current page.north west) rectangle ([yshift=-4.3cm]current page.north east);
\\end{tikzpicture}

\\begin{center}
\\vspace{-0.5cm}
\\textcolor{white}{
  {\\fontsize{28pt}{32pt}\\selectfont\\textbf{${escapeLatex(basics.name)}}}\\\\[6pt]
  {\\Large ${escapeLatex(basics.title)}}\\\\[10pt]
  \\faEnvelope\\ ${basics.contact.email || ''} \\quad
  \\faPhone\\ ${basics.contact.phone || ''} \\quad
  \\faMapMarker\\ ${basics.contact.location || ''}
}
\\end{center}

\\vspace{1.5cm}

%----------STATS ROW----------
\\begin{center}
\\statbox{${data.experience.length}+}{Years Exp.} \\hspace{1cm}
\\statbox{${data.projects.length}+}{Projects} \\hspace{1cm}
\\statbox{${data.skills.reduce((acc, s) => acc + s.skills.length, 0)}+}{Skills} \\hspace{1cm}
\\statbox{${data.certifications.length}}{Certifications}
\\end{center}

\\vspace{1cm}

%----------MAIN CONTENT----------
\\begin{minipage}[t]{0.55\\textwidth}
${summary ? `\\section{\\faUser\\ Profile}
${escapeLatex(summary)}` : ''}

${experienceSection ? `\\section{\\faBriefcase\\ Experience Timeline}
${experienceSection}` : ''}
\\end{minipage}%
\\hfill%
\\begin{minipage}[t]{0.4\\textwidth}
${skillsSection ? `\\section{\\faChartBar\\ Skills}
${skillsSection}` : ''}

${data.education.length > 0 ? `\\section{\\faGraduationCap\\ Education}
${data.education.map(edu => `{\\textbf{${escapeLatex(edu.degree)}}}\\\\
${escapeLatex(edu.institution)}\\\\
{\\color{primary}${formatDate(edu.endDate)}}\\\\[6pt]`).join('\n')}` : ''}

${data.languages.length > 0 ? `\\section{\\faGlobe\\ Languages}
${data.languages.map(l => `${escapeLatex(l.language)}: ${escapeLatex(l.proficiency)}`).join(' | ')}` : ''}
\\end{minipage}

\\end{document}
`
}

// ============================================================================
// Available Templates Configuration
// ============================================================================
export const AVAILABLE_TEMPLATES = [
  // === ATS-FRIENDLY TEMPLATES ===
  {
    id: 'modern',
    name: 'Modern',
    description: 'Clean, contemporary design with great ATS compatibility',
    preview: '/templates/modern.svg',
    tags: ['ats-friendly', 'tech', 'startup'],
    category: 'ATS-Friendly',
  },
  {
    id: 'classic',
    name: 'Classic',
    description: 'Traditional professional format trusted by Fortune 500',
    preview: '/templates/classic.svg',
    tags: ['corporate', 'finance', 'consulting'],
    category: 'ATS-Friendly',
  },
  {
    id: 'minimal',
    name: 'Minimal',
    description: 'Simple, elegant, and space-efficient',
    preview: '/templates/minimal.svg',
    tags: ['ats-friendly', 'clean', 'versatile'],
    category: 'ATS-Friendly',
  },
  {
    id: 'compact',
    name: 'Compact',
    description: 'Ultra space-efficient for dense information',
    preview: '/templates/compact.svg',
    tags: ['ats-friendly', 'dense', 'experienced'],
    category: 'ATS-Friendly',
  },
  
  // === PROFESSIONAL TEMPLATES ===
  {
    id: 'professional',
    name: 'Professional',
    description: 'Executive business design with subtle elegance',
    preview: '/templates/professional.svg',
    tags: ['executive', 'management', 'business'],
    category: 'Professional',
  },
  {
    id: 'executive',
    name: 'Executive',
    description: 'Premium design for C-level and senior management',
    preview: '/templates/executive.svg',
    tags: ['c-level', 'director', 'vp'],
    category: 'Professional',
  },
  {
    id: 'banking',
    name: 'Banking',
    description: 'Corporate minimalist design for finance professionals',
    preview: '/templates/banking.svg',
    tags: ['finance', 'corporate', 'consulting'],
    category: 'Professional',
  },
  {
    id: 'elegant',
    name: 'Elegant',
    description: 'Premium sidebar design with visual hierarchy',
    preview: '/templates/elegant.svg',
    tags: ['premium', 'stylish', 'modern'],
    category: 'Professional',
  },
  
  // === CREATIVE TEMPLATES ===
  {
    id: 'creative',
    name: 'Creative',
    description: 'Modern design with visual appeal for creative roles',
    preview: '/templates/creative.svg',
    tags: ['design', 'marketing', 'creative'],
    category: 'Creative',
  },
  {
    id: 'fancy',
    name: 'Fancy',
    description: 'Decorative design with stylish accents',
    preview: '/templates/fancy.svg',
    tags: ['stylish', 'colorful', 'unique'],
    category: 'Creative',
  },
  {
    id: 'bold',
    name: 'Bold',
    description: 'High contrast statement design that stands out',
    preview: '/templates/bold.svg',
    tags: ['statement', 'impactful', 'modern'],
    category: 'Creative',
  },
  {
    id: 'infographic',
    name: 'Infographic',
    description: 'Visual data-driven design with skill bars and stats',
    preview: '/templates/infographic.svg',
    tags: ['visual', 'data', 'modern'],
    category: 'Creative',
  },
  
  // === SPECIALIZED TEMPLATES ===
  {
    id: 'tech',
    name: 'Tech',
    description: 'Optimized for software developers and engineers',
    preview: '/templates/tech.svg',
    tags: ['developer', 'engineer', 'startup'],
    category: 'Specialized',
  },
  {
    id: 'academic',
    name: 'Academic',
    description: 'Perfect for researchers, professors, and scientists',
    preview: '/templates/academic.svg',
    tags: ['research', 'education', 'phd'],
    category: 'Specialized',
  },
  {
    id: 'casual',
    name: 'Casual',
    description: 'Friendly approachable design for modern companies',
    preview: '/templates/casual.svg',
    tags: ['startup', 'friendly', 'approachable'],
    category: 'Specialized',
  },
  {
    id: 'vintage',
    name: 'Vintage',
    description: 'Traditional elegant design with classic typography',
    preview: '/templates/vintage.svg',
    tags: ['traditional', 'elegant', 'refined'],
    category: 'Specialized',
  },
]

// ============================================================================
// Main Generator Function
// ============================================================================
export function generateLatex(data: CVData, templateId: string): string {
  switch (templateId) {
    case 'modern':
    case 'modern-ats':
      return generateModernTemplate(data)
    case 'classic':
    case 'classic-ats':
      return generateClassicTemplate(data)
    case 'minimal':
    case 'minimal-ats':
      return generateMinimalTemplate(data)
    case 'professional':
      return generateProfessionalTemplate(data)
    case 'creative':
      return generateCreativeTemplate(data)
    case 'academic':
      return generateAcademicTemplate(data)
    case 'tech':
      return generateTechTemplate(data)
    case 'executive':
      return generateExecutiveTemplate(data)
    case 'casual':
      return generateCasualTemplate(data)
    case 'banking':
      return generateBankingTemplate(data)
    case 'vintage':
      return generateVintageTemplate(data)
    case 'fancy':
      return generateFancyTemplate(data)
    case 'elegant':
      return generateElegantTemplate(data)
    case 'compact':
      return generateCompactTemplate(data)
    case 'bold':
      return generateBoldTemplate(data)
    case 'infographic':
      return generateInfographicTemplate(data)
    default:
      return generateModernTemplate(data)
  }
}
