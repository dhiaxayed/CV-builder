import assert from 'node:assert/strict'
import test from 'node:test'
import { verifyDatabaseReadiness } from '../../scripts/lib/database-readiness'
import { serverDatabaseKey } from '../../lib/db/config'

const env = { SUPABASE_URL: 'https://database.example', SUPABASE_SERVICE_ROLE_KEY: 'server-test-key' }
const functions = ['consume_magic_token', 'create_cv_atomic', 'save_cv_draft', 'snapshot_cv', 'restore_cv', 'publish_cv', 'take_rate_limit', 'save_photo']

test('deployment readiness reads zero rows and metadata without invoking database mutations', async () => {
  const paths: Record<string, object> = Object.fromEntries(functions.map(name => [`/rpc/${name}`, {}]))
  const calls: string[] = []
  const request: typeof fetch = async (input, init) => {
    const url = new URL(String(input))
    calls.push(url.pathname)
    assert.equal(init?.method || 'GET', 'GET')
    assert.equal(init?.redirect, 'error')
    const headers = new Headers(init?.headers)
    assert.equal(headers.get('apikey'), env.SUPABASE_SERVICE_ROLE_KEY)
    assert.equal(headers.get('authorization'), `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`)
    if (url.pathname === '/rest/v1/') return Response.json({ paths })
    assert.equal(url.searchParams.get('limit'), '0')
    assert.ok(url.searchParams.get('select'))
    return Response.json([])
  }
  await verifyDatabaseReadiness(env, request)
  assert.equal(calls.length, 6)
  assert.ok(calls.every(path => !path.includes('/rpc/')))
})

test('deployment readiness refuses missing credentials, schema and RPCs', async () => {
  await assert.rejects(verifyDatabaseReadiness({}), /SUPABASE_URL.*SUPABASE_SECRET_KEY.*SUPABASE_SERVICE_ROLE_KEY/)
  await assert.rejects(verifyDatabaseReadiness({ SUPABASE_URL: env.SUPABASE_URL }), error => {
    assert.ok(error instanceof Error)
    assert.match(error.message, /Missing deployment configuration: SUPABASE_SECRET_KEY.*SUPABASE_SERVICE_ROLE_KEY.*NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY/)
    return true
  })
  await assert.rejects(verifyDatabaseReadiness({ SUPABASE_SERVICE_ROLE_KEY: 'server-test-key' }), /Missing deployment configuration: SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL\./)
  await assert.rejects(verifyDatabaseReadiness(env, async () => Response.json({}, { status: 400 })), /Required database schema.*configuration and permissions/)
  await assert.rejects(verifyDatabaseReadiness(env, async () => Response.json({ paths: {} })), /Required database functions.*save_photo/)
})

test('database key resolution restores the original public fallback after optional server credentials', () => {
  assert.equal(serverDatabaseKey({ SUPABASE_SECRET_KEY: ' modern ', SUPABASE_SERVICE_ROLE_KEY: 'legacy' }), 'modern')
  assert.equal(serverDatabaseKey({ SUPABASE_SECRET_KEY: ' ', SUPABASE_SERVICE_ROLE_KEY: ' legacy ' }), 'legacy')
  assert.equal(serverDatabaseKey({ NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY: 'public', NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon' }), 'public')
  assert.equal(serverDatabaseKey({ NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon' }), 'anon')
  assert.equal(serverDatabaseKey({ SUPABASE_SERVICE_ROLE_KEY: 'service', NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY: 'public' }), 'service')
})

test('read-only readiness accepts the original schema and publishable key without newer RPCs', async () => {
  const originalEnv = { NEXT_PUBLIC_SUPABASE_URL: env.SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY: 'sb_publishable_test-only' }
  let requests = 0
  const result = await verifyDatabaseReadiness(originalEnv, async (input, init) => {
    const url = new URL(String(input))
    const headers = new Headers(init?.headers)
    assert.equal(headers.get('apikey'), originalEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY)
    assert.equal(headers.has('authorization'), false)
    assert.equal(url.searchParams.get('limit'), '0')
    assert.notEqual(url.pathname, '/rest/v1/')
    requests++
    return url.searchParams.get('select')?.includes('draft_data')
      ? Response.json({ code: '42703' }, { status: 400 }) : Response.json([])
  })
  assert.equal(result.schema, 'legacy')
  assert.equal(requests, 4)
})

test('deployment readiness accepts modern secret keys through apikey without treating them as JWTs', async () => {
  const modernEnv = { NEXT_PUBLIC_SUPABASE_URL: env.SUPABASE_URL, SUPABASE_SECRET_KEY: 'sb_secret_test-only' }
  const request: typeof fetch = async (input, init) => {
    const headers = new Headers(init?.headers)
    assert.equal(headers.get('apikey'), modernEnv.SUPABASE_SECRET_KEY)
    assert.equal(headers.has('authorization'), false)
    const url = new URL(String(input))
    return Response.json(url.pathname === '/rest/v1/' ? { paths: Object.fromEntries(functions.map(name => [`/rpc/${name}`, {}])) } : [])
  }
  await verifyDatabaseReadiness(modernEnv, request)
})

test('deployment readiness does not expose upstream credentials or error details', async () => {
  await assert.rejects(verifyDatabaseReadiness(env, async () => { throw new Error('secret-upstream-details') }), error => {
    assert.ok(error instanceof Error)
    assert.match(error.message, /could not be verified/)
    assert.ok(!error.message.includes('secret-upstream-details'))
    return true
  })
})
