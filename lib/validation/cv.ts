import { z } from 'zod'
import { TEMPLATE_IDS, COLOR_THEME_IDS } from '@/lib/templates'

const text = z.string().max(10000)
const short = z.string().max(500)
const id = z.string().min(1).max(100)
const list = z.array(text).max(50)
const photo = z.string().max(450000).refine(value =>
  value === '' || /^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(value) || /^\/api\/photos\/[A-Za-z0-9_-]+$/.test(value),
  'Use an uploaded JPEG, PNG, or WebP photo')
const unique = <T extends { id: string }>(items: T[]) => new Set(items.map(item => item.id)).size === items.length
const entries = <T extends z.ZodTypeAny>(schema: T) => z.array(schema).max(50).refine(unique, 'Entry IDs must be unique').default([])

export const cvDataSchema = z.object({
  appearance: z.object({
    colorTheme:z.enum(COLOR_THEME_IDS).default('template'),
    font:z.enum(['template','sans','serif']).default('template'),
    photoPosition:z.enum(['template','left','right']).optional(),
  }).strict().optional(),
  basics: z.object({
    name: short.default(''), title: short.default(''), photoUrl: photo.optional(),
    contact: z.object({
      email: short.default(''), phone: short.default(''), location: short.default(''),
      linkedin: short.optional(), github: short.optional(), website: short.optional(),
    }).default({}),
  }).default({}),
  summary: text.default(''),
  experience: entries(z.object({ id, company: short, role: short, location: short.default(''), startDate: short.default(''), endDate: short.default(''), current: z.boolean().default(false), bullets: list.default([]), technologies: list.optional() })),
  education: entries(z.object({ id, institution: short, degree: short, field: short.default(''), location: short.default(''), startDate: short.default(''), endDate: short.default(''), gpa: short.optional(), highlights: list.optional() })),
  projects: entries(z.object({ id, name: short, description: text.default(''), url: short.optional(), technologies: list.default([]), bullets: list.default([]), startDate: short.optional(), endDate: short.optional() })),
  skills: entries(z.object({ id, category: short, skills: list.default([]) })),
  certifications: entries(z.object({ id, name: short, issuer: short.default(''), date: short.default(''), url: short.optional(), expirationDate: short.optional() })),
  awards: entries(z.object({ id, title: short, issuer: short.default(''), date: short.default(''), description: text.optional() })),
  languages: entries(z.object({ id, language: short, proficiency: z.enum(['Native', 'Fluent', 'Advanced', 'Intermediate', 'Basic']) })),
  customSections: entries(z.object({ id, title: short, type: z.enum(['bullets', 'markdown']), content: list.default([]) })),
})

export const templateIdSchema = z.enum(TEMPLATE_IDS)
export const revisionSchema = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER)
export const createCVSchema = z.object({ title: z.string().trim().min(1).max(255).default('Untitled CV'), templateId: templateIdSchema.default('modern'), initialData: cvDataSchema.optional() }).strict()
export const updateCVSchema = z.object({ data: cvDataSchema.optional(), title: z.string().trim().min(1).max(255).optional(), templateId: templateIdSchema.optional(), expectedRevision: revisionSchema }).strict().refine(body => body.data !== undefined || body.title !== undefined || body.templateId !== undefined, 'No changes provided')
