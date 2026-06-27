import { createWriteStream, promises as fs } from 'fs'
import { tmpdir } from 'os'
import path from 'path'
import { pipeline } from 'stream/promises'
import { spawn } from 'child_process'

const isLinuxX64 = process.platform === 'linux' && process.arch === 'x64'
const vendorDir = path.join(process.cwd(), 'vendor', 'tectonic-linux-x64', 'lib')
const debUrl =
  process.env.GRAPHITE2_DEB_URL ||
  'https://deb.debian.org/debian/pool/main/g/graphite2/libgraphite2-3_1.3.14-2+b1_amd64.deb'

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
    console.log('[tectonic-libs] Skipping runtime library install: not linux x64.')
    return
  }

  await fs.mkdir(vendorDir, { recursive: true })

  const target = path.join(vendorDir, 'libgraphite2.so.3')
  try {
    await fs.access(target)
    console.log('[tectonic-libs] libgraphite2.so.3 already installed.')
    return
  } catch {
    // Continue install.
  }

  const workDir = await fs.mkdtemp(path.join(tmpdir(), 'tectonic-libs-'))
  const debPath = path.join(workDir, 'libgraphite2.deb')
  const extractDir = path.join(workDir, 'extract')
  const dataDir = path.join(workDir, 'data')

  try {
    await fs.mkdir(extractDir, { recursive: true })
    await fs.mkdir(dataDir, { recursive: true })

    console.log(`[tectonic-libs] Downloading ${debUrl}`)
    await download(debUrl, debPath)

    await command('ar', ['x', debPath], extractDir)

    const entries = await fs.readdir(extractDir)
    const dataArchive = entries.find((entry) => entry.startsWith('data.tar.'))
    if (!dataArchive) {
      throw new Error('Debian package did not contain data.tar archive.')
    }

    await command('tar', ['-xf', path.join(extractDir, dataArchive), '-C', dataDir], process.cwd())

    const candidates = [
      path.join(dataDir, 'usr', 'lib', 'x86_64-linux-gnu', 'libgraphite2.so.3'),
      path.join(dataDir, 'usr', 'lib64', 'libgraphite2.so.3'),
    ]

    let libSource = null
    for (const candidate of candidates) {
      try {
        await fs.access(candidate)
        libSource = candidate
        break
      } catch {
        // Continue searching.
      }
    }

    if (!libSource) {
      throw new Error('Could not find libgraphite2.so.3 inside extracted Debian package.')
    }

    await fs.copyFile(libSource, target)
    console.log(`[tectonic-libs] Installed ${target}`)
  } finally {
    await fs.rm(workDir, { recursive: true, force: true })
  }
}

main().catch((error) => {
  console.error('[tectonic-libs] Install failed:', error)
  process.exit(1)
})
