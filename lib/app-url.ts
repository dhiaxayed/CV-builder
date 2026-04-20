function normalizeBaseUrl(raw: string): string {
  const value = raw.trim()
  if (!value) return ''

  const withProtocol = /^https?:\/\//i.test(value) ? value : `https://${value}`
  return withProtocol.replace(/\/+$/, '')
}

export function resolveAppBaseUrl(preferredOrigin?: string): string {
  const preferred = preferredOrigin ? normalizeBaseUrl(preferredOrigin) : ''
  if (preferred) return preferred

  const configured = normalizeBaseUrl(process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || '')
  if (configured) return configured

  const vercelProd = normalizeBaseUrl(process.env.VERCEL_PROJECT_PRODUCTION_URL || '')
  if (vercelProd) return vercelProd

  const vercelRuntime = normalizeBaseUrl(process.env.VERCEL_URL || '')
  if (vercelRuntime) return vercelRuntime

  return 'http://localhost:3000'
}

