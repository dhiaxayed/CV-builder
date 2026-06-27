import { NextResponse } from 'next/server'
import { spawn } from 'child_process'

export const dynamic = 'force-dynamic'

const DEFAULT_LATEX_COMMANDS = ['pdflatex', 'xelatex']

function getLatexCommands(): string[] {
  const configuredCommand = process.env.LATEX_CMD?.trim()
  return configuredCommand ? [configuredCommand] : DEFAULT_LATEX_COMMANDS
}

function getLatexUnavailableMessage(commands: string[]): string {
  const runtimeHint = process.env.VERCEL
    ? 'Vercel serverless functions do not include a TeX distribution. Use the Docker deployment/runtime that installs TeX Live, or move PDF compilation to a LaTeX worker.'
    : 'Install TeX Live or MiKTeX on the server, or set LATEX_CMD to the absolute path of an installed LaTeX engine.'

  return `No LaTeX engine found. Tried: ${commands.join(', ')}. ${runtimeHint}`
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

export async function GET() {
  const requestedCommands = getLatexCommands()
  const latexCommands = await Promise.all(requestedCommands.map(checkCommand))
  const latexAvailable = latexCommands.some((item) => item.available)

  return NextResponse.json({
    status: 'ok',
    service: 'cv-builder',
    timestamp: new Date().toISOString(),
    latex: {
      available: latexAvailable,
      commands: latexCommands,
      mode: latexAvailable ? 'latex' : 'unavailable',
      message: latexAvailable ? undefined : getLatexUnavailableMessage(requestedCommands),
    },
  })
}
