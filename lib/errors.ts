export class AppError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message)
    this.name = 'AppError'
  }
}

export function databaseError(error: { message: string; code?: string }): never {
  const known: Record<string, [number, string]> = {
    CV_NOT_FOUND: [404, 'CV not found'],
    VERSION_NOT_FOUND: [404, 'Version not found for this CV'],
    REVISION_CONFLICT: [409, 'This CV changed in another tab. Your local changes are preserved. Reload before saving again.'],
    FREE_TIER_CV_LIMIT: [403, 'The Free plan allows one CV. Contact us to upgrade to Pro.'],
  }
  for (const [code, [status, message]] of Object.entries(known)) {
    if (error.message.includes(code)) throw new AppError(status, code, message)
  }
  // Database diagnostics can contain SQL, private data, and credentials.
  throw new AppError(503, 'DATABASE_UNAVAILABLE', 'Unable to persist your changes. Please retry.')
}
