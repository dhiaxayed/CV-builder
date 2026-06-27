import { createWriteStream, promises as fs } from 'fs'
import { tmpdir } from 'os'
import path from 'path'
import { pipeline } from 'stream/promises'
import { spawn } from 'child_process'

const isLinuxX64 = process.platform === 'linux' && process.arch === 'x64'
const vendorRoot = path.join(process.cwd(), 'vendor', 'tectonic-linux-x64')
const vendorBinDir = path.join(vendorRoot, 'bin')
const tectonicVersion = process.env.TECTONIC_VERSION || '0.16.9'
const tectonicUrl =
  process.env.TECTONIC_MUSL_URL ||
  `https://github.com/tectonic-typesetting/tectonic/releases/download/tectonic%40${tectonicVersion}/tectonic-${tectonicVersion}-x86_64-unknown-linux-musl.tar.gz`

async function command(command, args, cwd) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, stdio: 'inherit' })
    child.on('error', reject)
    child.on('close', (code) => {
      if (code === 0) resolve()
      else reject(new Error(`${command} ${args.join(' ')} failed with exit code ${code}`))
    })
  })
}

async function download(url, destination) {
  const response = await fetch(url)
  if (!response.ok || !response.body) {
    throw new Error(`Failed to download ${url}: ${response.status} ${response.statusText}`)
  }

  await pipeline(response.body, createWriteStream(destination))
}

async function main() {
  if (!isLinuxX64) {
    console.log('[tectonic-runtime] Skipping portable Tectonic install: not linux x64.')
    return
  }

  await fs.mkdir(vendorBinDir, { recursive: true })

  const target = path.join(vendorBinDir, 'tectonic')
  try {
    await fs.access(target)
    console.log('[tectonic-runtime] Portable Tectonic already installed.')
    return
  } catch {
    // Continue install.
  }

  const workDir = await fs.mkdtemp(path.join(tmpdir(), 'tectonic-libs-'))
  const archivePath = path.join(workDir, 'tectonic.tar.gz')
  const extractDir = path.join(workDir, 'extract')

  try {
    await fs.mkdir(extractDir, { recursive: true })

    console.log(`[tectonic-runtime] Downloading ${tectonicUrl}`)
    await download(tectonicUrl, archivePath)

    await command('tar', ['-xzf', archivePath, '-C', extractDir], process.cwd())

    const source = await findFile(extractDir, 'tectonic')
    await fs.copyFile(source, target)
    await fs.chmod(target, 0o755)
    console.log(`[tectonic-runtime] Installed ${target}`)
  } finally {
    await fs.rm(workDir, { recursive: true, force: true })
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
  console.error('[tectonic-runtime] Install failed:', error)
  process.exit(1)
})
