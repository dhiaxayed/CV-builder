import { test,expect } from '@playwright/test'
import { loginUser,createCV } from '../e2e/utils'
import { renderFixture } from '../fixtures/render'
import { aiAtsReviewSchema,aiJobTailorSchema } from '../../lib/ai/types'
import { condensationSchema } from '../../lib/ai/condense'

test('real provider: authenticated review, condensation, apply/autosave/undo and Pro job tailoring',async ({ page }) => {
  test.setTimeout(180000)
  await loginUser(page,true)
  const data=renderFixture()
  data.summary='Successfully built reliable React applications in order to improve service performance by 40%.'
  const cv=await createCV(page.request,data)
  await page.goto(`/cv/${cv.id}/edit`)
  await page.getByRole('tab',{ name:'AI Assist',exact:true }).click()
  const reviewPending=page.waitForResponse(response => response.url().endsWith('/api/ai/review'),{ timeout:60000 })
  await page.getByRole('button',{ name:'Run AI ATS Review' }).click()
  const reviewResponse=await reviewPending
  expect(reviewResponse.status()).toBe(200)
  const review=await reviewResponse.json()
  expect(['groq','openrouter']).toContain(review.source)
  aiAtsReviewSchema.parse(review.review)
  await expect(page.getByText('AI Snapshot',{ exact:true })).toBeVisible()

  const condensePending=page.waitForResponse(response => response.url().endsWith('/api/ai/condense'),{ timeout:60000 })
  await page.getByRole('button',{ name:'Suggest shorter content' }).click()
  const condensedResponse=await condensePending
  expect(condensedResponse.status()).toBe(200)
  const condensed=await condensedResponse.json()
  expect(['groq','openrouter'],condensed.explanation).toContain(condensed.source)
  condensationSchema.parse(condensed)
  expect(condensed.summary.length).toBeLessThan(data.summary.length)
  await page.getByRole('button',{ name:'Apply shorter summary' }).click()
  await expect(page.getByLabel('Professional Summary',{ exact:true })).toHaveValue(condensed.summary)
  await expect(page.getByRole('status').filter({ hasText:'All changes saved' })).toBeVisible()
  expect((await (await page.request.get(`/api/cvs/${cv.id}`)).json()).cv.data.summary).toBe(condensed.summary)
  await page.getByRole('button',{ name:'Undo AI change' }).click()
  await expect(page.getByLabel('Professional Summary',{ exact:true })).toHaveValue(data.summary)
  await expect(page.getByRole('status').filter({ hasText:'All changes saved' })).toBeVisible()

  const tailorResponse=await page.request.post('/api/ai/tailor',{ timeout:60000,data:{ cvId:cv.id,cvData:data,jobTitle:'Software Engineer',jobDescription:'Build reliable web applications using React, TypeScript and PostgreSQL. Collaborate with engineers and mentor developers.',saveToHistory:true } })
  expect(tailorResponse.status()).toBe(200)
  const tailored=await tailorResponse.json()
  expect(['groq','openrouter']).toContain(tailored.source)
  aiJobTailorSchema.parse(tailored.analysis)
  expect(tailored.savedJobDescriptionId).toBeTruthy()
  console.log(JSON.stringify({ provider:review.source,review:'real',condensation:'real',tailoring:'real',applyAutosaveUndo:'passed' }))
})
