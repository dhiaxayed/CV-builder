import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getSessionUser } from '@/lib/db/users'
import { CVData } from '@/lib/types/cv'
import { generateLatex } from '@/lib/latex/generator'
import { promises as fs } from 'fs'
import { tmpdir } from 'os'
import path from 'path'
import { spawn } from 'child_process'
import { PDFDocument, StandardFonts } from 'pdf-lib'

export const runtime = 'nodejs'
export const maxDuration = 60

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

async function generateSimplePdf(cvData: CVData): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  const page = doc.addPage([595.28, 841.89]) // A4
  const font = await doc.embedFont(StandardFonts.Helvetica)
  const bold = await doc.embedFont(StandardFonts.HelveticaBold)

  const margin = 40
  const width = page.getWidth() - margin * 2
  let y = page.getHeight() - margin

  const drawWrapped = (text: string, size = 10, isBold = false) => {
    const activeFont = isBold ? bold : font
    const words = text.split(/\s+/)
    let line = ''
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word
      if (activeFont.widthOfTextAtSize(candidate, size) <= width) {
        line = candidate
      } else {
        if (y < margin + 20) {
          y = margin
          return
        }
        page.drawText(line, { x: margin, y, size, font: activeFont })
        y -= size + 4
        line = word
      }
    }
    if (line) {
      if (y < margin + 20) {
        y = margin
        return
      }
      page.drawText(line, { x: margin, y, size, font: activeFont })
      y -= size + 4
    }
  }

  const drawSectionTitle = (title: string) => {
    y -= 6
    drawWrapped(title, 12, true)
    y -= 2
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
      y -= 4
    }
  }

  if (cvData.skills?.length) {
    drawSectionTitle('Skills')
    for (const group of cvData.skills) {
      drawWrapped(`${group.category}: ${(group.skills || []).join(', ')}`, 10)
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

async function compileLatexToPdf(latex: string): Promise<Buffer> {
  const tempDir = await fs.mkdtemp(path.join(tmpdir(), 'cv-pdf-'))
  const texPath = path.join(tempDir, 'cv.tex')
  const pdfPath = path.join(tempDir, 'cv.pdf')

  try {
    await fs.writeFile(texPath, latex, 'utf8')

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

    const { cvData, format, templateId, title } = await request.json()

    if (!cvData) {
      return NextResponse.json({ error: 'No CV data provided' }, { status: 400 })
    }

    const safeName = sanitizeFileName(title || cvData.basics?.name || 'cv')

    if (format === 'latex') {
      const latex = generateLatex(cvData as CVData, templateId)
      return new NextResponse(latex, {
        headers: {
          'Content-Type': 'text/plain',
          'Content-Disposition': `attachment; filename="${safeName}.tex"`,
        },
      })
    }

    if (format === 'json') {
      return new NextResponse(JSON.stringify(cvData, null, 2), {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="${safeName}.json"`,
        },
      })
    }

    const normalizedCV = cvData as CVData
    const latex = generateLatex(normalizedCV, templateId)

    let pdfBytes: Uint8Array
    try {
      const pdfBuffer = await compileLatexToPdf(latex)
      pdfBytes = new Uint8Array(pdfBuffer)
    } catch (latexError) {
      const message = latexError instanceof Error ? latexError.message : String(latexError)
      if (!hasLatexRuntimeError(message)) {
        throw latexError
      }
      // Vercel/serverless-safe fallback when LaTeX binaries are unavailable.
      pdfBytes = await generateSimplePdf(normalizedCV)
    }

    return new NextResponse(Buffer.from(pdfBytes), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${safeName}.pdf"`,
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
