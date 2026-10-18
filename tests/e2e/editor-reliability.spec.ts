import { test, expect } from '@playwright/test'
import { loginUser, createCV } from './utils'
import { renderFixture } from '../fixtures/render'
import { PDFDocument } from 'pdf-lib'
import sharp from 'sharp'

test('edits and template changes made during a delayed save persist in order',async ({ page }) => {
  await loginUser(page)
  const cv=await createCV(page.request,renderFixture())
  await page.goto(`/cv/${cv.id}/edit`)
  let release!: () => void
  let started!: () => void
  const waiting=new Promise<void>(resolve => { release=resolve })
  const firstStarted=new Promise<void>(resolve => { started=resolve })
  let intercepted=false
  await page.route(`**/api/cvs/${cv.id}`,async route => {
    if (route.request().method()==='PUT' && !intercepted) { intercepted=true; started(); await waiting }
    await route.continue()
  })
  const summary=page.getByLabel('Professional Summary',{ exact:true })
  await summary.fill('First edit in flight')
  await firstStarted
  await summary.fill('Newer edit made while the first save was in flight')
  await page.getByRole('combobox',{ name:'CV template' }).click()
  await page.getByRole('option').filter({ has:page.getByText('Tech',{ exact:true }) }).click()
  release()
  await expect(page.getByRole('status').filter({ hasText:'All changes saved' })).toBeVisible()
  const stored=(await (await page.request.get(`/api/cvs/${cv.id}`)).json()).cv
  expect(stored.data.summary).toBe('Newer edit made while the first save was in flight')
  expect(stored.template_id).toBe('tech')
  expect(stored.revision).toBeGreaterThanOrEqual(2)
  await page.reload()
  await expect(summary).toHaveValue(stored.data.summary)
})

test('failed autosave retains local content and an explicit retry persists it',async ({ page }) => {
  await loginUser(page)
  const cv=await createCV(page.request,renderFixture())
  await page.goto(`/cv/${cv.id}/edit`)
  await page.route(`**/api/cvs/${cv.id}`,async route => {
    if (route.request().method()==='PUT') await route.abort('internetdisconnected')
    else await route.continue()
  })
  const summary=page.getByLabel('Professional Summary',{ exact:true })
  await summary.fill('Local content retained while the network is unavailable')
  await expect(page.getByRole('status').filter({ hasText:/Save failed/ })).toBeVisible()
  await expect(summary).toHaveValue('Local content retained while the network is unavailable')
  await page.unroute(`**/api/cvs/${cv.id}`)
  await page.getByRole('button',{ name:'Save',exact:true }).click()
  await expect(page.getByRole('status').filter({ hasText:'All changes saved' })).toBeVisible()
  expect((await (await page.request.get(`/api/cvs/${cv.id}`)).json()).cv.data.summary).toBe('Local content retained while the network is unavailable')
})

test('gallery template survives real sign-in and wizard; mobile editor panels remain reachable',async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button',{ name:'Use Template: Elegant',exact:true }).click()
  await page.getByLabel(/Email address/i).fill(`wizard-${Date.now()}@example.invalid`)
  await page.getByRole('button',{ name:/Send Magic Link/i }).click()
  await page.getByRole('link',{ name:'Open development sign-in link' }).click()
  await expect(page).toHaveURL(/\/cv\/new\?template=elegant/)
  await page.getByRole('button',{ name:'Continue',exact:true }).click()
  await expect(page.locator('#elegant')).toBeChecked()
  await page.getByRole('button',{ name:'Continue',exact:true }).click()
  await page.getByLabel('CV Title').fill('Wizard CV')
  await page.getByRole('button',{ name:'Create CV',exact:true }).click()
  await expect(page).toHaveURL(/\/cv\/[^/]+\/edit/)
  await expect(page.getByRole('combobox',{ name:'CV template' })).toContainText('Elegant')
  await page.setViewportSize({ width:390,height:844 })
  await page.getByRole('button',{ name:'Preview & AI',exact:true }).click()
  await page.getByRole('tab',{ name:'AI Assist',exact:true }).click()
  await expect(page.getByRole('heading',{ name:'AI Career Assistant' })).toBeVisible()
  await expect(page.getByRole('link',{ name:'Contact Us to Upgrade to Pro' })).toBeVisible()
  await page.screenshot({ path:'test-results/mobile-editor-ai.png',fullPage:true })
  await page.getByRole('button',{ name:'Edit CV',exact:true }).click()
  await expect(page.getByLabel('Full Name')).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
})

