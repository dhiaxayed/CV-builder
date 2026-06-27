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
import { createCompiler } from 'node-latex-compiler'

export const runtime = 'nodejs'
export const maxDuration = 300

const MAX_PDF_PHOTO_BYTES = 5 * 1024 * 1024
const DEFAULT_LATEX_COMMANDS = ['pdflatex', 'xelatex']
const LATEX_RENDERERS = ['auto', 'system', 'tectonic'] as const

type LatexRenderer = (typeof LATEX_RENDERERS)[number]

class LatexEngineNotFoundError extends Error {
  readonly commands: string[]

  constructor(commands: string[], lastError?: string) {
    const runtimeHint = process.env.VERCEL
      ? 'Vercel serverless functions do not include pdflatex/xelatex. Set LATEX_RENDERER=tectonic to use the bundled Tectonic LaTeX engine on Vercel.'
      : 'Install TeX Live or MiKTeX on the server, set LATEX_RENDERER=tectonic, or set LATEX_CMD to the absolute path of an installed LaTeX engine.'

    super(
      `LaTeX engine not found. Tried: ${commands.join(', ')}. ${runtimeHint}${
        lastError ? ` Last error: ${lastError}` : ''
      }`
    )
    this.name = 'LatexEngineNotFoundError'
    this.commands = commands
  }
}

class LatexCompilationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'LatexCompilationError'
  }
}

function getLatexCommands(): string[] {
  const configuredCommand = process.env.LATEX_CMD?.trim()
  return configuredCommand ? [configuredCommand] : DEFAULT_LATEX_COMMANDS
}

function getLatexRenderer(): LatexRenderer {
  const renderer = process.env.LATEX_RENDERER?.trim().toLowerCase()
  return LATEX_RENDERERS.includes(renderer as LatexRenderer) ? (renderer as LatexRenderer) : 'auto'
}

function isSpawnNotFound(error: unknown): boolean {
  return (
    error instanceof Error &&
    'code' in error &&
    (error as NodeJS.ErrnoException).code === 'ENOENT'
  )
}

function resolveTectonicPath(): string {
  const compiler = createCompiler() as unknown as {
    isAvailable: () => boolean
    tectonicPath?: string | null
  }

  if (!compiler.isAvailable() || !compiler.tectonicPath) {
    throw new LatexEngineNotFoundError(['tectonic'], 'Bundled Tectonic executable was not found.')
  }

  return compiler.tectonicPath
}

async function compileLatexWithTectonic(texPath: string, tempDir: string): Promise<Buffer> {
  const tectonicPath = resolveTectonicPath()
  const cacheDir = path.join(tmpdir(), 'tectonic-cache')
  await fs.mkdir(cacheDir, { recursive: true })

  const result = await new Promise<{ code: number | null; stdout: string; stderr: string }>((resolve, reject) => {
    const child = spawn(tectonicPath, [texPath, `--outdir=${tempDir}`], {
      cwd: tempDir,
      env: {
        ...process.env,
        HOME: tmpdir(),
        XDG_CACHE_HOME: process.env.XDG_CACHE_HOME || cacheDir,
        TECTONIC_CACHE_DIR: process.env.TECTONIC_CACHE_DIR || cacheDir,
      },
    })

    let stdout = ''
    let stderr = ''

    child.stdout.on('data', (data) => {
      stdout += data.toString()
    })

    child.stderr.on('data', (data) => {
      stderr += data.toString()
    })

    child.on('error', reject)
    child.on('close', (code) => resolve({ code, stdout, stderr }))
  })

  if (result.code === 0) {
    const pdfPath = path.join(tempDir, `${path.basename(texPath, path.extname(texPath))}.pdf`)
    return fs.readFile(pdfPath)
  }

  throw new LatexCompilationError(
    result.stderr ||
      result.stdout ||
      `Tectonic LaTeX compilation failed with exit code ${result.code}.`
  )
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

    const renderer = getLatexRenderer()
    const commands = renderer === 'tectonic' ? [] : getLatexCommands()

    let lastError = ''
    let missingEngineCount = 0

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
        if (isSpawnNotFound(error)) {
          missingEngineCount += 1
        }
      }
    }

    if (renderer !== 'system') {
      try {
        return await compileLatexWithTectonic(texPath, tempDir)
      } catch (error) {
        lastError = error instanceof Error ? error.message : String(error)
      }
    }

    if (commands.length > 0 && missingEngineCount === commands.length) {
      throw new LatexEngineNotFoundError(commands, lastError)
    }

    throw new LatexCompilationError(lastError || 'LaTeX compilation failed')
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
    const isMissingEngine = error instanceof LatexEngineNotFoundError

    return NextResponse.json(
      {
        error: 'Failed to generate PDF',
        code: isMissingEngine ? 'LATEX_ENGINE_NOT_FOUND' : 'LATEX_COMPILATION_FAILED',
        message:
          error instanceof Error
            ? error.message
            : 'LaTeX compilation failed. Ensure a LaTeX engine (xelatex or pdflatex) is installed on the server.',
        renderer: 'latex',
      },
      { status: isMissingEngine ? 503 : 500 }
    )
  }
}
