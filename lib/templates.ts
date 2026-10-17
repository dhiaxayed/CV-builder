export const TEMPLATE_IDS = ['modern', 'classic', 'minimal', 'compact', 'professional', 'executive', 'banking', 'elegant', 'creative', 'fancy', 'bold', 'infographic', 'tech', 'academic', 'casual', 'vintage'] as const
export type TemplateId = typeof TEMPLATE_IDS[number]

export const COLOR_THEMES = [
  { id:'template',name:'Template default',color:null },
  { id:'navy',name:'Navy',color:'183650' },
  { id:'teal',name:'Teal',color:'17665F' },
  { id:'violet',name:'Violet',color:'613C85' },
  { id:'burgundy',name:'Burgundy',color:'81354D' },
  { id:'graphite',name:'Graphite',color:'303641' },
  { id:'amber',name:'Amber',color:'8C4D12' },
] as const
type ColorThemeId = typeof COLOR_THEMES[number]['id']
export const COLOR_THEME_IDS = COLOR_THEMES.map(theme => theme.id) as [ColorThemeId,...ColorThemeId[]]

const descriptions = [
  'Clean contemporary hierarchy', 'Traditional serif presentation', 'Restrained typography and generous rhythm',
  'Dense, readable layout', 'Structured business presentation', 'Leadership profile with a strong masthead',
  'Conservative finance typography', 'Refined two-column layout', 'Asymmetric creative composition',
  'Decorative section accents', 'High-contrast typographic statement', 'Visual two-column information groups',
  'Technical skills and projects first', 'Education and research first', 'Approachable sans-serif presentation',
  'Classic small-cap typography',
]
export const TEMPLATES = TEMPLATE_IDS.map((id, index) => ({
  id, name: id.charAt(0).toUpperCase() + id.slice(1), description: descriptions[index],
  popular: [0,4,7,11,12].includes(index),
  style: descriptions[index],
  desc: descriptions[index], preview: `/templates/${id}.webp`,
  category: index < 4 ? 'ATS-Friendly' : index < 8 ? 'Professional' : index < 12 ? 'Creative' : 'Specialized',
  atsNote: ['elegant', 'creative', 'infographic'].includes(id)
    ? 'Multiple columns can change reading order in automated parsers. Use a single-column template when ATS parsing is critical.'
    : 'Single-column text layout. Compatibility depends on the receiving ATS; no score guarantees selection.',
}))

export function resolveTemplateId(value: string | null | undefined): TemplateId {
  const normalized = value?.replace(/-ats$/, '')
  return TEMPLATE_IDS.includes(normalized as TemplateId) ? normalized as TemplateId : 'modern'
}
