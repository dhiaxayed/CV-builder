/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
  },
  serverExternalPackages: [
    'node-latex-compiler',
    '@node-latex-compiler/bin-linux-x64',
  ],
}

export default nextConfig
