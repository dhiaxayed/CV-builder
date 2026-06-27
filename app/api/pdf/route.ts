import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getSessionUser } from '@/lib/db/users'
import { getCV, recordCVExport } from '@/lib/db/cvs'
import { CVData } from '@/lib/types/cv'
import { generateLatex } from '@/lib/latex/generator'
import { promises as fs } from 'fs'
import { tmpdir } from 'os'
import path from 'path'
import { spawn } from 'child_process'
import { PDFDocument, StandardFonts, rgb, type RGB } from 'pdf-lib'
import sharp from 'sharp'

export const runtime = 'nodejs'
export const maxDuration = 60

const MAX_PDF_PHOTO_BYTES = 5 * 1024 * 1024

function hasLatexRuntimeError(message: string): boolean {
  const lowered = message.toLowerCase()
  return (
    lowered.includes('enoent') ||
    lowered.includes('not found') ||
    lowered.includes('xelatex') ||
    lowered.includes('pdflatex')
  )
}

function formatDateRange(start?: string, end?: string, current?: boolean): string {
  const from = start || ''
  const to = current ? 'Present' : end || ''
  return [from, to].filter(Boolean).join(' - ')
}

type SimplePdfStyle = {
  label: string
  banner: [number, number, number]
  accent: [number, number, number]
  sidebar?: [number, number, number]
}

const FALLBACK_TEMPLATE_STYLES: Record<string, SimplePdfStyle> = {
  modern: { label: 'Modern', banner: [33, 99, 235], accent: [37, 99, 235] },
  classic: { label: 'Classic', banner: [55, 65, 81], accent: [31, 41, 55] },
  minimal: { label: 'Minimal', banner: [107, 114, 128], accent: [75, 85, 99] },
  compact: { label: 'Compact', banner: [30, 64, 175], accent: [30, 58, 138] },
  professional: { label: 'Professional', banner: [30, 58, 138], accent: [30, 64, 175] },
  executive: { label: 'Executive', banner: [15, 23, 42], accent: [30, 41, 59] },
  banking: { label: 'Banking', banner: [17, 24, 39], accent: [17, 24, 39], sidebar: [226, 232, 240] },
  elegant: { label: 'Elegant', banner: [59, 130, 246], accent: [37, 99, 235], sidebar: [239, 246, 255] },
  creative: { label: 'Creative', banner: [236, 72, 153], accent: [190, 24, 93], sidebar: [253, 242, 248] },
  fancy: { label: 'Fancy', banner: [217, 70, 239], accent: [168, 85, 247], sidebar: [250, 245, 255] },
  bold: { label: 'Bold', banner: [220, 38, 38], accent: [185, 28, 28], sidebar: [254, 242, 242] },
  infographic: { label: 'Infographic', banner: [249, 115, 22], accent: [234, 88, 12], sidebar: [255, 247, 237] },
  tech: { label: 'Tech', banner: [6, 95, 70], accent: [4, 120, 87], sidebar: [236, 253, 245] },
  academic: { label: 'Academic', banner: [67, 56, 202], accent: [79, 70, 229], sidebar: [238, 242, 255] },
  casual: { label: 'Casual', banner: [14, 165, 233], accent: [2, 132, 199], sidebar: [240, 249, 255] },
  vintage: { label: 'Vintage', banner: [120, 53, 15], accent: [146, 64, 14], sidebar: [255, 251, 235] },
}

function toRgb(color: [number, number, number]): RGB {
  return rgb(color[0] / 255, color[1] / 255, color[2] / 255)
}

function getFallbackStyle(templateId?: string): SimplePdfStyle {
  if (!templateId) return FALLBACK_TEMPLATE_STYLES.modern
  return FALLBACK_TEMPLATE_STYLES[templateId] ?? FALLBACK_TEMPLATE_STYLES.modern
}

function getDataUrlImageBuffer(photoUrl?: string): Buffer | null {
  if (!photoUrl?.startsWith('data:image/')) return null

  const match = photoUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/)
  if (!match) return null

  const buffer = Buffer.from(match[2], 'base64')
  if (buffer.length === 0 || buffer.length > MAX_PDF_PHOTO_BYTES) return null
  return buffer
}

