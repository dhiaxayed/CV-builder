import { existsSync, promises as fs } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { createCompiler } from 'node-latex-compiler'
import { circularPhoto } from './photo'
import { AppError } from '@/lib/errors'

export async function runLatexProcess(command: string, args: string[], cwd: string, env = process.env, timeoutMs = 45000) {
  return new Promise<{ code: number | null; output: string }>((resolve, reject) => {
    const child = spawn(command, args, { cwd, env, windowsHide: true })
    let output = ''
    let timedOut = false
    const timer = setTimeout(() => { timedOut = true; child.kill('SIGKILL') }, timeoutMs)
    const append = (chunk: Buffer) => { output = (output + chunk.toString()).slice(-64000) }
    child.stdout.on('data', append); child.stderr.on('data', append)
    child.on('error', error => { clearTimeout(timer); reject(error) })
    // Wait for native handles to close before removing its working directory.
    child.on('close', code => {
      clearTimeout(timer)
      if (timedOut) reject(new AppError(503, 'LATEX_TIMEOUT', 'PDF rendering timed out. Please retry.'))
      else resolve({ code, output })
    })
  })
}

let seededCache: Promise<{ directory:string; offline:boolean }> | undefined

async function prepareRuntimeCache() {
  const source = path.join(process.cwd(),'vendor','tectonic-cache')
  let key: string | undefined
  try {
    const manifest = JSON.parse(await fs.readFile(path.join(source,'ready.json'),'utf8'))
    if (manifest.platform === process.platform && manifest.arch === process.arch && /^[a-f0-9]{64}$/.test(manifest.key)) key = manifest.key
  } catch { /* Local system-engine setups do not require a bundled cache. */ }
  const directory = path.join(tmpdir(),key ? `cv-tectonic-${key.slice(0,16)}` : 'cv-tectonic-cache')
  await fs.mkdir(directory,{ recursive:true })
  if (key) await fs.cp(source,directory,{ recursive:true })
  return { directory,offline:Boolean(key) }
}

export async function compileLatexToPdf(latex: string, photoData?: string): Promise<{ bytes: Buffer; overfullPoints: number }> {
  const dir = await fs.mkdtemp(path.join(tmpdir(), 'cv-pdf-'))
  try {
    if (photoData) {
      await fs.writeFile(path.join(dir,'cv_photo.png'),await circularPhoto(photoData))
    }
    const tex = path.join(dir, 'cv.tex')
    await fs.writeFile(tex, latex, 'utf8')
    const renderer = process.env.LATEX_RENDERER || 'auto'
    let success = false
    let available = false
    if (renderer !== 'tectonic') {
      const commands = process.env.LATEX_CMD ? [process.env.LATEX_CMD] : ['pdflatex','xelatex']
      for (const command of commands) {
        try {
          const result = await runLatexProcess(command, ['-no-shell-escape','-interaction=nonstopmode','-halt-on-error','-output-directory',dir,tex],dir)
          available = true
          if (result.code === 0) { success = true; break }
          // A real compile failure is not evidence that another engine is missing.
        } catch (error) {
          if (!(error instanceof Error && 'code' in error && error.code === 'ENOENT')) throw error
        }
      }
    }
    if (!success && renderer !== 'system') {
      const vendored = path.join(process.cwd(),'vendor',`tectonic-${process.platform}-${process.arch}`,'bin',process.platform === 'win32' ? 'tectonic.exe' : 'tectonic')
      const compiler = createCompiler() as unknown as { isAvailable: () => boolean; tectonicPath?: string }
      const command = existsSync(vendored) ? vendored : compiler.isAvailable() ? compiler.tectonicPath : undefined
      if (command) {
        available = true
        // Seed /tmp once per process. Build assets remain read-only on Vercel;
        // the shipped working set lets normal exports compile without downloads.
        seededCache ||= prepareRuntimeCache().catch(() => {
          seededCache = undefined
          throw new AppError(503,'LATEX_CACHE_FAILED','PDF resources could not be prepared. Please retry.')
        })
        const cache = await seededCache
        const libs = path.join(process.cwd(),'vendor','tectonic-linux-x64','lib')
        const env = { ...process.env, XDG_CACHE_HOME: cache.directory, TECTONIC_CACHE_DIR: cache.directory, ...(process.platform === 'linux' ? { LD_LIBRARY_PATH: [libs,process.env.LD_LIBRARY_PATH].filter(Boolean).join(':') } : {}) }
        const result = await runLatexProcess(command, ['--untrusted','--keep-logs',...(cache.offline ? ['--only-cached'] : []),`--outdir=${dir}`,tex],dir,env)
        success = result.code === 0
      }
    }
    if (!success) throw new AppError(available ? 422 : 503, available ? 'LATEX_COMPILATION_FAILED' : 'LATEX_ENGINE_NOT_FOUND', available
      ? 'The document could not compile. Check unsupported characters or ask support to verify the LaTeX runtime.'
      : 'PDF rendering is unavailable. The server needs a working LaTeX engine.')
    const log = await fs.readFile(path.join(dir,'cv.log'),'utf8').catch(() => '')
    // XeTeX can exit successfully while dropping glyphs absent from the font.
    // A valid PDF must not silently lose authored characters.
    if (/Missing character: There is no|Unicode character[^\n]*not set up/i.test(log)) {
      throw new AppError(422,'UNSUPPORTED_CHARACTER','The selected font cannot render one or more characters. Replace unsupported symbols or use a supported alphabet, then retry. No PDF was exported.')
    }
    const boxes = [...log.matchAll(/Overfull \\[hv]box \(([\d.]+)pt too (?:wide|high)\)/g)].map(match => Number(match[1]))
    return { bytes: await fs.readFile(path.join(dir,'cv.pdf')), overfullPoints: Math.max(0,...boxes) }
  } finally {
    // dir is an absolute mkdtemp child of the OS temp directory.
    if (path.dirname(dir) === path.resolve(tmpdir()) && path.basename(dir).startsWith('cv-pdf-')) {
      await fs.rm(dir,{ recursive:true,force:true,maxRetries:3,retryDelay:150 }).catch(() => console.warn('[PDF] Temporary directory cleanup failed.'))
    }
  }
}
