import { test, expect } from '@playwright/test'
import { loginUser, createCV } from './utils'

test('dashboard shows persisted CV and server enforces the Free limit',async ({ page }) => {
  await loginUser(page)
  const cv = await createCV(page.request)
  await page.reload()
  await expect(page.getByRole('heading',{ name:'Test CV' })).toBeVisible()
  const creations = await Promise.all([page.request.post('/api/cvs',{ data:{} }),page.request.post(`/api/cvs/${cv.id}/duplicate`,{ data:{} })])
  expect(creations.map(result => result.status())).toEqual([403,403])
  await page.goto('/cv/new')
  await expect(page.getByText(/Free plan limit reached/i).first()).toBeVisible()
  await expect(page.getByRole('link',{ name:'Contact Us to Upgrade to Pro' })).toBeVisible()
})
