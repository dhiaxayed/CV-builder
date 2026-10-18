/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
  },
  serverExternalPackages: [
    'node-latex-compiler',
    '@node-latex-compiler/bin-linux-x64',
  ],
  // Route keys are globs, so * also matches the dynamic share-token segment.
  outputFileTracingIncludes: Object.fromEntries(
    ['/api/pdf', '/api/share/*/pdf'].map(route => [route, [
      './vendor/tectonic-linux-x64/**/*',
      './vendor/tectonic-cache/**/*',
    ]]),
  ),
  // Old versions of the compiler dependency kept documents inside its package.
  // Those local artifacts must never become deployable function assets.
  outputFileTracingExcludes: {
    '/api/pdf': ['**/__latex_compile_temp__/**/*', './output/**/*', './tests/**/*', './tmp/**/*', '**/*.pdf'],
    '/api/share/*/pdf': ['**/__latex_compile_temp__/**/*', './output/**/*', './tests/**/*', './tmp/**/*', '**/*.pdf'],
  },
}

export default nextConfig
