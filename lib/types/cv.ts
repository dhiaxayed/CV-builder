// Canonical JSON schema for resume content

export interface ContactInfo {
  email: string
  phone: string
  location: string
  linkedin?: string
  github?: string
  website?: string
}

export interface Basics {
  name: string
  title: string
  contact: ContactInfo
  photoUrl?: string
}

export interface ExperienceItem {
  id: string
  company: string
  role: string
  location: string
  startDate: string
  endDate: string
  current: boolean
  bullets: string[]
  technologies?: string[]
}

export interface EducationItem {
  id: string
  institution: string
  degree: string
  field: string
  location: string
  startDate: string
  endDate: string
  gpa?: string
  highlights?: string[]
}

export interface ProjectItem {
  id: string
  name: string
  description: string
  url?: string
  technologies: string[]
  bullets: string[]
  startDate?: string
  endDate?: string
}

export interface SkillGroup {
  id: string
  category: string
  skills: string[]
}

export interface CertificationItem {
  id: string
  name: string
  issuer: string
  date: string
  url?: string
  expirationDate?: string
}

export interface AwardItem {
  id: string
  title: string
  issuer: string
  date: string
  description?: string
}

export interface LanguageItem {
  id: string
  language: string
  proficiency: 'Native' | 'Fluent' | 'Advanced' | 'Intermediate' | 'Basic'
}

export interface CustomSection {
  id: string
  title: string
  type: 'bullets' | 'markdown'
  content: string[]
}

export interface CVData {
  basics: Basics
  summary: string
  experience: ExperienceItem[]
  education: EducationItem[]
  projects: ProjectItem[]
  skills: SkillGroup[]
  certifications: CertificationItem[]
  awards: AwardItem[]
  languages: LanguageItem[]
  customSections: CustomSection[]
}

export interface CVVersion {
  id: string
  cvId: string
  version: number
  data: CVData
  latexSource?: string
  latexOverride?: string
  createdAt: string
  updatedAt: string
  note?: string
}

export interface CV {
  id: string
  userId: string
  title: string
  templateId: string
  currentVersionId: string
  versions: CVVersion[]
  isPublic: boolean
  shareToken?: string
  createdAt: string
  updatedAt: string
}

export interface Template {
  id: string
  name: string
  description: string
  thumbnail: string
  category: 'modern' | 'classic' | 'minimal'
}

export interface ShareLink {
  id: string
  cvId: string
  versionId: string
  token: string
  isActive: boolean
  expiresAt?: string
  createdAt: string
}

export interface JobMatch {
  id: string
  cvId: string
  jobDescription: string
  extractedKeywords: string[]
  matchedKeywords: string[]
  missingKeywords: string[]
  suggestions: string[]
  score: number
  createdAt: string
}

export interface ATSCheck {
  id: string
  category: 'keywords' | 'length' | 'sections' | 'dates' | 'bullets' | 'verbs' | 'format'
  name: string
  description: string
  status: 'pass' | 'warning' | 'fail'
  details?: string
}

export interface ATSReport {
  checks: ATSCheck[]
  overallScore: number
  recommendations: string[]
}

// User type for local storage auth simulation
export interface User {
  id: string
  email: string
  name: string
  createdAt: string
}

// Default empty CV data
export const createEmptyCVData = (): CVData => ({
  basics: {
    name: '',
    title: '',
    contact: {
      email: '',
      phone: '',
      location: '',
    },
  },
  summary: '',
  experience: [],
  education: [],
  projects: [],
  skills: [],
  certifications: [],
  awards: [],
  languages: [],
  customSections: [],
})

