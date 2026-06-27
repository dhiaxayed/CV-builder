import { NextResponse } from 'next/server'
import { spawn } from 'child_process'

export const dynamic = 'force-dynamic'

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
  const requestedCommands = process.env.LATEX_CMD
    ? [process.env.LATEX_CMD]
    : ['pdflatex', 'xelatex']
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
    },
  })
}
