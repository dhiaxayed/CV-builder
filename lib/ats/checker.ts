import { CVData, ATSCheck, ATSReport } from '../types/cv'

// Strong action verbs for ATS
const STRONG_ACTION_VERBS = [
  'achieved', 'accomplished', 'accelerated', 'administered', 'advised', 'analyzed',
  'built', 'collaborated', 'conducted', 'coordinated', 'created', 'delivered',
  'designed', 'developed', 'directed', 'drove', 'enhanced', 'established',
  'executed', 'expanded', 'facilitated', 'generated', 'implemented', 'improved',
  'increased', 'influenced', 'initiated', 'innovated', 'integrated', 'launched',
  'led', 'managed', 'mentored', 'monitored', 'negotiated', 'optimized',
  'orchestrated', 'oversaw', 'pioneered', 'planned', 'produced', 'reduced',
  'resolved', 'restructured', 'revamped', 'scaled', 'spearheaded', 'streamlined',
  'strengthened', 'supervised', 'transformed', 'upgraded'
]

// Weak verbs to avoid
const WEAK_VERBS = [
  'helped', 'assisted', 'worked', 'was responsible for', 'handled', 'dealt with',
  'participated', 'involved in', 'tasked with'
]

// Check if bullet starts with action verb
function startsWithActionVerb(bullet: string): { isStrong: boolean; verb: string | null } {
  const firstWord = bullet.trim().split(/\s+/)[0]?.toLowerCase().replace(/[^a-z]/g, '')
  if (!firstWord) return { isStrong: false, verb: null }
  
  const isStrong = STRONG_ACTION_VERBS.includes(firstWord)
  const isWeak = WEAK_VERBS.some(v => bullet.toLowerCase().startsWith(v))
  
  return { isStrong: isStrong && !isWeak, verb: firstWord }
}

// Check for measurable impact (numbers, percentages, etc.)
function hasMeasurableImpact(bullet: string): boolean {
  const patterns = [
    /\d+%/,           // Percentages
    /\$[\d,]+/,       // Dollar amounts
    /\d+\+/,          // X+ numbers
    /\d+x/i,          // Multipliers
    /\d+k\+?/i,       // K notation
    /\d+m\+?/i,       // M notation (millions)
    /\d+\s*(users?|customers?|clients?|employees?|team members?)/i,  // User counts
    /\d+\s*(hours?|days?|weeks?|months?)/i,  // Time savings
    /\d+\s*(projects?|features?|products?)/i, // Project counts
  ]
  
  return patterns.some(pattern => pattern.test(bullet))
}

