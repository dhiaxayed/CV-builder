import { keywordPresent } from '../../lib/keywords'
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { z } from 'zod'
import { cvDataSchema, updateCVSchema, templateIdSchema } from '../../lib/validation/cv'
import { createEmptyCVData, createSampleCVData } from '../../lib/types/cv'
import { escapeLatex, generateLatex } from '../../lib/latex/generator'
import { TEMPLATE_IDS, resolveTemplateId } from '../../lib/templates'
import { runATSChecks, extractKeywords, matchJobDescription } from '../../lib/ats/checker'
import { imageSignature } from '../../lib/photos'
import { safeRedirect } from '../../lib/auth-redirect'
import { resolveUserTier } from '../../lib/billing/tier'
import { databaseError, AppError } from '../../lib/errors'
import { groundReview, groundTailoring, hasUnsupportedClaim } from '../../lib/ai/grounding'
import { aiAtsReviewSchema, aiJobTailorSchema } from '../../lib/ai/types'
import { generateAtsReview, generateJobTailorAnalysis } from '../../lib/ai/cv-review'
import { generateStructuredObject, configuredAIProvider } from '../../lib/ai/provider'
import { generateCondensation, groundCondensation } from '../../lib/ai/condense'

test('canonical CV schema normalizes missing arrays and rejects malformed or oversized fields',() => {
  assert.deepEqual(cvDataSchema.parse({}),createEmptyCVData())
  assert.equal(cvDataSchema.safeParse({ experience:'invalid' }).success,false)
  assert.equal(cvDataSchema.safeParse({ summary:'x'.repeat(10001) }).success,false)
  assert.equal(cvDataSchema.safeParse({ skills:[{ id:'same',category:'A',skills:[] },{ id:'same',category:'B',skills:[] }] }).success,false)
  assert.equal(cvDataSchema.safeParse({ basics:{ photoUrl:'https://attacker.invalid/photo' } }).success,false)
  assert.equal(cvDataSchema.safeParse({ appearance:{ colorTheme:'injected-tex' } }).success,false)
  assert.equal(updateCVSchema.safeParse({ data:{} }).success,false)
  assert.equal(updateCVSchema.safeParse({ expectedRevision:0 }).success,false)
  assert.equal(templateIdSchema.safeParse('invented').success,false)
})
test('every template resolves, escapes hostile TeX once, and renders supported fields',() => {
  assert.equal(escapeLatex('\\input{secret}% & $ # _ ^ ~'), '\\textbackslash{}input\\{secret\\}\\% \\& \\$ \\# \\_ \\textasciicircum{} \\textasciitilde{}')
  for (const id of TEMPLATE_IDS) {
    assert.equal(resolveTemplateId(id),id)
    const source = generateLatex(createSampleCVData(),id)
    assert.ok(source.includes(`template=${id}`)); assert.match(source,/Awards \\\& Honors/i)
    assert.match(source,/Languages/i); assert.ok(source.includes('Employee of the Year'))
  }
  assert.equal(resolveTemplateId('classic-ats'),'classic')
  assert.equal(resolveTemplateId('invalid'),'modern')
  const themed=createSampleCVData()
  themed.appearance={ colorTheme:'burgundy',font:'sans' }
  const themedSource=generateLatex(themed,'classic')
  assert.ok(themedSource.includes('{81354D}'))
  assert.ok(themedSource.includes('\\familydefault}{\\sfdefault}'))
})
test('matching uses word boundaries; heuristic scores remain bounded',() => {
  assert.equal(keywordPresent('JavaScript developer','Java'),false)
  assert.equal(keywordPresent('C++ and Node.js','C++'),true)
  assert.equal(keywordPresent('React, Python','react'),true)
  assert.equal(hasUnsupportedClaim('Improved by 5%','Improved by 15%'),true)
  assert.equal(hasUnsupportedClaim('Served 2M+ users','Served 12M+ users'),true)
  assert.equal(hasUnsupportedClaim('Served 2M+ users','Served 2M+ users'),false)
  assert.equal(hasUnsupportedClaim('Built services with MongoDB and Terraform','Built services with PostgreSQL'),true)
  assert.equal(hasUnsupportedClaim('Built C# services','Built JavaScript services'),true)
  const data = createEmptyCVData(); data.skills=[{ id:'s',category:'Tools',skills:['JavaScript'] }]
  const match = matchJobDescription(data,'Java Java JavaScript Python')
  assert.ok(!match.matchedKeywords.includes('java')); assert.ok(match.missingKeywords.includes('java'))
  assert.ok(extractKeywords('React TypeScript Python').includes('react'))
  for (const cv of [data,createSampleCVData()]) { const score=runATSChecks(cv).overallScore; assert.ok(score>=0 && score<=100) }
})
test('file signatures, redirect validation, tiers and error mapping fail safely',() => {
  assert.equal(imageSignature(new Uint8Array([255,216,255])),'jpeg')
  assert.equal(imageSignature(new Uint8Array([137,80,78,71,13,10,26,10])),'png')
  assert.equal(imageSignature(new TextEncoder().encode('<svg/>')),null)
  for (const value of ['//attacker.invalid','https://attacker.invalid','/\\evil','/api/private','/auth/signin','/cv\r\nX:1']) assert.equal(safeRedirect(value),'/dashboard')
  assert.equal(safeRedirect('/cv/new?template=elegant'),'/cv/new?template=elegant')
  assert.equal(resolveUserTier({ plan_tier:'free' }),'free')
  assert.equal(resolveUserTier({ plan_tier:'pro' }),'pro')
  assert.equal(resolveUserTier({ preferences:{ tier:'pro' } }),'pro')
  assert.throws(() => databaseError({ message:'REVISION_CONFLICT private SQL' }),error => error instanceof AppError && error.status===409 && !error.message.includes('private SQL'))
})

