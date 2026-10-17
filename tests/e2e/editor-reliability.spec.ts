import { test, expect } from '@playwright/test'
import { loginUser, createCV } from './utils'
import { renderFixture } from '../fixtures/render'

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
