export type UserTier = 'free' | 'pro'
export const FREE_TIER_CV_LIMIT = 1

type TierSource = {
  plan_tier?: string | null
  preferences?: Record<string, unknown> | null
}

export function resolveUserTier(user: TierSource): UserTier {
  if (user.plan_tier === 'pro') return 'pro'

  const preferencesTier = user.preferences?.tier
  if (typeof preferencesTier === 'string' && preferencesTier === 'pro') {
    return 'pro'
  }

  return 'free'
}

export function aiRequestLimit(user: TierSource): number {
  return resolveUserTier(user) === 'pro' ? 30 : 12
}