test('unavailable AI returns schema-valid, labelled, factual fallback with no invented skills',async () => {
  const previous = process.env.GROQ_API_KEY
  const router = process.env.OPENROUTER_API_KEY
  delete process.env.GROQ_API_KEY; delete process.env.OPENROUTER_API_KEY
  try {
    const empty = createEmptyCVData()
    const review = await generateAtsReview({ cvData:empty })
    assert.equal(review.source,'heuristic-fallback'); assert.ok(aiAtsReviewSchema.safeParse(review.review).success)
    assert.equal(review.review.rewrittenSummary,''); assert.deepEqual(review.review.skillsToAdd,[])
    const tailored = await generateJobTailorAnalysis({ cvData:empty,jobTitle:'Director',jobDescription:'AWS Kubernetes AWS Kubernetes required' })
    assert.equal(tailored.source,'heuristic-fallback'); assert.ok(aiJobTailorSchema.safeParse(tailored.analysis).success)
    assert.deepEqual(tailored.analysis.skillsToAdd,[]); assert.deepEqual(tailored.analysis.experienceRewrites,[]); assert.equal(tailored.analysis.tailoredSummary,'')
    const condensed = await generateCondensation({ ...empty,summary:'Successfully improved services in order to reduce latency by 40%.' })
    assert.equal(condensed.source,'heuristic-fallback'); assert.ok(condensed.summary.includes('40%')); assert.ok(condensed.summary.length<70)
    const badSummary = groundReview({ ...review.review,rewrittenSummary:'Principal AWS engineer with 99% improvement',skillsToAdd:['AWS'] },empty)
    assert.equal(badSummary.rewrittenSummary,''); assert.deepEqual(badSummary.skillsToAdd,[])
    const badTailoring = groundTailoring({ ...tailored.analysis,experienceRewrites:[{ experienceId:'not-owned',role:'Director',company:'Invented',bullets:['Invented achievement'],rationale:'invented' }] },empty)
    assert.deepEqual(badTailoring.experienceRewrites,[])
  } finally {
    if (previous === undefined) delete process.env.GROQ_API_KEY; else process.env.GROQ_API_KEY=previous
    if (router === undefined) delete process.env.OPENROUTER_API_KEY; else process.env.OPENROUTER_API_KEY=router
  }
})

test('condensation rejects new metrics, dropped metrics, unknown IDs and longer rewrites',() => {
  const data=createSampleCVData()
  const grounded=groundCondensation({ summary:'Made 999% improvements',experienceRewrites:[{ experienceId:data.experience[0].id,bullets:['Dropped original metrics'],rationale:'shorter' }],explanation:'Test' },data)
  assert.equal(grounded.summary,data.summary); assert.deepEqual(grounded.experienceRewrites,[])
  const base=aiJobTailorSchema.parse({ targetRole:'Engineer',company:'',matchScore:50,atsFitScore:50,executiveSummary:'Review',matchedStrengths:['Engineering'],missingKeywords:[],recruiterConcerns:['Review facts'],tailoredSummary:data.summary,skillsToAdd:[],experienceRewrites:[],interviewTalkingPoints:['Engineering'],versionNote:'Test' })
  const original=data.experience[0]
  const invalid=groundTailoring({ ...base,experienceRewrites:[{ experienceId:original.id,role:original.role,company:original.company,bullets:original.bullets.map(() => 'Built reliable systems'),rationale:'Dropped metrics' }] },data)
  assert.deepEqual(invalid.experienceRewrites,[])
  assert.ok(invalid.recruiterConcerns[0].includes('excluded'))
  const valid=groundTailoring({ ...base,experienceRewrites:[{ experienceId:original.id,role:original.role,company:original.company,bullets:original.bullets,rationale:'Original facts retained' }] },data)
  assert.equal(valid.experienceRewrites.length,1)
})