async function getPngPhotoBuffer(photoUrl?: string): Promise<Buffer | null> {
  const source = getDataUrlImageBuffer(photoUrl)
  if (!source) return null

  return sharp(source, { animated: false })
    .rotate()
    .resize({ width: 256, height: 256, fit: 'cover', withoutEnlargement: true })
    .png()
    .toBuffer()
}

function injectLatexPhoto(latex: string, photoFileName: string): string {
  const graphicxPattern = /\\usepackage(?:\[[^\]]*\])?\{graphicx\}/
  const withPackage = graphicxPattern.test(latex)
    ? latex
    : latex.replace('\\begin{document}', '\\usepackage{graphicx}\n\\begin{document}')

  return withPackage.replace(
    '\\begin{document}',
    `\\begin{document}
\\begin{center}
\\includegraphics[width=2.4cm,height=2.4cm,keepaspectratio]{${photoFileName}}
\\end{center}
\\vspace{0.2cm}
`
  )
}

async function generateSimplePdf(cvData: CVData, templateId?: string): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  const font = await doc.embedFont(StandardFonts.Helvetica)
  const bold = await doc.embedFont(StandardFonts.HelveticaBold)
  const photoBuffer = await getPngPhotoBuffer(cvData.basics?.photoUrl)
  const photoImage = photoBuffer ? await doc.embedPng(photoBuffer) : null
  const style = getFallbackStyle(templateId)
  const bannerColor = toRgb(style.banner)
  const accentColor = toRgb(style.accent)
  const sidebarColor = style.sidebar ? toRgb(style.sidebar) : null
  const textColor = rgb(0.11, 0.11, 0.13)
  const invertedText = rgb(1, 1, 1)

  const margin = 40
  const bannerHeight = 46
  let page = doc.addPage([595.28, 841.89]) // A4
  const width = page.getWidth() - margin * 2

  const drawPageChrome = () => {
    if (sidebarColor) {
      page.drawRectangle({
        x: 0,
        y: 0,
        width: 16,
        height: page.getHeight(),
        color: sidebarColor,
      })
    }

    page.drawRectangle({
      x: 0,
      y: page.getHeight() - bannerHeight,
      width: page.getWidth(),
      height: bannerHeight,
      color: bannerColor,
    })

    page.drawText(`Template: ${style.label} (Compatibility PDF)`, {
      x: margin,
      y: page.getHeight() - 30,
      size: 11,
      font: bold,
      color: invertedText,
    })
  }

  let y = page.getHeight() - bannerHeight - margin + 4
  drawPageChrome()

  const ensureSpace = (height: number) => {
    if (y >= margin + height) return
    page = doc.addPage([595.28, 841.89])
    drawPageChrome()
    y = page.getHeight() - bannerHeight - margin + 4
  }

  const drawWrapped = (text: string, size = 10, isBold = false, color: RGB = textColor) => {
    const activeFont = isBold ? bold : font
    const words = text.split(/\s+/)
    let line = ''
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word
      if (activeFont.widthOfTextAtSize(candidate, size) <= width) {
        line = candidate
      } else {
        ensureSpace(size + 4)
        page.drawText(line, { x: margin, y, size, font: activeFont, color })
        y -= size + 4
        line = word
      }
    }
    if (line) {
      ensureSpace(size + 4)
      page.drawText(line, { x: margin, y, size, font: activeFont, color })
      y -= size + 4
    }
  }

  const drawSectionTitle = (title: string) => {
    y -= 6
    drawWrapped(title, 12, true, accentColor)
    y -= 2
  }

  if (photoImage) {
    const photoSize = 68
    ensureSpace(photoSize + 10)
    page.drawImage(photoImage, {
      x: (page.getWidth() - photoSize) / 2,
      y: y - photoSize,
      width: photoSize,
      height: photoSize,
    })
    y -= photoSize + 12
  }

  drawWrapped(cvData.basics?.name || 'Unnamed Candidate', 20, true)
  drawWrapped(cvData.basics?.title || 'Curriculum Vitae', 12)

  const contactBits = [
    cvData.basics?.contact?.email,
    cvData.basics?.contact?.phone,
    cvData.basics?.contact?.location,
    cvData.basics?.contact?.linkedin,
    cvData.basics?.contact?.github,
    cvData.basics?.contact?.website,
  ].filter(Boolean)

  if (contactBits.length > 0) {
    drawWrapped(contactBits.join(' | '), 10)
  }

  if (cvData.summary?.trim()) {
    drawSectionTitle('Summary')
    drawWrapped(cvData.summary.trim(), 10)
  }

  if (cvData.experience?.length) {
    drawSectionTitle('Experience')
    for (const exp of cvData.experience) {
      drawWrapped(`${exp.role} - ${exp.company}`, 11, true)
      drawWrapped(`${exp.location || ''} ${formatDateRange(exp.startDate, exp.endDate, exp.current)}`.trim(), 9)
      for (const bullet of exp.bullets || []) {
        drawWrapped(`- ${bullet}`, 10)
      }
      if (exp.technologies?.length) {
        drawWrapped(`Technologies: ${exp.technologies.join(', ')}`, 9)
      }
      y -= 4
    }
  }

  if (cvData.education?.length) {
    drawSectionTitle('Education')
    for (const edu of cvData.education) {
      drawWrapped(`${edu.degree} in ${edu.field} - ${edu.institution}`, 10, true)
      drawWrapped(`${edu.location || ''} ${formatDateRange(edu.startDate, edu.endDate, false)}`.trim(), 9)
      if (edu.gpa) {
        drawWrapped(`GPA: ${edu.gpa}`, 9)
      }
      if (edu.highlights?.length) {
        drawWrapped(`Highlights: ${edu.highlights.join(', ')}`, 9)
      }
      y -= 4
    }
  }

  if (cvData.skills?.length) {
    drawSectionTitle('Skills')
    for (const group of cvData.skills) {
      drawWrapped(`${group.category}: ${(group.skills || []).join(', ')}`, 10)
    }
  }

  if (cvData.projects?.length) {
    drawSectionTitle('Projects')
    for (const project of cvData.projects) {
      drawWrapped(project.name || 'Project', 10, true)
      const projectMeta = [
        project.url,
        formatDateRange(project.startDate, project.endDate, false),
      ].filter(Boolean)
      if (projectMeta.length) {
        drawWrapped(projectMeta.join(' | '), 9)
      }
      if (project.description) {
        drawWrapped(project.description, 10)
      }
      for (const bullet of project.bullets || []) {
        drawWrapped(`- ${bullet}`, 10)
      }
      if (project.technologies?.length) {
        drawWrapped(`Technologies: ${project.technologies.join(', ')}`, 9)
      }
      y -= 4
    }
  }

  if (cvData.certifications?.length) {
    drawSectionTitle('Certifications')
    for (const cert of cvData.certifications) {
      const dateLabel = [cert.date, cert.expirationDate ? `Valid until ${cert.expirationDate}` : '']
        .filter(Boolean)
        .join(' | ')
      drawWrapped(`${cert.name} - ${cert.issuer}${dateLabel ? ` (${dateLabel})` : ''}`, 10)
    }
  }

  if (cvData.awards?.length) {
    drawSectionTitle('Awards')
    for (const award of cvData.awards) {
      drawWrapped(`${award.title} - ${award.issuer}${award.date ? ` (${award.date})` : ''}`, 10, true)
      if (award.description) {
        drawWrapped(award.description, 10)
      }
    }
  }

  if (cvData.languages?.length) {
    drawSectionTitle('Languages')
    drawWrapped(cvData.languages.map((item) => `${item.language}: ${item.proficiency}`).join(' | '), 10)
  }

  if (cvData.customSections?.length) {
    for (const section of cvData.customSections) {
      drawSectionTitle(section.title)
      for (const item of section.content || []) {
        drawWrapped(section.type === 'bullets' ? `- ${item}` : item, 10)
      }
    }
  }

  return doc.save()
}