test('preview keeps its last PDF, serializes compilation and ignores stale errors',async ({ page }) => {
  await loginUser(page)
  const cv=await createCV(page.request,renderFixture())
  const document=await PDFDocument.create(); document.addPage()
  const pdf=Buffer.from(await document.save())
  const calls:Array<{ cvData:{ summary:string }; templateId:string; pageMode:string }>=[]
  let release!:() => void
  const blocked=new Promise<void>(resolve => { release=resolve })
  await page.route('**/api/pdf',async route => {
    const input=route.request().postDataJSON()
    calls.push(input)
    if (calls.length===2) {
      await blocked
      await route.fulfill({ status:422,json:{ code:'PDF_OVERFLOW',error:'Obsolete overflow' } })
    } else await route.fulfill({ status:200,contentType:'application/pdf',body:pdf,headers:{ 'X-CV-PDF-Pages':'1','X-CV-PDF-Density':'normal' } })
  })
  await page.goto(`/cv/${cv.id}/edit`)
  const frame=page.getByTitle('Compiled LaTeX PDF preview')
  await expect(frame).toBeVisible()
  const original=await frame.getAttribute('src')
  const summary=page.getByLabel('Professional Summary',{ exact:true })
  await summary.fill('Slow intermediate compilation')
  await expect.poll(() => calls.length).toBe(2)
  await summary.fill('Discard this pending edit')
  await expect(page.getByRole('status').filter({ hasText:'All changes saved' })).toBeVisible()
  await summary.fill('Newest draft to compile')
  await page.getByRole('combobox',{ name:'CV template' }).click()
  await page.getByRole('option').filter({ has:page.getByText('Tech',{ exact:true }) }).click()
  await page.getByRole('combobox',{ name:'PDF page mode' }).click()
  await page.getByRole('option',{ name:'Multiple pages',exact:true }).click()
  await expect(page.getByRole('status').filter({ hasText:'All changes saved' })).toBeVisible()
  expect(calls).toHaveLength(2)
  await expect(frame).toHaveAttribute('src',original!)
  await expect(page.getByText(/Previous preview/)).toBeVisible()
  await page.screenshot({ path:'test-results/editing-during-compilation.png',fullPage:true })
  release()
  await expect.poll(() => calls.length).toBe(3)
  await expect(frame).not.toHaveAttribute('src',original!)
  expect(calls[2].cvData.summary).toBe('Newest draft to compile')
  expect(calls[2].templateId).toBe('tech'); expect(calls[2].pageMode).toBe('multi-page')
  await expect(page.getByText('Obsolete overflow')).toHaveCount(0)
  await page.getByLabel('CV title').fill('Renamed without recompiling')
  await expect(page.getByRole('status').filter({ hasText:'All changes saved' })).toBeVisible()
  expect(calls).toHaveLength(3)
})