test('provider contract repairs invalid JSON once and bounds transient retries',async () => {
  const originalFetch=globalThis.fetch; const key=process.env.GROQ_API_KEY
  process.env.GROQ_API_KEY='test-key'
  let calls=0
  globalThis.fetch=async () => {
    calls++
    if (calls===1) return new Response('{"error":{"message":"private provider details"}}',{ status:503 })
    return new Response(JSON.stringify({ choices:[{ message:{ content:calls===2 ? 'not JSON' : '{"ok":true}' } }] }))
  }
  try {
    assert.deepEqual(await generateStructuredObject({ schema:z.object({ ok:z.literal(true) }),messages:[{ role:'user',content:'Test' }],shapeInstructions:'{"ok":true}' }),{ ok:true })
    assert.equal(calls,3)
    calls=0; globalThis.fetch=async () => { calls++; return new Response('secret upstream diagnostics',{ status:429 }) }
    await assert.rejects(generateStructuredObject({ schema:z.object({ ok:z.boolean() }),messages:[],shapeInstructions:'ok' }),error => error instanceof Error && !error.message.includes('secret'))
    assert.equal(calls,2)
    calls=0
    globalThis.fetch=async () => {
      if (++calls===1) throw new DOMException('Synthetic connection timeout','AbortError')
      return new Response(JSON.stringify({ choices:[{ message:{ content:'{"ok":true}' } }] }))
    }
    assert.deepEqual(await generateStructuredObject({ schema:z.object({ ok:z.literal(true) }),messages:[],shapeInstructions:'{"ok":true}' }),{ ok:true })
    assert.equal(calls,2)
  } finally { globalThis.fetch=originalFetch; if (key===undefined) delete process.env.GROQ_API_KEY; else process.env.GROQ_API_KEY=key }
})

test('existing OpenRouter configuration uses the same validated contract and Groq has explicit precedence',async () => {
  const originalFetch=globalThis.fetch
  const groq=process.env.GROQ_API_KEY; const router=process.env.OPENROUTER_API_KEY
  delete process.env.GROQ_API_KEY; process.env.OPENROUTER_API_KEY='test-router-key'
  globalThis.fetch=async (url,options) => {
    assert.equal(url,'https://openrouter.ai/api/v1/chat/completions')
    const body=JSON.parse(String(options?.body))
    assert.equal(body.response_format.type,'json_object'); assert.equal(body.max_tokens,2200)
    assert.equal(body.max_completion_tokens,undefined)
    assert.deepEqual(body.reasoning,{ enabled:false,exclude:true })
    return new Response(JSON.stringify({ choices:[{ message:{ content:'{"ok":true}' } }] }))
  }
  try {
    assert.equal(configuredAIProvider(),'openrouter')
    assert.deepEqual(await generateStructuredObject({ schema:z.object({ ok:z.literal(true) }),messages:[],shapeInstructions:'{"ok":true}' }),{ ok:true })
    process.env.GROQ_API_KEY='test-groq-key'; assert.equal(configuredAIProvider(),'groq')
  } finally {
    globalThis.fetch=originalFetch
    if (groq===undefined) delete process.env.GROQ_API_KEY; else process.env.GROQ_API_KEY=groq
    if (router===undefined) delete process.env.OPENROUTER_API_KEY; else process.env.OPENROUTER_API_KEY=router
  }
})

test('Groq recovers once from retired models while preserving working overrides and authentication failures',async () => {
  const originalFetch=globalThis.fetch,oldKey=process.env.GROQ_API_KEY,oldModel=process.env.GROQ_MODEL
  process.env.GROQ_API_KEY='test-groq-key';process.env.GROQ_MODEL='retired-model'
  const models:string[]=[]
  globalThis.fetch=async (url,options) => {
    assert.equal(url,'https://api.groq.com/openai/v1/chat/completions')
    const body=JSON.parse(String(options?.body));models.push(body.model)
    if(body.model==='retired-model')return new Response('{"error":{"code":"model_not_found","message":"private diagnostic"}}',{status:404})
    assert.equal(body.model,'openai/gpt-oss-120b');assert.equal(body.reasoning_effort,'low');assert.equal(body.include_reasoning,false)
    return new Response('{"choices":[{"message":{"content":"{\\"ok\\":true}"}}]}')
  }
  const request=()=>generateStructuredObject({schema:z.object({ok:z.literal(true)}),messages:[],shapeInstructions:'{"ok":true}'})
  try {
    assert.deepEqual(await request(),{ok:true});assert.deepEqual(models,['retired-model','openai/gpt-oss-120b'])
    let calls=0
    globalThis.fetch=async (_url,options)=>{calls++;assert.equal(JSON.parse(String(options?.body)).model,'retired-model');return new Response('{"choices":[{"message":{"content":"{\\"ok\\":true}"}}]}')}
    assert.deepEqual(await request(),{ok:true});assert.equal(calls,1)
    calls=0;globalThis.fetch=async()=>{calls++;return new Response('private credential diagnostic',{status:401})}
    await assert.rejects(request(),error=>error instanceof Error && error.message.includes('401') && !error.message.includes('private'));assert.equal(calls,1)
  } finally {
    globalThis.fetch=originalFetch
    if(oldKey===undefined)delete process.env.GROQ_API_KEY;else process.env.GROQ_API_KEY=oldKey
    if(oldModel===undefined)delete process.env.GROQ_MODEL;else process.env.GROQ_MODEL=oldModel
  }
})
