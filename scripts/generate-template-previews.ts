import { mkdir, writeFile, readFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { PDFParse } from 'pdf-parse'
import sharp from 'sharp'
import { TEMPLATES } from '../lib/templates'
import { renderCV } from '../lib/pdf/render'
import { renderFixture } from '../tests/fixtures/render'

async function main() {
  // Published thumbnails must use the same engine as production on Vercel.
  process.env.LATEX_RENDERER = 'tectonic'
  await mkdir('public/templates',{ recursive:true })
  await mkdir('output/pdf/templates',{ recursive:true })
  const source = createHash('sha256')
  // Git checkouts use different line endings on Windows and Linux.
  for (const file of ['lib/latex/generator.ts','tests/fixtures/render.ts','lib/templates.ts','lib/types/cv.ts','lib/pdf/render.ts','lib/pdf/compiler.ts','scripts/install-tectonic-runtime-libs.mjs']) source.update((await readFile(file,'utf8')).replace(/\r\n/g,'\n'))
  const sourceHash = source.digest('hex')
  const matrix = []
  for (let offset=0; offset<TEMPLATES.length; offset+=2) {
    const batch = await Promise.all(TEMPLATES.slice(offset,offset+2).map(async template => {
    const result = await renderCV(renderFixture(),template.id)
    const parser = new PDFParse({ data:new Uint8Array(result.bytes) })
    try {
      const text = (await parser.getText()).text
      for (const required of ['José','TechCorp','StartupXYZ','Education','Skills','Projects','Certifications','Awards','Languages','Community','coding club']) {
        if (!text.toLowerCase().includes(required.toLowerCase())) throw new Error(`${template.id}: missing PDF text ${required}`)
      }
      const screenshot = await parser.getScreenshot({ partial:[1],desiredWidth:650 })
      const webp = await sharp(screenshot.pages[0].data).webp({ quality:85 }).toBuffer()
      await writeFile(`public/templates/${template.id}.webp`,webp)
      await writeFile(`output/pdf/templates/${template.id}.pdf`,result.bytes)
      console.log(`${template.id}: ${result.pages} page, ${result.density}, text verified, preview generated`)
      return { template:template.id,pages:result.pages,density:result.density,extractableText:true,preview:'actual PDF first page',renderHash:result.hash }
    } finally { await parser.destroy() }
    }))
    matrix.push(...batch)
  }
  await writeFile('public/templates/manifest.json',JSON.stringify({ sourceHash,renderer:'tectonic',templates:matrix },null,2)+'\n')
}
main().catch(error => { console.error(error); process.exitCode=1 })
