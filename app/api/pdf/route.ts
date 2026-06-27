import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getSessionUser } from '@/lib/db/users'
import { getCVWithCurrentVersion, recordCVExport } from '@/lib/db/cvs'
import { CVData } from '@/lib/types/cv'
import { generateLatex } from '@/lib/latex/generator'
import { promises as fs } from 'fs'
import { tmpdir } from 'os'
import path from 'path'
import { spawn } from 'child_process'
import sharp from 'sharp'

export const runtime = 'nodejs'
export const maxDuration = 60

const MAX_PDF_PHOTO_BYTES = 5 * 1024 * 1024

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
      : ['pdflatex', 'xelatex']

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

    if (!cvData && !cvId) {
      return NextResponse.json({ error: 'No CV data provided' }, { status: 400 })
    }

    let effectiveCVData = cvData as CVData | undefined
    let effectiveTemplateId = typeof templateId === 'string' && templateId.trim().length > 0 ? templateId.trim() : 'modern'
    let effectiveTitle = typeof title === 'string' && title.trim().length > 0 ? title.trim() : undefined

    if (cvId) {
      const cv = await getCVWithCurrentVersion(String(cvId))
      if (!cv || cv.user_id !== user.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
      }

      if (cv.current_version?.data) {
        effectiveCVData = cv.current_version.data as CVData
      }

      effectiveTemplateId = cv.template_id || effectiveTemplateId
      effectiveTitle = cv.title || effectiveTitle
    }

    if (!effectiveCVData) {
      return NextResponse.json({ error: 'No CV data available for export' }, { status: 400 })
    }

    const safeName = sanitizeFileName(effectiveTitle || effectiveCVData.basics?.name || 'cv')

    if (format === 'latex') {
      const latex = generateLatex(effectiveCVData, effectiveTemplateId)
      if (cvId) await recordCVExport(String(cvId))
      return new NextResponse(latex, {
        headers: {
          'Content-Type': 'text/plain',
          'Content-Disposition': `attachment; filename="${safeName}.tex"`,
          'Cache-Control': 'no-store',
        },
      })
    }

    if (format === 'json') {
      if (cvId) await recordCVExport(String(cvId))
      return new NextResponse(JSON.stringify(effectiveCVData, null, 2), {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="${safeName}.json"`,
          'Cache-Control': 'no-store',
        },
      })
    }

    const normalizedCV = effectiveCVData
    const latex = generateLatex(normalizedCV, effectiveTemplateId)
    const pdfBytes = await compileLatexToPdf(latex, normalizedCV)

    if (cvId) await recordCVExport(String(cvId))

    return new NextResponse(Buffer.from(pdfBytes), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${safeName}.pdf"`,
        'X-CV-PDF-Renderer': 'latex',
        'X-CV-PDF-Template': effectiveTemplateId,
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    console.error('PDF generation error:', error)
    return NextResponse.json(
      {
        error: 'Failed to generate PDF',
        message:
          error instanceof Error
            ? error.message
            : 'LaTeX compilation failed. Ensure a LaTeX engine (xelatex or pdflatex) is installed on the server.',
      },
      { status: 500 }
    )
  }
}
