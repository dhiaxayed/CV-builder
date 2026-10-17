export function safeRedirect(value: unknown): string {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//') || /[\\\r\n]/.test(value)) return '/dashboard'
  try {
    const url = new URL(value, 'https://cv.invalid')
    if (url.origin !== 'https://cv.invalid' || !/^\/(?:dashboard|cv)(?:\/|$)/.test(url.pathname)) return '/dashboard'
    return url.pathname + url.search
  } catch { return '/dashboard' }
}
