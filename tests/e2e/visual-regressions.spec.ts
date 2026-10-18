import { test, expect } from '@playwright/test'
import { loginUser, createCV } from './utils'
import { renderFixture, overflowFixture } from '../fixtures/render'
import { TEMPLATE_IDS } from '../../lib/templates'

test('Geist loads, landing motion runs, and every template is selectable', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { level:1 })).toBeVisible()
  await page.evaluate(() => document.fonts.ready)
  expect(await page.evaluate(() => {
    const family = getComputedStyle(document.body).fontFamily.split(',')[0].replaceAll('"', '').trim()
    return [...document.fonts].some(font => font.family.replaceAll('"','') === family && font.status === 'loaded')
  })).toBe(true)
  const sheet = page.locator('.showcase-sheet-center')
  const before = await sheet.evaluate(element => getComputedStyle(element).transform)
  await expect.poll(() => sheet.evaluate(element => getComputedStyle(element).transform)).not.toBe(before)
  await page.getByRole('button', { name:'Next featured template',exact:true }).click()
  await expect(sheet.locator('img')).toHaveAttribute('alt','Creative CV layout')
  await page.getByRole('button', { name:'Pause template animation',exact:true }).click()
  await expect(sheet).toHaveCSS('animation-play-state','paused')
  await expect(sheet).toHaveCSS('opacity','1')
  expect(await page.getByRole('button', { name:/^Use Template:/ }).count()).toBe(TEMPLATE_IDS.length)
  await page.getByRole('button', { name:'Creative',exact:true }).click()
  await expect(page.getByRole('button', { name:'Use Template: Architect',exact:true })).toBeVisible()
  await expect(page.getByRole('button', { name:'Use Template: Classic',exact:true })).toHaveCount(0)
  await page.getByRole('button', { name:'Preview template: Architect',exact:true }).click()
  await expect(page.getByRole('dialog').getByAltText('Architect full page CV preview')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await page.emulateMedia({ reducedMotion:'reduce' })
  await expect(sheet).toHaveCSS('animation-name','none')
  await page.screenshot({ path:'test-results/landing-restored.png',fullPage:true })
})

test('the studio scrolls to its last editable section at desktop and mobile sizes', async ({ page }) => {
  await loginUser(page)
  const cv = await createCV(page.request,renderFixture(),'architect')
  await page.goto(`/cv/${cv.id}/edit`)
  const form = page.getByRole('region', { name:'CV form',exact:true })
  await expect(form.getByLabel('Full Name')).toBeVisible()
  for (const viewport of [{ width:1365,height:768 }, { width:390,height:844 }, { width:844,height:390 }]) {
    await page.setViewportSize(viewport)
    await form.hover()
    await page.mouse.wheel(0,20000)
    await expect.poll(() => form.evaluate(element => element.scrollTop)).toBeGreaterThan(0)
    await expect(form.getByLabel('Language',{ exact:true }).last()).toBeInViewport()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    expect(await form.evaluate(element => element.clientHeight)).toBeGreaterThan(50)
    await form.focus()
    await page.keyboard.press('Control+Home')
    await expect.poll(() => form.evaluate(element => element.scrollTop)).toBe(0)
  }
  await page.setViewportSize({ width:390,height:844 })
  await page.screenshot({ path:'test-results/studio-mobile-scroll.png',fullPage:true })
  await page.reload()
  await expect(page.getByRole('combobox',{ name:'CV template' })).toContainText('Architect')
})

test('a long CV offers multi-page recovery and then compiles without dropping content', async ({ page }) => {
  test.setTimeout(180000)
  await loginUser(page)
  const cv = await createCV(page.request,overflowFixture())
  await page.goto(`/cv/${cv.id}/edit`)
  await expect(page.getByRole('alert').filter({ hasText:'Your CV needs more space' })).toBeVisible({ timeout:120000 })
  const compiled = page.waitForResponse(response => response.url().endsWith('/api/pdf') && response.ok())
  await page.getByRole('button',{ name:'Allow multiple pages',exact:true }).click()
  const response = await compiled
  expect(Number(response.headers()['x-cv-pdf-pages'])).toBeGreaterThan(1)
  await expect(page.getByTitle('Compiled LaTeX PDF preview')).toBeVisible()
  const exported = page.waitForEvent('download')
  await page.getByRole('button',{ name:'PDF',exact:true }).click()
  expect((await exported).suggestedFilename()).toMatch(/\.pdf$/)
})
