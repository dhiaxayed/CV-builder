/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
  },
  serverExternalPackages: [
    'node-latex-compiler',
    '@node-latex-compiler/bin-linux-x64',
  ],
  outputFileTracingIncludes: {
    '/api/pdf': ['./vendor/tectonic-linux-x64/lib/**/*'],
  },
}

export default nextConfig