function sanitizeFileName(name: string): string {
  const cleaned = name.replace(/[^a-zA-Z0-9-_]+/g, '_').slice(0, 80)
  return cleaned || 'cv'
}

async function runLatex(command: string, args: string[], cwd: string): Promise<{ code: number | null; stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd })
    let stdout = ''
    let stderr = ''

    child.stdout.on('data', (data) => {
      stdout += data.toString()
    })

    child.stderr.on('data', (data) => {
      stderr += data.toString()
    })

    child.on('error', (error) => {
      reject(error)
    })

    child.on('close', (code) => {
      resolve({ code, stdout, stderr })
    })
  })
}

async function compileLatexToPdf(latex: string, cvData?: CVData): Promise<Buffer> {
  const tempDir = await fs.mkdtemp(path.join(tmpdir(), 'cv-pdf-'))
  const texPath = path.join(tempDir, 'cv.tex')
  const pdfPath = path.join(tempDir, 'cv.pdf')

  try {
    const photoBuffer = await getPngPhotoBuffer(cvData?.basics?.photoUrl)
    const latexSource = photoBuffer ? injectLatexPhoto(latex, 'cv_photo.png') : latex

    if (photoBuffer) {
      await fs.writeFile(path.join(tempDir, 'cv_photo.png'), photoBuffer)
    }

    await fs.writeFile(texPath, latexSource, 'utf8')

    const commands = process.env.LATEX_CMD
      ? [process.env.LATEX_CMD]
      : ['xelatex', 'pdflatex']

    let lastError = ''

    for (const command of commands) {
      try {
        const args = [
          '-interaction=nonstopmode',
          '-halt-on-error',
          '-output-directory',
          tempDir,
          texPath,
        ]

        const result = await runLatex(command, args, tempDir)
        if (result.code === 0) {
          const pdfBuffer = await fs.readFile(pdfPath)
          return pdfBuffer
        }

        lastError = result.stderr || result.stdout || `LaTeX command ${command} failed`
      } catch (error) {
        lastError = error instanceof Error ? error.message : String(error)
      }
    }

    throw new Error(lastError || 'LaTeX compilation failed')
  } finally {
    try {
      await fs.rm(tempDir, { recursive: true, force: true })
    } catch {
      // Ignore cleanup errors
    }
  }
}

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies()
    const sessionToken = cookieStore.get('session')?.value
    
    if (!sessionToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const user = await getSessionUser(sessionToken)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { cvData, cvId, format, templateId, title } = await request.json()

    if (!cvData) {
      return NextResponse.json({ error: 'No CV data provided' }, { status: 400 })
    }

    if (cvId) {
      const cv = await getCV(String(cvId))
      if (!cv || cv.user_id !== user.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
      }
    }

    const requestedTemplateId =
      typeof templateId === 'string' && templateId.trim().length > 0 ? templateId.trim() : 'modern'

    const safeName = sanitizeFileName(title || cvData.basics?.name || 'cv')

    if (format === 'latex') {
      const latex = generateLatex(cvData as CVData, requestedTemplateId)
      if (cvId) await recordCVExport(String(cvId))
      return new NextResponse(latex, {
        headers: {
          'Content-Type': 'text/plain',
          'Content-Disposition': `attachment; filename="${safeName}.tex"`,
        },
      })
    }

    if (format === 'json') {
      if (cvId) await recordCVExport(String(cvId))
      return new NextResponse(JSON.stringify(cvData, null, 2), {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="${safeName}.json"`,
        },
      })
    }

    const normalizedCV = cvData as CVData
    const latex = generateLatex(normalizedCV, requestedTemplateId)

    let renderMode: 'latex' | 'fallback' = 'latex'
    let pdfBytes: Uint8Array
    try {
      const pdfBuffer = await compileLatexToPdf(latex, normalizedCV)
      pdfBytes = new Uint8Array(pdfBuffer)
    } catch (latexError) {
      const message = latexError instanceof Error ? latexError.message : String(latexError)
      if (!hasLatexRuntimeError(message)) {
        throw latexError
      }
      // Vercel/serverless-safe fallback when LaTeX binaries are unavailable.
      renderMode = 'fallback'
      pdfBytes = await generateSimplePdf(normalizedCV, requestedTemplateId)
    }

    if (cvId) await recordCVExport(String(cvId))

    return new NextResponse(Buffer.from(pdfBytes), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${safeName}.pdf"`,
        'X-CV-PDF-Renderer': renderMode,
        'X-CV-PDF-Template': requestedTemplateId,
      },
    })
  } catch (error) {
    console.error('PDF generation error:', error)
    return NextResponse.json(
      {
        error: 'Failed to generate PDF',
        message: 'LaTeX compilation failed. Ensure a LaTeX engine (xelatex or pdflatex) is installed on the server.',
      },
      { status: 500 }
    )
  }
}