// Run all ATS checks
export function runATSChecks(data: CVData): ATSReport {
  const checks: ATSCheck[] = []
  
  // 1. Section completeness check
  const requiredSections = ['basics', 'summary', 'experience', 'education', 'skills']
  const missingSections: string[] = []
  
  if (!data.basics.name) missingSections.push('Name')
  if (!data.basics.contact.email) missingSections.push('Email')
  if (!data.basics.contact.phone) missingSections.push('Phone')
  if (!data.summary || data.summary.length < 50) missingSections.push('Summary (at least 50 characters)')
  if (data.experience.length === 0) missingSections.push('Experience')
  if (data.education.length === 0) missingSections.push('Education')
  if (data.skills.length === 0) missingSections.push('Skills')
  
  checks.push({
    id: 'section-completeness',
    category: 'sections',
    name: 'Section Completeness',
    description: 'All essential sections should be filled out',
    status: missingSections.length === 0 ? 'pass' : missingSections.length <= 2 ? 'warning' : 'fail',
    details: missingSections.length > 0 ? `Missing: ${missingSections.join(', ')}` : 'All essential sections complete',
  })
  
  // 2. Contact information check
  const contactScore = [
    data.basics.contact.email,
    data.basics.contact.phone,
    data.basics.contact.location,
    data.basics.contact.linkedin,
  ].filter(Boolean).length
  
  checks.push({
    id: 'contact-info',
    category: 'sections',
    name: 'Contact Information',
    description: 'Include email, phone, location, and LinkedIn',
    status: contactScore >= 4 ? 'pass' : contactScore >= 2 ? 'warning' : 'fail',
    details: `${contactScore}/4 contact fields filled`,
  })
  
  // 3. Summary length check
  const summaryLength = data.summary?.length || 0
  checks.push({
    id: 'summary-length',
    category: 'length',
    name: 'Summary Length',
    description: 'Summary should be 50-300 characters for optimal ATS parsing',
    status: summaryLength >= 50 && summaryLength <= 300 ? 'pass' : summaryLength > 0 ? 'warning' : 'fail',
    details: summaryLength === 0 ? 'No summary provided' : `${summaryLength} characters (recommended: 50-300)`,
  })
  
  // 4. Bullet points analysis
  const allBullets = [
    ...data.experience.flatMap(e => e.bullets),
    ...data.projects.flatMap(p => p.bullets),
  ].filter(b => b.trim())
  
  const longBullets = allBullets.filter(b => b.length > 200)
  checks.push({
    id: 'bullet-length',
    category: 'bullets',
    name: 'Bullet Point Length',
    description: 'Bullet points should be under 200 characters',
    status: longBullets.length === 0 ? 'pass' : longBullets.length <= 2 ? 'warning' : 'fail',
    details: longBullets.length === 0 ? 'All bullets are well-sized' : `${longBullets.length} bullets exceed 200 characters`,
  })
  
  // 5. Action verbs check
  const verbAnalysis = allBullets.map(b => startsWithActionVerb(b))
  const strongVerbCount = verbAnalysis.filter(v => v.isStrong).length
  const verbPercentage = allBullets.length > 0 ? Math.round((strongVerbCount / allBullets.length) * 100) : 0
  
  checks.push({
    id: 'action-verbs',
    category: 'verbs',
    name: 'Action Verbs Usage',
    description: 'Bullet points should start with strong action verbs',
    status: verbPercentage >= 70 ? 'pass' : verbPercentage >= 40 ? 'warning' : 'fail',
    details: `${verbPercentage}% of bullets start with strong action verbs`,
  })
  
  // 6. Measurable impact check
  const impactBullets = allBullets.filter(hasMeasurableImpact)
  const impactPercentage = allBullets.length > 0 ? Math.round((impactBullets.length / allBullets.length) * 100) : 0
  
  checks.push({
    id: 'measurable-impact',
    category: 'bullets',
    name: 'Measurable Impact',
    description: 'Include quantifiable achievements (numbers, percentages)',
    status: impactPercentage >= 50 ? 'pass' : impactPercentage >= 25 ? 'warning' : 'fail',
    details: `${impactPercentage}% of bullets include measurable impact`,
  })
  
  // 7. Date consistency check
  const dateIssues: string[] = []
  data.experience.forEach((exp, i) => {
    if (!exp.startDate) dateIssues.push(`Experience ${i + 1}: Missing start date`)
    if (!exp.current && !exp.endDate) dateIssues.push(`Experience ${i + 1}: Missing end date`)
  })
  data.education.forEach((edu, i) => {
    if (!edu.startDate) dateIssues.push(`Education ${i + 1}: Missing start date`)
    if (!edu.endDate) dateIssues.push(`Education ${i + 1}: Missing end date`)
  })
  
  checks.push({
    id: 'date-consistency',
    category: 'dates',
    name: 'Date Consistency',
    description: 'All experiences and education should have complete dates',
    status: dateIssues.length === 0 ? 'pass' : dateIssues.length <= 2 ? 'warning' : 'fail',
    details: dateIssues.length === 0 ? 'All dates are complete' : dateIssues.join('; '),
  })
  
  // 8. Skills keywords check
  const totalSkills = data.skills.reduce((acc, g) => acc + g.skills.length, 0)
  checks.push({
    id: 'skills-keywords',
    category: 'keywords',
    name: 'Skills Coverage',
    description: 'Include 10-30 relevant skills for ATS keyword matching',
    status: totalSkills >= 10 && totalSkills <= 30 ? 'pass' : totalSkills >= 5 ? 'warning' : 'fail',
    details: `${totalSkills} skills listed (recommended: 10-30)`,
  })
  
  // 9. Experience count check
  checks.push({
    id: 'experience-count',
    category: 'sections',
    name: 'Experience Entries',
    description: 'Include 2-5 relevant work experiences',
    status: data.experience.length >= 2 && data.experience.length <= 5 ? 'pass' : data.experience.length >= 1 ? 'warning' : 'fail',
    details: `${data.experience.length} experiences listed`,
  })
  
  // 10. Total bullet count per experience
  const bulletCountIssues = data.experience.filter(e => e.bullets.filter(b => b.trim()).length < 2 || e.bullets.filter(b => b.trim()).length > 6)
  checks.push({
    id: 'bullets-per-experience',
    category: 'bullets',
    name: 'Bullets Per Experience',
    description: 'Each experience should have 2-6 bullet points',
    status: bulletCountIssues.length === 0 ? 'pass' : bulletCountIssues.length <= 1 ? 'warning' : 'fail',
    details: bulletCountIssues.length === 0 ? 'All experiences have appropriate bullet counts' : `${bulletCountIssues.length} experiences have too few or too many bullets`,
  })
  
  // Calculate overall score
  const passCount = checks.filter(c => c.status === 'pass').length
  const warningCount = checks.filter(c => c.status === 'warning').length
  const overallScore = Math.round((passCount * 10 + warningCount * 5) / checks.length * 10)
  
  // Generate recommendations
  const recommendations: string[] = []
  
  checks.filter(c => c.status === 'fail').forEach(check => {
    switch (check.id) {
      case 'section-completeness':
        recommendations.push('Fill in all essential sections (summary, experience, education, skills)')
        break
      case 'action-verbs':
        recommendations.push('Start bullet points with strong action verbs like "Led", "Developed", "Implemented"')
        break
      case 'measurable-impact':
        recommendations.push('Add quantifiable achievements with numbers, percentages, or metrics')
        break
      case 'date-consistency':
        recommendations.push('Ensure all work experiences and education entries have complete dates')
        break
      case 'skills-keywords':
        recommendations.push('Add more relevant technical and professional skills (aim for 10-30)')
        break
    }
  })
  
  checks.filter(c => c.status === 'warning').slice(0, 2).forEach(check => {
    switch (check.id) {
      case 'summary-length':
        recommendations.push('Optimize your summary to be between 50-300 characters')
        break
      case 'bullet-length':
        recommendations.push('Keep bullet points concise (under 200 characters)')
        break
    }
  })
  
  return {
    checks,
    overallScore,
    recommendations,
  }
}

