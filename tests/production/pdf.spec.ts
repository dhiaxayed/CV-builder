import { test,expect,request as contexts } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import { createHash,randomBytes } from 'node:crypto'
import { PDFParse } from 'pdf-parse'
import { renderFixture } from '../fixtures/render'

test('production build: secure magic-link cookie, authenticated native PDF/source, public PDF and revocation',async ({ request }) => {
  test.setTimeout(180000)
  const db=createClient('http://127.0.0.1:3002','isolated-test-service-key',{ auth:{ persistSession:false,autoRefreshToken:false } })
  const nonce=randomBytes(24).toString('base64url')
  const seeded=await db.from('auth_tokens').insert({ email:`production-${nonce.slice(0,12)}@example.invalid`,type:'magic_link',token:createHash('sha256').update(nonce).digest('hex'),expires_at:new Date(Date.now()+600000).toISOString() })
  expect(seeded.error).toBeNull()
  const verify=await request.get(`/api/auth/verify?token=${nonce}`,{ maxRedirects:0 })
  expect(verify.status()).toBe(307)
  expect(verify.headers().location).toMatch(/\/dashboard$/)
  const cookie=verify.headers()['set-cookie']
  expect(cookie).toMatch(/HttpOnly/i); expect(cookie).toMatch(/Secure/i); expect(cookie).toMatch(/SameSite=lax/i)
  const session=cookie.match(/session=([^;]+)/)?.[1]
  expect(session).toBeTruthy()
  const owner=await contexts.newContext({ baseURL:'http://127.0.0.1:3001',extraHTTPHeaders:{ Cookie:`session=${session}` } })
  try {
    const created=await owner.post('/api/cvs',{ data:{ title:'Production smoke',templateId:'elegant',initialData:renderFixture() } })
    expect(created.status()).toBe(201)
    const cv=(await created.json()).cv
    const exported=await owner.post('/api/pdf',{ data:{ cvId:cv.id,expectedRevision:0 } })
    expect(exported.status()).toBe(200)
    expect(exported.headers()['content-type']).toContain('application/pdf')
    const parser=new PDFParse({ data:new Uint8Array(await exported.body()) })
    try {
      expect((await parser.getInfo()).total).toBe(1)
      expect((await parser.getText()).text).toContain('Community')
    } finally { await parser.destroy() }
    const source=await owner.post('/api/pdf',{ data:{ cvId:cv.id,expectedRevision:0,format:'latex' } })
    expect(source.status()).toBe(200)
    expect(await source.text()).toContain(`density=${exported.headers()['x-cv-pdf-density']}`)
    const publish=await owner.post(`/api/cvs/${cv.id}/share`,{ data:{ isPublic:true } })
    expect(publish.status()).toBe(200)
    const token=(await publish.json()).shareToken
    const anonymous=await contexts.newContext({ baseURL:'http://127.0.0.1:3001' })
    try {
      expect((await anonymous.get(`/api/share/${token}/pdf`)).status()).toBe(200)
      expect((await owner.post(`/api/cvs/${cv.id}/share`,{ data:{ isPublic:false } })).status()).toBe(200)
      expect((await anonymous.get(`/api/share/${token}/pdf`)).status()).toBe(404)
    } finally { await anonymous.dispose() }
  } finally { await owner.dispose() }
})
