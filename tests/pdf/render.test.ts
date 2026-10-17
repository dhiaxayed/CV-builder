import { test } from 'node:test'
import assert from 'node:assert/strict'
import { PDFParse } from 'pdf-parse'
import { readFile, mkdir, writeFile } from 'node:fs/promises'
import sharp from 'sharp'
import { createHash } from 'node:crypto'
import { renderCV, PDFOverflowError } from '../../lib/pdf/render'
import { TEMPLATE_IDS } from '../../lib/templates'
import { renderFixture, overflowFixture } from '../fixtures/render'
import { AppError } from '../../lib/errors'

process.env.LATEX_RENDERER ||= 'tectonic'
const outputDirectory=process.env.LATEX_RENDERER === 'system' ? 'output/pdf/system-templates' : 'output/pdf/templates'

for (const id of TEMPLATE_IDS) {
  test(`${id}: real PDF is one page with all sections, accents and live links`, { timeout:180000 },async () => {
    const result = await renderCV(renderFixture(),id)
    assert.equal(result.pages,1)
    await mkdir(outputDirectory,{ recursive:true })
    await writeFile(`${outputDirectory}/${id}.pdf`,result.bytes)
    assert.ok(result.latex.includes(`template=${id}`))
    const parser = new PDFParse({ data:new Uint8Array(result.bytes) })
    try {
      const text = (await parser.getText()).text
      for (const required of ['José','François','TechCorp','StartupXYZ','Education','Skills','Projects','Certifications','Awards','Languages','Community','coding club']) assert.ok(text.includes(required),`${id}: ${required}`)
      const info = await parser.getInfo({ parsePageInfo:true })
      assert.ok(info.pages.some(page => page.links.length > 0),'Links must be clickable')
      // Gallery artifacts represent production Tectonic, while this suite also
      // checks system-engine portability. Different TeX engines can typeset
      // the same source differently; only the production run compares pixels.
      if (process.env.LATEX_RENDERER === 'tectonic') {
        const screenshot = await parser.getScreenshot({ partial:[1],desiredWidth:650 })
        const actual = await sharp(screenshot.pages[0].data).resize(160,226).removeAlpha().raw().toBuffer()
        const thumbnail = await sharp(await readFile(`public/templates/${id}.webp`)).resize(160,226).removeAlpha().raw().toBuffer()
        let squaredError = 0
        for (let index=0; index<actual.length; index++) squaredError += (actual[index]-thumbnail[index])**2
        assert.ok(Math.sqrt(squaredError/actual.length) < 10,`${id}: thumbnail differs materially from actual PDF`)
      }
    } finally { await parser.destroy() }
  })
}
for (const id of TEMPLATE_IDS) {
  test(`${id}: long content is rejected in strict one-page mode`, { timeout:180000 },async () => {
    await assert.rejects(renderCV(overflowFixture(),id),error => error instanceof PDFOverflowError && error.pages > 1)
  })
}
test('special TeX characters and a photo survive actual compilation', { timeout:180000 },async () => {
  const data=renderFixture()
  data.customSections=[{ id:'special',title:'R&D #1',type:'markdown',content:['Budget $10_000 at 50% coverage; {draft} \\plan ~ ^'] }]
  const png=await sharp({ create:{ width:64,height:64,channels:3,background:'#345678' } }).png().toBuffer()
  const photo=`data:image/png;base64,${png.toString('base64')}`
  data.basics.photoUrl=photo
  const rendered=await renderCV(data,'compact','one-page',photo)
  const parser=new PDFParse({ data:new Uint8Array(rendered.bytes) })
  try {
    const text=(await parser.getText()).text
    assert.ok(text.includes('50%')); assert.ok(text.includes('R&D')); assert.ok(text.includes('draft'))
    // The fixture is 64px; the extractor otherwise ignores images below 80px.
    assert.ok((await parser.getImage({ imageThreshold:0 })).pages.some(page=>page.images.length>0),'Photo must be embedded')
  } finally { await parser.destroy() }
})
test('custom palette and typeface compile with a photo and retain every section', { timeout:180000 },async () => {
  const data=renderFixture()
  data.appearance={ colorTheme:'burgundy',font:'sans' }
  const png=await sharp({ create:{ width:128,height:128,channels:3,background:'#345678' } }).png().toBuffer()
  const photo=`data:image/png;base64,${png.toString('base64')}`
  data.basics.photoUrl=photo
  const result=await renderCV(data,'classic','multi-page',photo)
  assert.ok(result.latex.includes('{81354D}'))
  assert.ok(result.latex.includes('\\familydefault}{\\sfdefault}'))
  const parser=new PDFParse({ data:new Uint8Array(result.bytes) })
  try {
    const text=(await parser.getText()).text
    for (const required of ['Experience','Education','Skills','Projects','Certifications','Awards','Languages','Community']) assert.ok(text.includes(required))
    assert.ok((await parser.getImage({ imageThreshold:0 })).pages.some(page=>page.images.length>0))
  } finally { await parser.destroy() }
})
test('unsupported glyphs cannot silently disappear from an exported PDF', { timeout:180000 },async () => {
  const data=renderFixture()
  data.basics.name+=String.fromCodePoint(0x1F642)
  await assert.rejects(renderCV(data,'compact'),error => error instanceof AppError && error.status===422 && ['UNSUPPORTED_CHARACTER','LATEX_COMPILATION_FAILED'].includes(error.code))
})
test('overflow is explicit and multi-page output preserves the last entry', { timeout:180000 },async () => {
  await assert.rejects(renderCV(overflowFixture(),'modern'),error => error instanceof PDFOverflowError && error.pages > 1 && error.sections.includes('experience'))
  const result = await renderCV(overflowFixture(),'modern','multi-page')
  assert.ok(result.pages > 1)
  const parser = new PDFParse({ data:new Uint8Array(result.bytes) })
  try { assert.ok((await parser.getText()).text.includes('Company 19')) } finally { await parser.destroy() }
})
test('published thumbnails are tied to the current renderer and fixture',async () => {
  const source = createHash('sha256')
  for (const file of ['lib/latex/generator.ts','tests/fixtures/render.ts','lib/templates.ts','lib/types/cv.ts','lib/pdf/render.ts','lib/pdf/compiler.ts','scripts/install-tectonic-runtime-libs.mjs']) source.update((await readFile(file,'utf8')).replace(/\r\n/g,'\n'))
  const hash = source.digest('hex')
  const manifest = JSON.parse(await readFile('public/templates/manifest.json','utf8'))
  assert.equal(manifest.sourceHash,hash,'Regenerate thumbnails after changing the renderer, template catalogue or fixture')
  assert.equal(manifest.templates.length,16)
  assert.equal(manifest.renderer,'tectonic')
})
