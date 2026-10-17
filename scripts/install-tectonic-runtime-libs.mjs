import { createWriteStream, promises as fs } from 'fs'
import { tmpdir } from 'os'
import path from 'path'
import { pipeline } from 'stream/promises'
import { spawn } from 'child_process'
import { createHash } from 'node:crypto'

const supported = ['linux', 'win32'].includes(process.platform) && process.arch === 'x64'
const windows = process.platform === 'win32'
const vendorRoot = path.join(process.cwd(), 'vendor', `tectonic-${process.platform}-x64`)
const vendorBinDir = path.join(vendorRoot, 'bin')
const tectonicVersion = process.env.TECTONIC_VERSION || '0.16.9'
const tectonicUrl =
  process.env.TECTONIC_DOWNLOAD_URL || (!windows && process.env.TECTONIC_MUSL_URL) ||
  `https://github.com/tectonic-typesetting/tectonic/releases/download/tectonic%40${tectonicVersion}/tectonic-${tectonicVersion}-x86_64-${windows ? 'pc-windows-msvc.zip' : 'unknown-linux-musl.tar.gz'}`
const customDownload = process.env.TECTONIC_DOWNLOAD_URL || (!windows && process.env.TECTONIC_MUSL_URL)
// SHA-256 values from the official 0.16.9 release assets. Verify before extraction.
const checksum = process.env.TECTONIC_SHA256 || (tectonicVersion === '0.16.9' && !customDownload
  ? windows ? '131a24604785a9600989a3d91225f597df52ac06f00aeffe86fd529f99ee5cdd' : '60b13a0826ae7ad9ce34b4a2df06bff2cfcfa6dda8a915477c0cbb84e1a4a902'
  : '')
const sourceHash = createHash('sha256').update(tectonicUrl).digest('hex')

async function command(command, args, cwd) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, stdio: 'inherit', windowsHide:true })
    child.on('error', reject)
    child.on('close', (code) => {
      if (code === 0) resolve()
      else reject(new Error(`${command} ${args.join(' ')} failed with exit code ${code}`))
    })
  })
}

async function download(url, destination) {
  const response = await fetch(url, { signal: AbortSignal.timeout(90000) })
  if (!response.ok || !response.body) {
    throw new Error(`Tectonic download failed (HTTP ${response.status}).`)
  }

  await pipeline(response.body, createWriteStream(destination))
}

async function main() {
  if (!supported) {
    await fs.mkdir(path.join(process.cwd(), 'vendor'), { recursive:true })
    console.log('[tectonic-runtime] Portable install supports Linux/Windows x64; use a system engine on this host.')
    return
  }
  if (!/^[a-f0-9]{64}$/i.test(checksum)) throw new Error('Provide TECTONIC_SHA256 when overriding the release version or download URL.')

  await fs.mkdir(vendorBinDir, { recursive: true })

  const executable = windows ? 'tectonic.exe' : 'tectonic'
  const target = path.join(vendorBinDir, executable)
  const stamp = path.join(vendorRoot, 'installed.json')
  try {
    await fs.access(target)
    const installed = JSON.parse(await fs.readFile(stamp, 'utf8'))
    if (installed.version === tectonicVersion && installed.sourceHash === sourceHash && installed.checksum === checksum) {
      console.log('[tectonic-runtime] Portable Tectonic already installed.')
      return
    }
  } catch {
    // Continue install.
  }

  const workDir = await fs.mkdtemp(path.join(tmpdir(), 'tectonic-libs-'))
  const archivePath = path.join(workDir, 'tectonic.tar.gz')
  const extractDir = path.join(workDir, 'extract')

  try {
    await fs.mkdir(extractDir, { recursive: true })

    console.log(`[tectonic-runtime] Downloading official Tectonic ${tectonicVersion} (${process.platform}).`)
    await download(tectonicUrl, archivePath)
    const actual = createHash('sha256').update(await fs.readFile(archivePath)).digest('hex')
    if (actual !== checksum.toLowerCase()) throw new Error('Tectonic archive checksum verification failed.')

    await command('tar', ['-xf', archivePath, '-C', extractDir], process.cwd())

    const source = await findFile(extractDir, executable)
    await fs.copyFile(source, target)
    await fs.chmod(target, 0o755)
    await fs.writeFile(stamp, JSON.stringify({ version: tectonicVersion, sourceHash, checksum }) + '\n')
    console.log(`[tectonic-runtime] Installed ${target}`)
  } finally {
    if (path.dirname(workDir) === path.resolve(tmpdir()) && path.basename(workDir).startsWith('tectonic-libs-')) await fs.rm(workDir, { recursive: true, force: true })
  }
}

async function findFile(root, fileName) {
  const entries = await fs.readdir(root, { withFileTypes: true })

  for (const entry of entries) {
    const fullPath = path.join(root, entry.name)
    if (entry.isFile() && entry.name === fileName) {
      return fullPath
    }

    if (entry.isDirectory()) {
      try {
        return await findFile(fullPath, fileName)
      } catch {
        // Continue searching.
      }
    }
  }

  throw new Error(`Could not find ${fileName} inside extracted Tectonic archive.`)
}

main().catch((error) => {
  console.error('[tectonic-runtime] Install failed:', error instanceof Error ? error.message : 'Unknown installation error')
  process.exit(1)
})
