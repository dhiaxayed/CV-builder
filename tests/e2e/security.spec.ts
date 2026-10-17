import { test, expect, request as requests, type APIRequestContext } from '@playwright/test'
import { createCV } from './utils'
import { renderFixture } from '../fixtures/render'
import sharp from 'sharp'
import { MAX_PHOTO_BYTES } from '../../lib/photos'

async function signedIn(): Promise<APIRequestContext> {
  const context = await requests.newContext({ baseURL:'http://127.0.0.1:3001' })
  const email=`api-${Date.now()}-${Math.random().toString(36).slice(2)}@example.invalid`
  const result=await context.post('/api/auth/send-magic-link',{ data:{ email } })
  expect(result.status()).toBe(200)
  await context.get((await result.json()).devLink)
  return context
}

test('ownership is enforced for read, save, delete, duplicate, history, sharing, export and upload',async () => {
  const a=await signedIn(); const b=await signedIn()
  try {
    const cv=await createCV(a,renderFixture())
    const responses=await Promise.all([
      b.get(`/api/cvs/${cv.id}`),
      b.put(`/api/cvs/${cv.id}`,{ data:{ expectedRevision:0,data:renderFixture() } }),
      b.delete(`/api/cvs/${cv.id}`),
      b.post(`/api/cvs/${cv.id}/duplicate`,{ data:{} }),
      b.get(`/api/cvs/${cv.id}/versions`),
      b.post(`/api/cvs/${cv.id}/versions`,{ data:{ expectedRevision:0 } }),
      b.put(`/api/cvs/${cv.id}/versions`,{ data:{ expectedRevision:0,versionId:cv.current_version_id } }),
      b.post(`/api/cvs/${cv.id}/share`,{ data:{ isPublic:true } }),
      b.post('/api/pdf',{ data:{ cvId:cv.id,expectedRevision:0,format:'json' } }),
      b.post('/api/upload/photo',{ multipart:{ target:'cv',cvId:cv.id,expectedRevision:'0',photo:{ name:'invalid.png',mimeType:'image/png',buffer:Buffer.from('not an image') } } }),
    ])
    expect(responses.map(response => response.status())).toEqual(Array(10).fill(404))
    expect((await a.get(`/api/cvs/${cv.id}`)).status()).toBe(200)
  } finally { await a.dispose(); await b.dispose() }
})

test('published DTO excludes draft metadata, remains frozen, and revoked links fail even after PDF caching',async ({ request }) => {
  test.setTimeout(120000)
  const owner=await signedIn()
  try {
    const cv=await createCV(owner,renderFixture())
    const publish=await owner.post(`/api/cvs/${cv.id}/share`,{ data:{ isPublic:true } })
    expect(publish.status()).toBe(200)
    const { shareToken }=await publish.json()
    expect(shareToken).toHaveLength(32)
    const publicResult=await request.get(`/api/share/${shareToken}`)
    expect(publicResult.status()).toBe(200)
    const shared=(await publicResult.json()).cv
    expect(Object.keys(shared).sort()).toEqual(['data','template_id','title'])
    const update=await owner.put(`/api/cvs/${cv.id}`,{ data:{ expectedRevision:0,data:{ ...renderFixture(),summary:'PRIVATE DRAFT' } } })
    expect(update.status()).toBe(200)
    expect((await (await request.get(`/api/share/${shareToken}`)).json()).cv.data.summary).toBe(renderFixture().summary)
    expect((await request.get(`/api/share/${shareToken}/pdf`)).status()).toBe(200)
    expect((await owner.post(`/api/cvs/${cv.id}/share`,{ data:{ isPublic:false } })).status()).toBe(200)
    expect((await request.get(`/api/share/${shareToken}`)).status()).toBe(404)
    expect((await request.get(`/api/share/${shareToken}/pdf`)).status()).toBe(404)
    const reactivated=await owner.post(`/api/cvs/${cv.id}/share`,{ data:{ isPublic:true } })
    expect((await reactivated.json()).shareToken).not.toBe(shareToken)
  } finally { await owner.dispose() }
})

