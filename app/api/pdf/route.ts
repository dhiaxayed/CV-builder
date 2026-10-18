import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getCVWithCurrentVersion, recordCVExport } from '@/lib/db/cvs'
import { cvDataSchema, templateIdSchema, revisionSchema } from '@/lib/validation/cv'
import { requireUser, readJSON, apiError } from '@/lib/server/api'
import { photoDataForOwner } from '@/lib/server/photo-data'
import { rateLimit } from '@/lib/server/rate-limit'
import { renderCV, PDFOverflowError } from '@/lib/pdf/render'
import { AppError } from '@/lib/errors'
import { latexPackage } from '@/lib/pdf/source'

export const runtime = 'nodejs'
export const maxDuration = 300
const inputSchema = z.object({
  cvData: cvDataSchema.optional(), cvId: z.string().min(1).max(100).optional(),
  expectedRevision: revisionSchema.optional(), templateId: templateIdSchema.default('modern'),
  title: z.string().max(255).optional(), format: z.enum(['pdf','latex','latex-bundle','json']).default('pdf'),
  pageMode: z.enum(['one-page','multi-page']).default('one-page'), intent: z.enum(['preview','export']).default('export'),
}).strict()

export async function POST(request: Request) {
  try {
    const user = await requireUser()
    const input = await readJSON(request,inputSchema)
    let data = input.cvData
    let template = input.templateId
    let title = input.title
    if (input.cvId) {
      const cv = await getCVWithCurrentVersion(input.cvId,user.id)
      if (!cv) throw new AppError(404,'CV_NOT_FOUND','CV not found')
      if (input.expectedRevision === undefined || input.expectedRevision !== cv.revision) throw new AppError(409,'REVISION_CONFLICT','This CV changed. Reload or save before exporting.')
      data = cv.draft_data
      template = templateIdSchema.parse(cv.template_id)
      title = cv.title
    }
    if (!data) throw new AppError(400,'INVALID_CV','CV content is required.')
    const photo = await photoDataForOwner(data.basics.photoUrl,user.id)
    const filename = (title || data.basics.name || 'cv').replace(/[^a-zA-Z0-9_-]+/g,'_').slice(0,80)
    const headers = { 'Cache-Control':'no-store','X-Content-Type-Options':'nosniff' }
    if (input.format === 'json') {
      const portable = photo ? { ...data,basics:{ ...data.basics,photoUrl:photo } } : data
      return new NextResponse(JSON.stringify(portable,null,2),{ headers:{ ...headers,'Content-Type':'application/json','Content-Disposition':`attachment; filename="${filename}.json"` } })
    }
    await rateLimit(`pdf:${input.intent}:${user.id}`,input.intent === 'preview' ? 60 : 20,60)
    const rendered = await renderCV(data,template,input.pageMode,photo)
    if (input.format === 'latex-bundle') return new NextResponse(Buffer.from(await latexPackage(rendered.latex,photo)),{ headers:{ ...headers,'Content-Type':'application/zip','Content-Disposition':`attachment; filename="${filename}.zip"` } })
    if (input.format === 'latex') return new NextResponse(rendered.latex,{ headers:{ ...headers,'Content-Type':'text/plain; charset=utf-8','Content-Disposition':`attachment; filename="${filename}.tex"` } })
    if (input.cvId && input.intent === 'export') await recordCVExport(input.cvId,user.id)
    return new NextResponse(Buffer.from(rendered.bytes),{ headers:{ ...headers,
      'Content-Type':'application/pdf','Content-Disposition':`inline; filename="${filename}.pdf"`,
      'X-CV-PDF-Renderer':'latex','X-CV-PDF-Template':template,'X-CV-PDF-Pages':String(rendered.pages),
      'X-CV-PDF-Density':rendered.density,'X-CV-Render-Hash':rendered.hash,
    } })
  } catch (error) {
    if (error instanceof PDFOverflowError) return NextResponse.json({ error:error.message,message:error.message,code:error.code,pages:error.pages,sections:error.sections },{ status:422 })
    return apiError(error)
  }
}