test('photo upload preserves simultaneous manual edits and photo placement persists',async ({ page }) => {
  await loginUser(page)
  const cv=await createCV(page.request,renderFixture())
  await page.goto(`/cv/${cv.id}/edit`)
  let release!:() => void
  const blocked=new Promise<void>(resolve => { release=resolve })
  let started=false
  await page.route('**/api/upload/photo',async route => { started=true; await blocked; await route.continue() })
  const photo=await sharp({ create:{ width:120,height:240,channels:3,background:'#345678' } }).png().toBuffer()
  await page.locator('input[type="file"]').setInputFiles({ name:'portrait.png',mimeType:'image/png',buffer:photo })
  await expect.poll(() => started).toBe(true)
  await page.getByLabel('Full Name').fill('Name typed during upload')
  await page.getByLabel('Professional Summary',{ exact:true }).fill('Summary typed during upload')
  release()
  await expect(page.getByText('Photo uploaded successfully!').first()).toBeVisible()
  await page.getByRole('button',{ name:'Style',exact:true }).click()
  await page.getByRole('combobox',{ name:'Photo position',exact:true }).click()
  await page.getByRole('option',{ name:'Left',exact:true }).click()
  await page.getByRole('button',{ name:'Close',exact:true }).click()
  await expect(page.getByRole('status').filter({ hasText:'All changes saved' })).toBeVisible()
  await page.reload()
  await expect(page.getByLabel('Full Name')).toHaveValue('Name typed during upload')
  await expect(page.getByLabel('Professional Summary',{ exact:true })).toHaveValue('Summary typed during upload')
  const stored=(await (await page.request.get(`/api/cvs/${cv.id}`)).json()).cv
  expect(stored.data.basics.photoUrl).toMatch(/^\/api\/photos\//)
  expect(stored.data.appearance.photoPosition).toBe('left')
})

test('typing during PDF export stays local until the exported revision is read',async ({ page }) => {
  test.setTimeout(180000)
  await loginUser(page)
  const cv=await createCV(page.request,renderFixture())
  await page.goto(`/cv/${cv.id}/edit`)
  await page.getByRole('tab',{ name:'ATS Check',exact:true }).click()
  const summary=page.getByLabel('Professional Summary',{ exact:true })
  await summary.fill('Snapshot selected for export')
  let release!:() => void
  const blocked=new Promise<void>(resolve => { release=resolve })
  let started=false
  await page.route('**/api/pdf',async route => {
    if (route.request().postDataJSON().intent!=='preview') { started=true; await blocked }
    await route.continue()
  })
  const pending=page.waitForEvent('download')
  await page.getByRole('button',{ name:'PDF',exact:true }).click()
  await expect.poll(() => started).toBe(true)
  await summary.fill('Newer draft typed while exporting')
  await expect(summary).toHaveValue('Newer draft typed while exporting')
  expect((await (await page.request.get(`/api/cvs/${cv.id}`)).json()).cv.data.summary).toBe('Snapshot selected for export')
  release()
  expect((await pending).suggestedFilename()).toMatch(/\.pdf$/)
  await expect(page.getByRole('status').filter({ hasText:'All changes saved' })).toBeVisible()
  expect((await (await page.request.get(`/api/cvs/${cv.id}`)).json()).cv.data.summary).toBe('Newer draft typed while exporting')
})

test('an AI answer arriving after manual editing cannot replace the newer summary',async ({ page }) => {
  await loginUser(page,true)
  const data=renderFixture()
  data.summary='Successfully built services in order to improve reliability by 40%.'
  const cv=await createCV(page.request,data)
  await page.goto(`/cv/${cv.id}/edit`)
  await page.getByRole('tab',{ name:'AI Assist',exact:true }).click()
  let release!:() => void
  const blocked=new Promise<void>(resolve => { release=resolve })
  let started=false
  await page.route('**/api/ai/condense',async route => {
    const response=await route.fetch()
    started=true; await blocked; await route.fulfill({ response })
  })
  await page.getByRole('button',{ name:'Suggest shorter content',exact:true }).click()
  await expect.poll(() => started).toBe(true)
  await page.getByLabel('Professional Summary',{ exact:true }).fill('My newer manually written summary')
  release()
  await expect(page.getByRole('button',{ name:'Apply shorter summary',exact:true })).toBeDisabled()
  await expect(page.getByText(/Your CV changed since these suggestions/)).toBeVisible()
  await expect(page.getByLabel('Professional Summary',{ exact:true })).toHaveValue('My newer manually written summary')
})

test('entry ordering works with keyboard controls, persists and reaches the compiled source',async ({ page }) => {
  test.setTimeout(180000)
  await loginUser(page)
  const data=renderFixture()
  data.education.push({ ...data.education[0],id:'school-b',institution:'Institute B' })
  data.projects.push({ ...data.projects[0],id:'project-b',name:'Project B' })
  const cv=await createCV(page.request,data)
  await page.goto(`/cv/${cv.id}/edit`)
  await page.getByRole('tab',{ name:'ATS Check',exact:true }).click()
  await expect(page.getByRole('button',{ name:'Move experience 1 up',exact:true })).toBeDisabled()
  await page.getByRole('button',{ name:'Move experience 2 up',exact:true }).click()
  await page.getByRole('button',{ name:'Move education 2 up',exact:true }).click()
  await page.getByRole('button',{ name:'Move project 2 up',exact:true }).click()
  const toggle=page.getByRole('button',{ name:/Toggle experience 1:/ })
  await toggle.focus(); await page.keyboard.press('Space')
  await expect(toggle).toHaveAttribute('aria-expanded','false')
  await page.keyboard.press('Enter')
  await expect(toggle).toHaveAttribute('aria-expanded','true')
  await expect(page.getByRole('status').filter({ hasText:'All changes saved' })).toBeVisible()
  const saved=(await (await page.request.get(`/api/cvs/${cv.id}`)).json()).cv
  expect(saved.data.experience.map((item:{id:string}) => item.id)).toEqual([...data.experience].reverse().map(item => item.id))
  expect(saved.data.education[0].institution).toBe('Institute B')
  expect(saved.data.projects[0].name).toBe('Project B')
  const response=await page.request.post('/api/pdf',{ data:{ cvId:cv.id,expectedRevision:saved.revision,format:'latex',pageMode:'multi-page' } })
  expect(response.status(),await response.text()).toBe(200)
  const source=await response.text()
  expect(source.indexOf('StartupXYZ')).toBeLessThan(source.indexOf('TechCorp'))
  expect(source.indexOf('Institute B')).toBeLessThan(source.indexOf('University of California'))
  expect(source.indexOf('Project B')).toBeLessThan(source.indexOf('OpenSource Analytics'))
  await page.reload()
  await expect(page.getByLabel('Company',{ exact:true }).first()).toHaveValue('StartupXYZ')
})
