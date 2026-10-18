import { readFile, access, stat } from 'node:fs/promises'
import path from 'node:path'
import assert from 'node:assert/strict'

// A local build can work while a serverless deployment omits dynamic assets.
for (const route of ['api/pdf', 'api/share/[token]/pdf']) {
  const filename = path.resolve('.next/server/app', route, 'route.js.nft.json')
  const trace = JSON.parse(await readFile(filename, 'utf8'))
  const files = trace.files.map(file => path.resolve(path.dirname(filename), file))
  assert.ok(!files.some(file => /[/\\](?:pdf-parse|pdfjs-dist|@napi-rs)[/\\]/.test(file)), `${route}: build-only PDF rasterizer entered runtime bundle`)
  assert.ok(!files.some(file => /[/\\](?:tests|output)[/\\]/.test(file)), `${route}: test artifact entered production bundle`)
  assert.ok(!files.some(file => file.includes('__latex_compile_temp__') || /\.pdf$/i.test(file)), `${route}: a document entered the function bundle`)
  assert.ok(!files.some(file => path.basename(file).startsWith('.env')), `${route}: an environment file entered the function bundle`)
  const sizes=await Promise.all(files.map(async file => (await stat(file)).size))
  const bytes=sizes.reduce((sum,size) => sum+size,0)
  assert.ok(bytes < 250000000, `${route}: traced assets exceed the standard Vercel function limit`)
  if (process.platform === 'linux' && process.arch === 'x64') {
    const binary = files.find(file => /vendor[/\\]tectonic-linux-x64[/\\]bin[/\\]tectonic$/.test(file))
    assert.ok(binary, `${route}: Vercel Tectonic binary missing`)
    await access(binary)
    assert.ok(files.some(file => /vendor[/\\]tectonic-cache[/\\]ready\.json$/.test(file)), `${route}: prepared LaTeX resources missing`)
  }
  console.log(`${route}: ${(bytes/1024/1024).toFixed(1)} MiB traced, no PDF.js/native canvas dependency${process.platform === 'linux' ? ', native binary/cache present' : ' (Linux binary checked by CI)'}`)
}
