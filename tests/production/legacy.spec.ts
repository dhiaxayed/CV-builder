import { test, expect, request as contexts } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import { randomBytes } from 'node:crypto'
import { renderFixture } from '../fixtures/render'

test.skip(process.env.E2E_DATABASE_KEY_TYPE !== 'public', 'Only the isolated original-schema fixture uses public credentials.')

test('existing plaintext sessions and CVs survive first save, frozen sharing, history and restore without migrations', async ({ request }) => {
  const db = createClient('http://127.0.0.1:3002', 'sb_publishable_isolated-test-key', { auth: { persistSession: false, autoRefreshToken: false } })
  const id = randomBytes(12).toString('hex'), cvId = `old-cv-${id}`, versionId = `old-version-${id}`
  const token = randomBytes(48).toString('base64url'), shareToken = randomBytes(24).toString('base64url')
  const initial = renderFixture()
  for (const operation of [
    () => db.from('users').insert({ id, email: `${id}@example.invalid`, plan_tier: 'pro' }),
    () => db.from('sessions').insert({ user_id: id, token, expires_at: new Date(Date.now() + 600000).toISOString() }),
    () => db.from('cvs').insert({ id: cvId, user_id: id, title: 'Existing CV', template_id: 'classic', is_public: true, share_token: shareToken }),
    () => db.from('cv_versions').insert({ id: versionId, cv_id: cvId, version: 1, data: initial, created_by: id }),
    () => db.from('cvs').update({ current_version_id: versionId }).eq('id', cvId),
  ]) expect((await operation()).error).toBeNull()
  const owner = await contexts.newContext({ baseURL: 'http://127.0.0.1:3001', extraHTTPHeaders: { Cookie: `session=${token}` } })
  try {
    const current = await owner.get(`/api/cvs/${cvId}`)
    expect(current.status()).toBe(200)
    expect((await current.json()).cv.revision).toBe(0)
    const saved = await owner.put(`/api/cvs/${cvId}`, { data: { expectedRevision: 0, data: { ...initial, summary: 'New private draft' }, templateId: 'tech' } })
    expect(saved.status()).toBe(200)
    expect((await saved.json()).revision).toBe(1)
    expect((await (await request.get(`/api/share/${shareToken}`)).json()).cv.data.summary).toBe(initial.summary)
    const snapshot = await owner.post(`/api/cvs/${cvId}/versions`, { data: { expectedRevision: 1, note: 'New snapshot' } })
    expect(snapshot.status()).toBe(201)
    const captured = await snapshot.json()
    expect(captured.version.version).toBe(2)
    const restored = await owner.put(`/api/cvs/${cvId}/versions`, { data: { expectedRevision: captured.revision, versionId } })
    expect(restored.status()).toBe(200)
    const restoredCV = (await restored.json()).cv
    expect(restoredCV.draft_data.summary).toBe(initial.summary)
    expect(restoredCV.template_id).toBe('classic')
    const history = (await (await owner.get(`/api/cvs/${cvId}/versions`)).json()).cv.versions
    expect(history).toHaveLength(2)
    expect(history.find((version: { version: number }) => version.version === 1).data.summary).toBe(initial.summary)
    expect(history.find((version: { version: number }) => version.version === 2).data.summary).toBe('New private draft')
    expect((await owner.delete('/api/auth/session')).status()).toBe(200)
    expect((await owner.get(`/api/cvs/${cvId}`)).status()).toBe(401)
  } finally { await owner.dispose() }
})
