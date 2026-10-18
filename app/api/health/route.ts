import { NextResponse } from 'next/server'
import { serverDatabaseKey } from '@/lib/db/config'

export const dynamic = 'force-dynamic'

// Liveness must be inexpensive and must not expose binary paths, versions,
// runtime stderr or provider diagnostics. Deployment readiness needs a real
// authenticated PDF/AI smoke test; a binary version check cannot prove it.
export async function GET() {
  return NextResponse.json({
    status:'ok',service:'cv-builder',
    databaseConfigured:Boolean((process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL) && serverDatabaseKey(process.env)),
    aiConfigured:Boolean(process.env.GROQ_API_KEY || process.env.OPENROUTER_API_KEY),
    pdfReadiness:'requires-real-compilation-smoke-test',
  },{ headers:{ 'Cache-Control':'no-store' } })
}
