import { createHash } from 'node:crypto'
import { PDFParse } from 'pdf-parse'
import { generateLatex, type RenderDensity } from '@/lib/latex/generator'
import { type CVData } from '@/lib/types/cv'
import { compileLatexToPdf } from './compiler'
import { AppError } from '@/lib/errors'

export type PageMode = 'one-page' | 'multi-page'
export type RenderResult = { bytes: Buffer; pages: number; density: RenderDensity; hash: string; latex: string }
export class PDFOverflowError extends AppError {
  constructor(public pages: number, public sections: string[]) {
    super(422, 'PDF_OVERFLOW', `This CV does not fit on one readable page (${pages} pages after safe layout adjustments). Shorten ${sections.join(', ') || 'long entries'}, or explicitly choose multi-page export. No content has been removed.`)
  }
}

export function largestSections(data: CVData): string[] {
  return Object.entries(data).filter(([key]) => key !== 'basics').map(([key,value]) => ({ key, size: JSON.stringify(value).length })).sort((a,b) => b.size-a.size).slice(0,3).map(item => item.key)
}

const cache = new Map<string,{ at: number; value: RenderResult }>()
const pending = new Map<string,Promise<RenderResult>>()
let active = 0

export async function renderCV(data: CVData, templateId: string, pageMode: PageMode = 'one-page', photoData?: string): Promise<RenderResult> {
  const hash = createHash('sha256').update(JSON.stringify({ data,templateId,pageMode,photoData,renderer:process.env.LATEX_RENDERER,version:2 })).digest('hex')
  const cached = cache.get(hash)
  if (cached && Date.now()-cached.at < 180000) return cached.value
  const existing = pending.get(hash)
  if (existing) return existing
  if (active >= 2) throw new AppError(503, 'RENDER_BUSY', 'The PDF renderer is busy. Retry in a moment.')
  const operation = (async () => {
    active += 1
    try {
      let pages = 0
      for (const density of ['normal','compact','dense'] as const) {
        const latex = generateLatex(data,templateId,density)
        const compiled = await compileLatexToPdf(latex,photoData)
        if (compiled.bytes.length > 4 * 1024 * 1024) throw new AppError(413,'PDF_TOO_LARGE','This PDF exceeds the download size limit. Reduce image size or content and retry.')
        const parser = new PDFParse({ data: new Uint8Array(compiled.bytes) })
        try { pages = (await parser.getInfo()).total } finally { await parser.destroy() }
        if (compiled.overfullPoints <= 2 && (pages === 1 || pageMode === 'multi-page')) {
          const result = { bytes:compiled.bytes,pages,density,hash,latex }
          cache.set(hash,{ at:Date.now(),value:result })
          while (cache.size > 8) cache.delete(cache.keys().next().value!)
          return result
        }
      }
      throw new PDFOverflowError(pages,largestSections(data))
    } finally { active -= 1 }
  })()
  pending.set(hash,operation)
  try { return await operation } finally { pending.delete(hash) }
}
