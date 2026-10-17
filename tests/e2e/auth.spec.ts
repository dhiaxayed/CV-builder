import { test, expect } from '@playwright/test'
import { loginUser } from './utils'

test('anonymous and invalid-cookie access redirects predictably',async ({ page,request }) => {
  await page.goto('/cv/new?template=elegant')
  await expect(page).toHaveURL(/auth\/signin\?redirect=/)
  const result = await request.get('/api/cvs')
  expect(result.status()).toBe(401)
  expect((await request.post('/api/auth/send-magic-link',{ headers:{ Origin:'https://attacker.invalid' },data:{ email:'x@example.invalid' } })).status()).toBe(403)
})
test('real magic-link sign-in, expiry and sign-out invalidate protected operations',async ({ page }) => {
  const email = await loginUser(page)
  expect((await page.request.get('/api/cvs')).status()).toBe(200)
  await page.request.post('http://127.0.0.1:3002/__test/expire',{ data:{ email } })
  expect((await page.request.get('/api/cvs')).status()).toBe(401)
  await page.goto('/dashboard')
  await expect(page).toHaveURL(/auth\/signin/)
  await loginUser(page)
  expect((await page.request.delete('/api/auth/session')).status()).toBe(200)
  expect((await page.request.get('/api/cvs')).status()).toBe(401)
})
test('touch-sized gallery has visible template controls and a genuine Pro email CTA',async ({ page }) => {
  await page.setViewportSize({ width:390,height:844 })
  await page.goto('/')
  const useTemplate = page.getByRole('button',{ name:'Use Template: Elegant',exact:true })
  await useTemplate.scrollIntoViewIfNeeded()
  await expect(useTemplate).toBeVisible()
  const upgrade = page.getByRole('link',{ name:'Contact Us to Upgrade to Pro',exact:true })
  await expect(upgrade).toHaveAttribute('href',/^mailto:dhiaayed03@gmail.com\?subject=/)
  await expect(page.getByText('Online payment integration coming soon.')).toBeVisible()
  await useTemplate.click()
  await expect(page).toHaveURL(/template%3Delegant/)
  await page.screenshot({ path:'test-results/mobile-signin.png',fullPage:true })
})