// Extract keywords from job description
export function extractKeywords(jobDescription: string): string[] {
  const text = jobDescription.toLowerCase()
  
  // Common stop words to ignore
  const stopWords = new Set([
    'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with',
    'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been', 'be', 'have', 'has', 'had',
    'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must',
    'shall', 'can', 'need', 'dare', 'ought', 'used', 'this', 'that', 'these', 'those',
    'i', 'you', 'he', 'she', 'it', 'we', 'they', 'what', 'which', 'who', 'whom',
    'about', 'above', 'after', 'again', 'against', 'all', 'also', 'am', 'any', 'because',
    'before', 'being', 'below', 'between', 'both', 'but', 'cannot', 'com', 'could',
    'down', 'during', 'each', 'either', 'else', 'ever', 'every', 'few', 'find', 'first',
    'further', 'get', 'give', 'go', 'having', 'her', 'here', 'hers', 'herself', 'him',
    'himself', 'his', 'how', 'however', 'if', 'into', 'its', 'itself', 'just', 'know',
    'last', 'least', 'less', 'let', 'like', 'look', 'made', 'make', 'many', 'me', 'more',
    'most', 'much', 'my', 'myself', 'new', 'no', 'nor', 'not', 'now', 'off', 'once',
    'only', 'other', 'our', 'ours', 'ourselves', 'out', 'over', 'own', 'part', 'per',
    'perhaps', 'please', 'put', 'rather', 'really', 'same', 'see', 'seem', 'seemed',
    'seeming', 'seems', 'several', 'so', 'some', 'something', 'sometime', 'sometimes',
    'somewhere', 'still', 'such', 'take', 'than', 'their', 'theirs', 'them', 'themselves',
    'then', 'there', 'therefore', 'therein', 'thereupon', 'things', 'think', 'third',
    'through', 'throughout', 'thru', 'thus', 'together', 'too', 'toward', 'towards',
    'under', 'unless', 'until', 'up', 'upon', 'us', 'use', 'using', 'various', 'very',
    'via', 'want', 'wants', 'way', 'well', 'went', 'when', 'whenever', 'where', 'whereby',
    'wherein', 'whereupon', 'wherever', 'whether', 'while', 'whither', 'why', 'within',
    'without', 'work', 'working', 'works', 'world', 'would', 'yet', 'your', 'yours',
    'yourself', 'yourselves', 'able', 'across', 'along', 'among', 'around', 'become',
    'becomes', 'becoming', 'besides', 'beyond', 'call', 'calls', 'come', 'coming', 'done',
    'enough', 'even', 'gotten', 'hence', 'indeed', 'instead', 'keep', 'keeping', 'kept',
    'nearly', 'never', 'nonetheless', 'often', 'otherwise', 'quite', 'seldom', 'since',
    'soon', 'thereby', 'though', 'almost', 'already', 'always', 'among', 'although',
    'job', 'role', 'position', 'team', 'company', 'opportunity', 'responsibilities',
    'requirements', 'qualifications', 'benefits', 'salary', 'years', 'experience',
  ])
  
  // Extract multi-word technical terms first
  const multiWordPatterns = [
    /machine learning/gi, /deep learning/gi, /artificial intelligence/gi,
    /data science/gi, /data engineering/gi, /data analysis/gi,
    /software engineering/gi, /software development/gi,
    /full stack/gi, /front end/gi, /back end/gi, /full-stack/gi, /front-end/gi, /back-end/gi,
    /project management/gi, /product management/gi,
    /cloud computing/gi, /cloud architecture/gi,
    /ci cd/gi, /ci\/cd/gi, /devops/gi,
    /user experience/gi, /user interface/gi, /ux design/gi, /ui design/gi,
    /agile methodology/gi, /scrum master/gi,
    /test driven/gi, /unit testing/gi,
    /rest api/gi, /restful api/gi, /graphql/gi,
    /version control/gi,
  ]
  
  const multiWordKeywords: string[] = []
  multiWordPatterns.forEach(pattern => {
    const matches = text.match(pattern)
    if (matches) {
      multiWordKeywords.push(...matches.map(m => m.toLowerCase().trim()))
    }
  })
  
  // Extract single words
  const words = text
    .replace(/[^a-z0-9\s\-\.#\+]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 2 && !stopWords.has(word))
    .filter(word => !/^\d+$/.test(word)) // Remove pure numbers
  
  // Count word frequency
  const wordFreq = new Map<string, number>()
  words.forEach(word => {
    wordFreq.set(word, (wordFreq.get(word) || 0) + 1)
  })
  
  // Get high-frequency words (mentioned 2+ times) or technical terms
  const technicalTerms = new Set([
    'javascript', 'typescript', 'python', 'java', 'c++', 'c#', 'ruby', 'go', 'golang',
    'rust', 'scala', 'kotlin', 'swift', 'php', 'perl', 'r', 'sql', 'nosql',
    'react', 'angular', 'vue', 'svelte', 'nextjs', 'next.js', 'nodejs', 'node.js',
    'express', 'django', 'flask', 'fastapi', 'spring', 'rails', 'laravel',
    'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'k8s', 'terraform', 'ansible',
    'jenkins', 'gitlab', 'github', 'bitbucket', 'jira', 'confluence',
    'postgresql', 'mysql', 'mongodb', 'redis', 'elasticsearch', 'kafka', 'rabbitmq',
    'html', 'css', 'sass', 'less', 'tailwind', 'bootstrap', 'webpack', 'vite',
    'git', 'linux', 'unix', 'bash', 'shell', 'api', 'apis', 'microservices',
    'agile', 'scrum', 'kanban', 'lean', 'waterfall',
    'tensorflow', 'pytorch', 'keras', 'pandas', 'numpy', 'scikit-learn',
    'hadoop', 'spark', 'airflow', 'dbt', 'snowflake', 'databricks',
    'figma', 'sketch', 'adobe', 'photoshop', 'illustrator',
    'leadership', 'communication', 'collaboration', 'problem-solving',
    'analytical', 'strategic', 'innovative', 'detail-oriented',
  ])
  
  const singleKeywords = Array.from(wordFreq.entries())
    .filter(([word, count]) => count >= 2 || technicalTerms.has(word))
    .sort((a, b) => b[1] - a[1])
    .map(([word]) => word)
    .slice(0, 30)
  
  // Combine and deduplicate
  const allKeywords = [...new Set([...multiWordKeywords, ...singleKeywords])]
  
  return allKeywords.slice(0, 40)
}

// Match CV against job description keywords
export function matchJobDescription(data: CVData, jobDescription: string): {
  extractedKeywords: string[]
  matchedKeywords: string[]
  missingKeywords: string[]
  score: number
  suggestions: string[]
} {
  const extractedKeywords = extractKeywords(jobDescription)
  
  // Get all text from CV
  const cvText = [
    data.basics.name,
    data.basics.title,
    data.summary,
    ...data.experience.flatMap(e => [e.role, e.company, ...e.bullets, ...(e.technologies || [])]),
    ...data.education.flatMap(e => [e.institution, e.degree, e.field, ...(e.highlights || [])]),
    ...data.projects.flatMap(p => [p.name, p.description, ...p.bullets, ...p.technologies]),
    ...data.skills.flatMap(g => [g.category, ...g.skills]),
    ...data.certifications.map(c => c.name),
  ].join(' ').toLowerCase()
  
  const matchedKeywords: string[] = []
  const missingKeywords: string[] = []
  
  extractedKeywords.forEach(keyword => {
    if (cvText.includes(keyword.toLowerCase())) {
      matchedKeywords.push(keyword)
    } else {
      missingKeywords.push(keyword)
    }
  })
  
  const score = extractedKeywords.length > 0 
    ? Math.round((matchedKeywords.length / extractedKeywords.length) * 100)
    : 0
  
  // Generate suggestions
  const suggestions: string[] = []
  
  if (missingKeywords.length > 0) {
    const topMissing = missingKeywords.slice(0, 5)
    suggestions.push(`Consider adding these keywords to your CV: ${topMissing.join(', ')}`)
  }
  
  if (score < 50) {
    suggestions.push('Your CV may need significant tailoring for this role. Focus on the missing technical skills.')
  } else if (score < 70) {
    suggestions.push('Good keyword match! Add a few more relevant skills to improve ATS compatibility.')
  } else {
    suggestions.push('Excellent keyword coverage! Your CV is well-aligned with this job description.')
  }
  
  // Specific suggestions based on missing keywords
  const techKeywords = missingKeywords.filter(k => 
    ['javascript', 'python', 'react', 'aws', 'docker', 'sql', 'api'].some(t => k.includes(t))
  )
  if (techKeywords.length > 0) {
    suggestions.push(`Add technical skills: ${techKeywords.slice(0, 3).join(', ')}`)
  }
  
  return {
    extractedKeywords,
    matchedKeywords,
    missingKeywords,
    score,
    suggestions,
  }
}
