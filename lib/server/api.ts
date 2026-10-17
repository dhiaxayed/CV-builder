import 'server-only'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { z } from 'zod'
import { getSessionUser } from '@/lib/db/users'
import { AppError } from '@/lib/errors'

export async function requireUser() {
  const token = (await cookies()).get('session')?.value
  const user = token ? await getSessionUser(token) : null
  if (!user) throw new AppError(401, 'UNAUTHORIZED', 'Sign in to continue.')
  return user
}

export function requestOrigin(request: Request) {
  const url = new URL(request.url)
  // Next's development proxy can normalize request.url to localhost while the
  // browser uses 127.0.0.1. Host is the actual target chosen by the browser.
  const host = request.headers.get('host') || url.host
  const forwardedProtocol = process.env.TRUST_PROXY_HEADERS === '1' ? request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim() : undefined
  const protocol = process.env.VERCEL ? 'https:' : forwardedProtocol === 'https' ? 'https:' : url.protocol
  return new URL(`${protocol}//${host}`).origin
}

export function assertSameOrigin(request: Request) {
  const origin = request.headers.get('origin')
  const site = request.headers.get('sec-fetch-site')
  if (site === 'cross-site' || (origin && origin !== requestOrigin(request))) {
    throw new AppError(403, 'INVALID_ORIGIN', 'Cross-site requests are not allowed.')
  }
}

export async function readJSON<T extends z.ZodTypeAny>(request: Request, schema: T, maxBytes = 1000000): Promise<z.infer<T>> {
  assertSameOrigin(request)
  if (Number(request.headers.get('content-length') || 0) > maxBytes) throw new AppError(413, 'PAYLOAD_TOO_LARGE', 'Request is too large.')
  if (!request.body) throw new AppError(400, 'INVALID_JSON', 'A JSON body is required.')
  const reader = request.body.getReader()
  const chunks: Uint8Array[] = []
  let size = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    size += value.byteLength
    if (size > maxBytes) {
      await reader.cancel()
      throw new AppError(413, 'PAYLOAD_TOO_LARGE', 'Request is too large.')
    }
    chunks.push(value)
  }
  try {
    return schema.parse(JSON.parse(Buffer.concat(chunks).toString('utf8')))
  } catch (error) {
    if (error instanceof z.ZodError) throw error
    throw new AppError(400, 'INVALID_JSON', 'Invalid JSON body.')
  }
}

export function apiError(error: unknown) {
  if (error instanceof z.ZodError) return NextResponse.json({ error: `Invalid request data: ${error.issues.slice(0,3).map(issue => `${issue.path.join('.') || 'body'}: ${issue.message}`).join('; ')}`, code: 'VALIDATION_ERROR', issues: error.issues.map(issue => ({ path: issue.path.join('.'), message: issue.message })) }, { status: 400 })
  if (error instanceof AppError) return NextResponse.json({ error: error.message, message: error.message, code: error.code }, { status: error.status })
  // Never log request content, database errors, or upstream provider bodies.
  console.error('[API] Request failed', error instanceof Error ? error.name : 'UnknownError')
  return NextResponse.json({ error: 'The operation failed. Please retry.', code: 'INTERNAL_ERROR' }, { status: 500 })
}