test('concurrent Free creations, stale saves, token replay, payload validation and Pro boundaries',async ({ request }) => {
  const owner=await signedIn()
  try {
    const created=await Promise.all([owner.post('/api/cvs',{ data:{} }),owner.post('/api/cvs',{ data:{} })])
    expect(created.map(response=>response.status()).sort()).toEqual([201,403])
    const cv=(await created.find(response=>response.status()===201)!.json()).cv
    const saves=await Promise.all([owner.put(`/api/cvs/${cv.id}`,{ data:{ expectedRevision:0,title:'First' } }),owner.put(`/api/cvs/${cv.id}`,{ data:{ expectedRevision:0,title:'Second' } })])
    expect(saves.map(response=>response.status()).sort()).toEqual([200,409])
    expect((await owner.post('/api/ai/tailor',{ data:{ cvId:cv.id,cvData:renderFixture(),jobDescription:'We need a JavaScript developer.' } })).status()).toBe(403)
    expect((await owner.put(`/api/cvs/${cv.id}`,{ data:{ data:{ experience:'malformed' },expectedRevision:1 } })).status()).toBe(400)
    expect((await owner.post('/api/upload/photo',{ multipart:{ target:'invalid' } })).status()).toBe(400)
    const link=await request.post('/api/auth/send-magic-link',{ data:{ email:`race-${Date.now()}@example.invalid` } })
    expect(link.status()).toBe(200)
    const { devLink }=await link.json()
    const verify=await Promise.all([request.get(devLink,{ maxRedirects:0 }),request.get(devLink,{ maxRedirects:0 })])
    expect(verify.filter(response=>Boolean(response.headers()['set-cookie']))).toHaveLength(1)
  } finally { await owner.dispose() }
})

test('photo upload rejects malformed forms, signatures, MIME mismatches and oversized payloads without changing the draft',async () => {
  const owner=await signedIn()
  try {
    const cv=await createCV(owner,renderFixture())
    const png=await sharp({ create:{ width:64,height:64,channels:3,background:'#345678' } }).png().toBuffer()
    const oversized=await sharp({ create:{ width:5000,height:4000,channels:3,background:'#345678' } }).png().toBuffer()
    for (const [mimeType,buffer,status] of [
      ['image/png',Buffer.from('<svg>not a photo</svg>'),400],
      ['image/jpeg',png,400],
      ['image/png',oversized,400],
      ['image/png',Buffer.alloc(MAX_PHOTO_BYTES+1),413],
    ] as const) {
      const response=await owner.post('/api/upload/photo',{ multipart:{ target:'cv',cvId:cv.id,expectedRevision:'0',photo:{ name:'photo.png',mimeType,buffer } } })
      expect(response.status()).toBe(status)
    }
    const malformed=await owner.post('/api/upload/photo',{ headers:{ 'Content-Type':'application/json' },data:'not multipart' })
    expect(malformed.status()).toBe(400)
    const persisted=(await (await owner.get(`/api/cvs/${cv.id}`)).json()).cv
    expect(persisted.revision).toBe(0); expect(persisted.data.basics.photoUrl).toBeUndefined()
  } finally { await owner.dispose() }
})

test('photo access follows ownership and the currently published snapshot, including revocation',async ({ request }) => {
  const owner=await signedIn(); const stranger=await signedIn()
  try {
    const cv=await createCV(owner,renderFixture())
    const png=await sharp({ create:{ width:128,height:128,channels:3,background:'#345678' } }).png().toBuffer()
    const upload=await owner.post('/api/upload/photo',{ multipart:{ target:'cv',cvId:cv.id,expectedRevision:'0',photo:{ name:'photo.png',mimeType:'image/png',buffer:png } } })
    expect(upload.status()).toBe(200)
    const persisted=(await (await owner.get(`/api/cvs/${cv.id}`)).json()).cv
    const url=persisted.data.basics.photoUrl
    expect((await owner.get(url)).status()).toBe(200)
    expect((await stranger.get(url)).status()).toBe(404)
    expect((await request.get(url)).status()).toBe(404)
    expect((await owner.post(`/api/cvs/${cv.id}/share`,{ data:{ isPublic:true } })).status()).toBe(200)
    expect((await request.get(url)).status()).toBe(200)
    const data={ ...persisted.data,basics:{ ...persisted.data.basics,photoUrl:'' } }
    expect((await owner.put(`/api/cvs/${cv.id}`,{ data:{ data,expectedRevision:persisted.revision } })).status()).toBe(200)
    expect((await request.get(url)).status()).toBe(200)
    expect((await owner.post(`/api/cvs/${cv.id}/share`,{ data:{ isPublic:false } })).status()).toBe(200)
    expect((await request.get(url)).status()).toBe(404)
    expect((await owner.get(url)).status()).toBe(200)
  } finally { await owner.dispose(); await stranger.dispose() }
})