// Sample CV data for onboarding
export const createSampleCVData = (): CVData => ({
  basics: {
    name: 'Alex Johnson',
    title: 'Senior Software Engineer',
    contact: {
      email: 'alex.johnson@email.com',
      phone: '+1 (555) 123-4567',
      location: 'San Francisco, CA',
      linkedin: 'linkedin.com/in/alexjohnson',
      github: 'github.com/alexjohnson',
      website: 'alexjohnson.dev',
    },
  },
  summary: 'Results-driven Senior Software Engineer with 6+ years of experience building scalable web applications. Expertise in React, Node.js, and cloud architecture. Led teams of 5-8 engineers, delivering products that increased user engagement by 40%. Passionate about clean code, mentoring, and continuous improvement.',
  experience: [
    {
      id: '1',
      company: 'TechCorp Inc.',
      role: 'Senior Software Engineer',
      location: 'San Francisco, CA',
      startDate: '2021-03',
      endDate: '',
      current: true,
      bullets: [
        'Led development of microservices architecture serving 2M+ daily active users, improving response times by 60%',
        'Mentored team of 5 junior developers, conducting code reviews and establishing best practices',
        'Implemented CI/CD pipeline reducing deployment time from 2 hours to 15 minutes',
        'Collaborated with product team to define technical roadmap and prioritize features',
      ],
      technologies: ['React', 'Node.js', 'PostgreSQL', 'AWS', 'Docker'],
    },
    {
      id: '2',
      company: 'StartupXYZ',
      role: 'Software Engineer',
      location: 'Remote',
      startDate: '2018-06',
      endDate: '2021-02',
      current: false,
      bullets: [
        'Built real-time collaboration features using WebSockets, supporting 10,000+ concurrent users',
        'Reduced database query times by 75% through optimization and indexing strategies',
        'Developed RESTful APIs consumed by web and mobile applications',
        'Participated in agile ceremonies and contributed to sprint planning',
      ],
      technologies: ['TypeScript', 'React', 'MongoDB', 'Redis', 'Kubernetes'],
    },
  ],
  education: [
    {
      id: '1',
      institution: 'University of California, Berkeley',
      degree: 'Bachelor of Science',
      field: 'Computer Science',
      location: 'Berkeley, CA',
      startDate: '2014-08',
      endDate: '2018-05',
      gpa: '3.8',
      highlights: ['Summa Cum Laude', 'Dean\'s List 2016-2018'],
    },
  ],
  projects: [
    {
      id: '1',
      name: 'OpenSource Analytics Dashboard',
      description: 'Real-time analytics dashboard for monitoring application metrics',
      url: 'github.com/alexjohnson/analytics-dashboard',
      technologies: ['React', 'D3.js', 'Node.js', 'InfluxDB'],
      bullets: [
        'Built open-source analytics tool with 500+ GitHub stars',
        'Implemented real-time data visualization with sub-second latency',
      ],
    },
  ],
  skills: [
    {
      id: '1',
      category: 'Programming Languages',
      skills: ['TypeScript', 'JavaScript', 'Python', 'Go', 'SQL'],
    },
    {
      id: '2',
      category: 'Frameworks & Libraries',
      skills: ['React', 'Next.js', 'Node.js', 'Express', 'FastAPI'],
    },
    {
      id: '3',
      category: 'Cloud & DevOps',
      skills: ['AWS', 'Docker', 'Kubernetes', 'Terraform', 'CI/CD'],
    },
    {
      id: '4',
      category: 'Databases',
      skills: ['PostgreSQL', 'MongoDB', 'Redis', 'Elasticsearch'],
    },
  ],
  certifications: [
    {
      id: '1',
      name: 'AWS Solutions Architect - Professional',
      issuer: 'Amazon Web Services',
      date: '2023-01',
      expirationDate: '2026-01',
    },
  ],
  awards: [
    {
      id: '1',
      title: 'Employee of the Year',
      issuer: 'TechCorp Inc.',
      date: '2022',
      description: 'Recognized for exceptional technical leadership and mentorship',
    },
  ],
  languages: [
    {
      id: '1',
      language: 'English',
      proficiency: 'Native',
    },
    {
      id: '2',
      language: 'Spanish',
      proficiency: 'Intermediate',
    },
  ],
  customSections: [],
})
