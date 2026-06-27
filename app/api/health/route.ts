import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'cv-builder',
    timestamp: new Date().toISOString(),
    latexCommand: process.env.LATEX_CMD || 'auto',
  })
}

