import assert from 'node:assert/strict'
import test from 'node:test'
import { verifyDatabaseReadiness } from '../../scripts/lib/database-readiness'

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
  await assert.rejects(verifyDatabaseReadiness({}), /server-only SUPABASE_SERVICE_ROLE_KEY/)
  await assert.rejects(verifyDatabaseReadiness(env, async () => Response.json({}, { status: 400 })), /Required database schema.*migrations 003\/004/)
  await assert.rejects(verifyDatabaseReadiness(env, async () => Response.json({ paths: {} })), /Required database functions.*save_photo/)
})

test('deployment readiness does not expose upstream credentials or error details', async () => {
  await assert.rejects(verifyDatabaseReadiness(env, async () => { throw new Error('secret-upstream-details') }), error => {
    assert.ok(error instanceof Error)
    assert.match(error.message, /could not be verified/)
    assert.ok(!error.message.includes('secret-upstream-details'))
    return true
  })
})
