export const TEMPLATE_IDS = ['modern', 'classic', 'minimal', 'compact', 'professional', 'executive', 'banking', 'elegant', 'creative', 'fancy', 'bold', 'infographic', 'tech', 'academic', 'casual', 'vintage', 'timeline', 'editorial', 'consultant', 'architect', 'scholar', 'graduate', 'legal', 'product'] as const
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

export const TEMPLATE_CATEGORIES = ['ATS-Friendly', 'Professional', 'Creative', 'Specialized'] as const
type Category = typeof TEMPLATE_CATEGORIES[number]
// Categories describe composition, rather than a template's position in an array.
const catalogue: Record<TemplateId, { description:string; category:Category; columns?:boolean; popular?:boolean }> = {
  modern: { description:'Contemporary single column with crisp blue section rules', category:'ATS-Friendly',popular:true },
  classic: { description:'Centered serif identity and traditional small-cap headings', category:'ATS-Friendly' },
  minimal: { description:'Quiet typography, open spacing and an understated masthead', category:'ATS-Friendly' },
  compact: { description:'Space-conscious layout with stacked role and date details', category:'ATS-Friendly' },
  professional: { description:'Business layout with a navy banner and grouped sections', category:'Professional',popular:true },
  executive: { description:'Leadership profile with a serif masthead and margin labels', category:'Professional' },
  banking: { description:'Formal financial résumé with a ledger header and date column', category:'Professional' },
  elegant: { description:'Refined serif résumé with a soft sage sidebar on the right', category:'Professional',columns:true,popular:true },
  creative: { description:'Identity and contact rail beside a spacious main narrative', category:'Creative',columns:true },
  fancy: { description:'Framed identity with numbered plum section headings', category:'Creative' },
  bold: { description:'Oversized charcoal masthead and strong uppercase hierarchy', category:'Creative' },
  infographic: { description:'Amber information rail, grouped skills and an offset masthead', category:'Creative',columns:true },
  tech: { description:'Monospaced identity, technical stack rail and projects first', category:'Specialized',columns:true,popular:true },
  academic: { description:'Education-first scholarly CV with numbered research sections', category:'Specialized' },
  casual: { description:'Welcoming centered identity and a light teal sidebar', category:'Specialized',columns:true },
  vintage: { description:'Double-rule serif masthead above balanced newspaper columns', category:'Specialized',columns:true },
  timeline: { description:'Chronological career history with a separate date rail', category:'ATS-Friendly' },
  editorial: { description:'Magazine-inspired type, numbered chapters and a right rail', category:'Creative',columns:true,popular:true },
  consultant: { description:'Clear business narrative with labels in the outer margin', category:'Professional' },
  architect: { description:'Portfolio-first composition with a dark identity side panel', category:'Creative',columns:true },
  scholar: { description:'Research profile with education and credentials in a side rail', category:'Specialized',columns:true },
  graduate: { description:'Education and projects first with a clean skills overview', category:'ATS-Friendly' },
  legal: { description:'Restrained black serif layout with a formal contact ledger', category:'Professional' },
  product: { description:'Project-led narrative with a blue competency sidebar', category:'Specialized',columns:true },
}
export const TEMPLATES = TEMPLATE_IDS.map(id => ({
  id, name: id.charAt(0).toUpperCase() + id.slice(1), ...catalogue[id],
  style: catalogue[id].description,
  desc: catalogue[id].description, preview: `/templates/${id}.webp`,
  atsNote: catalogue[id].columns
    ? 'Multiple columns can change reading order in automated parsers. Use a single-column template when ATS parsing is critical.'
    : 'Single-column text layout. Compatibility depends on the receiving ATS; no score guarantees selection.',
}))

export function resolveTemplateId(value: string | null | undefined): TemplateId {
  const normalized = value?.replace(/-ats$/, '')
  return TEMPLATE_IDS.includes(normalized as TemplateId) ? normalized as TemplateId : 'modern'
}
