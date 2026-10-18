import { createHash } from 'node:crypto'
import { promises as fs, existsSync } from 'node:fs'
import path from 'node:path'
import { tmpdir } from 'node:os'
import { createCompiler } from 'node-latex-compiler'
import sharp from 'sharp'
import { runLatexProcess } from '../lib/pdf/compiler'
import { generateLatex } from '../lib/latex/generator'
import { TEMPLATE_IDS } from '../lib/templates'
import { createSampleCVData } from '../lib/types/cv'

async function main() {
  // Use the matching official runtime on supported development/build hosts.
  if (!(['linux','win32'].includes(process.platform) && process.arch === 'x64') && process.env.LATEX_RENDERER !== 'tectonic') {
    console.log('[pdf-cache] Use a system engine on this unsupported native host.')
    return
  }
  const bundled = path.resolve('vendor',`tectonic-${process.platform}-${process.arch}`,'bin',process.platform === 'win32' ? 'tectonic.exe' : 'tectonic')
  const compiler = createCompiler() as unknown as { tectonicPath?:string }
  const command = existsSync(bundled) ? bundled : process.platform === 'linux' ? undefined : compiler.tectonicPath
  if (!command || !existsSync(command)) throw new Error('Install the portable Tectonic runtime before building.')
  const digest = createHash('sha256').update(await fs.readFile(command))
  for (const file of ['lib/latex/generator.ts','lib/templates.ts','lib/types/cv.ts','scripts/prepare-latex-cache.ts']) digest.update(await fs.readFile(file))
  const key = digest.digest('hex')
  const cache = path.resolve('vendor/tectonic-cache')
  try {
    const ready = JSON.parse(await fs.readFile(path.join(cache,'ready.json'),'utf8'))
    if (ready.key === key && ready.platform === process.platform && ready.arch === process.arch) {
      console.log('[pdf-cache] Verified working set already prepared.')
      return
    }
  } catch { /* First build or changed rendering resources. */ }
  await fs.mkdir(cache,{ recursive:true })
  // Never leave a previous manifest certifying an incomplete new working set.
  await fs.rm(path.join(cache,'ready.json'),{ force:true })
  const work = await fs.mkdtemp(path.join(tmpdir(),'cv-pdf-build-'))
  try {
    const photo = await sharp({ create:{ width:128,height:128,channels:3,background:'#345678' } }).png().toBuffer()
    await fs.writeFile(path.join(work,'cv_photo.png'),photo)
    const data = createSampleCVData()
    data.basics.photoUrl = 'data:image/png;base64,' + photo.toString('base64')
    const env = { ...process.env,TECTONIC_CACHE_DIR:cache,XDG_CACHE_HOME:cache }
    // Warm every composition, then the body-size/typeface resource variants.
    // TeX resources depend on fonts/packages, not on every Cartesian combination
    // of layout tokens. Recompiling that product made deployments needlessly slow.
    const cases = [
      ...TEMPLATE_IDS.map(template => ({ template, font:'template' as const, density:'normal' as const })),
      ...(['sans','serif'] as const).flatMap(font => (['normal','compact','dense'] as const).map(density => ({ template:'compact' as const,font,density }))),
    ]
    for (const { template,font,density } of cases) {
          data.appearance = { colorTheme:'template',font }
          await fs.writeFile(path.join(work,'cv.tex'),generateLatex(data,template,density),'utf8')
          const result = await runLatexProcess(command,['--untrusted','--keep-logs',`--outdir=${work}`,path.join(work,'cv.tex')],work,env,300000)
          if (result.code !== 0) throw new Error(`Unable to prepare ${template}/${font}/${density}: ${result.output.slice(-3000)}`)
          const pdf = await fs.readFile(path.join(work,'cv.pdf'))
          if (pdf.subarray(0,5).toString() !== '%PDF-') throw new Error(`Invalid ${template}/${font}/${density} build PDF.`)
      console.log(`[pdf-cache] ${template}/${font}/${density}: compiled with photo.`)
    }
    await fs.writeFile(path.join(cache,'ready.json'),JSON.stringify({ key,platform:process.platform,arch:process.arch,templates:TEMPLATE_IDS.length })+'\n')
  } finally {
    if (path.dirname(work) === path.resolve(tmpdir()) && path.basename(work).startsWith('cv-pdf-build-')) await fs.rm(work,{ recursive:true,force:true,maxRetries:3,retryDelay:150 })
  }
}
main().catch(error => { console.error('[pdf-cache]',error instanceof Error ? error.message : 'Build preparation failed'); process.exitCode=1 })
