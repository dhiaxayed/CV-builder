import { NextResponse } from 'next/server'
import { spawn } from 'child_process'
import { createCompiler } from 'node-latex-compiler'
import { promises as fs } from 'fs'
import { tmpdir } from 'os'
import path from 'path'

export const dynamic = 'force-dynamic'

const DEFAULT_LATEX_COMMANDS = ['pdflatex', 'xelatex']
const LATEX_RENDERERS = ['auto', 'system', 'tectonic'] as const

type LatexRenderer = (typeof LATEX_RENDERERS)[number]

function getLatexCommands(): string[] {
  const configuredCommand = process.env.LATEX_CMD?.trim()
  return configuredCommand ? [configuredCommand] : DEFAULT_LATEX_COMMANDS
}

function getLatexRenderer(): LatexRenderer {
  const renderer = process.env.LATEX_RENDERER?.trim().toLowerCase()
  return LATEX_RENDERERS.includes(renderer as LatexRenderer) ? (renderer as LatexRenderer) : 'auto'
}

function getLatexUnavailableMessage(commands: string[], renderer: LatexRenderer): string {
  const runtimeHint = process.env.VERCEL
    ? 'Vercel serverless functions do not include pdflatex/xelatex. Set LATEX_RENDERER=tectonic to use the bundled Tectonic LaTeX engine on Vercel.'
    : 'Install TeX Live or MiKTeX on the server, set LATEX_RENDERER=tectonic, or set LATEX_CMD to the absolute path of an installed LaTeX engine.'

  return `No LaTeX engine found for renderer "${renderer}". Tried system commands: ${commands.join(', ')} and bundled Tectonic. ${runtimeHint}`
}

async function checkCommand(command: string): Promise<{ command: string; available: boolean; version?: string }> {
  return new Promise((resolve) => {
    const child = spawn(command, ['--version'])
    let output = ''

    const timeout = setTimeout(() => {
      child.kill()
      resolve({ command, available: false })
    }, 3000)

    child.stdout.on('data', (chunk) => {
      output += chunk.toString()
    })

    child.on('error', () => {
      clearTimeout(timeout)
      resolve({ command, available: false })
    })

    child.on('close', (code) => {
      clearTimeout(timeout)
      resolve({
        command,
        available: code === 0,
        version: output.split('\n')[0]?.trim() || undefined,
      })
    })
  })
}

function resolveTectonicPath(): string | null {
  try {
    const compiler = createCompiler() as unknown as {
      isAvailable: () => boolean
      tectonicPath?: string | null
    }

    return compiler.isAvailable() && compiler.tectonicPath ? compiler.tectonicPath : null
  } catch {
    return null
  }
}

async function getTectonicRuntimeEnv() {
  const cacheDir = path.join(tmpdir(), 'tectonic-cache')
  const libraryPath = path.join(process.cwd(), 'vendor', 'tectonic-linux-x64', 'lib')
  await fs.mkdir(cacheDir, { recursive: true })

  return {
    ...process.env,
    HOME: tmpdir(),
    XDG_CACHE_HOME: process.env.XDG_CACHE_HOME || cacheDir,
    TECTONIC_CACHE_DIR: process.env.TECTONIC_CACHE_DIR || cacheDir,
    LD_LIBRARY_PATH: process.env.LD_LIBRARY_PATH
      ? `${libraryPath}:${process.env.LD_LIBRARY_PATH}`
      : libraryPath,
  }
}

async function checkTectonic(): Promise<{ available: boolean; version?: string | null; error?: string }> {
  const tectonicPath = resolveTectonicPath()
  if (!tectonicPath) return { available: false, error: 'Bundled Tectonic executable was not found.' }

  try {
    const env = await getTectonicRuntimeEnv()

    return await new Promise((resolve) => {
      const child = spawn(tectonicPath, ['--version'], { env })
      let output = ''
      let errorOutput = ''

      const timeout = setTimeout(() => {
        child.kill()
        resolve({ available: false, error: 'Tectonic version check timed out.' })
      }, 5000)

      child.stdout.on('data', (chunk) => {
        output += chunk.toString()
      })

      child.stderr.on('data', (chunk) => {
        errorOutput += chunk.toString()
      })

      child.on('error', (error) => {
        clearTimeout(timeout)
        resolve({ available: false, error: error.message })
      })

      child.on('close', (code) => {
        clearTimeout(timeout)
        resolve({
          available: code === 0,
          version: output.split('\n')[0]?.trim() || undefined,
          error: code === 0 ? undefined : errorOutput || output || `Tectonic exited with code ${code}.`,
        })
      })
    })
  } catch (error) {
    return { available: false }
  }
}

export async function GET() {
  const renderer = getLatexRenderer()
  const requestedCommands = getLatexCommands()
  const latexCommands = await Promise.all(requestedCommands.map(checkCommand))
  const tectonic = await checkTectonic()
  const systemAvailable = latexCommands.some((item) => item.available)
  const latexAvailable =
    renderer === 'system'
      ? systemAvailable
      : renderer === 'tectonic'
        ? tectonic.available
        : systemAvailable || tectonic.available

  return NextResponse.json({
    status: 'ok',
    service: 'cv-builder',
    timestamp: new Date().toISOString(),
    ai: {
      provider: 'groq',
      configured: Boolean(process.env.GROQ_API_KEY),
      model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
      message: process.env.GROQ_API_KEY
        ? undefined
        : 'GROQ_API_KEY is missing. Add it in Vercel Project Settings > Environment Variables, then redeploy.',
    },
    latex: {
      available: latexAvailable,
      renderer,
      system: {
        available: systemAvailable,
        commands: latexCommands,
      },
      tectonic,
      mode: latexAvailable
        ? renderer === 'tectonic' || (!systemAvailable && tectonic.available)
          ? 'tectonic'
          : 'system-latex'
        : 'unavailable',
      message: latexAvailable ? undefined : getLatexUnavailableMessage(requestedCommands, renderer),
    },
  })
}
