import { Page, expect, APIRequestContext } from '@playwright/test'
import { createSampleCVData } from '../../lib/types/cv'

export async function loginUser(page: Page, pro = false) {
  const email = `test-${Date.now()}-${Math.random().toString(36).slice(2)}@example.invalid`
  await page.goto('/auth/signin')
  await page.getByLabel(/Email address/i).fill(email)
  const pending = page.waitForResponse(response => response.url().includes('/api/auth/send-magic-link'))
  await page.getByRole('button',{ name:/Send Magic Link/i }).click()
  const response = await pending
  expect(response.status()).toBe(200)
  const result = await response.json()
  expect(result.devLink).toBeTruthy()
  await page.goto(result.devLink)
  await expect(page).toHaveURL(/\/dashboard/)
  if (pro) { await page.request.post('http://127.0.0.1:3002/__test/pro',{ data:{ email } }); await page.reload() }
  return email
}
export async function createCV(request: APIRequestContext, data = createSampleCVData(), templateId = 'modern') {
  const response = await request.post('/api/cvs',{ data:{ title:'Test CV',templateId,initialData:data } })
  expect(response.status()).toBe(201)
  return (await response.json()).cv as { id:string; revision:number; current_version_id:string }
}
