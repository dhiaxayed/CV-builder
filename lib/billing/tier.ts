export type UserTier = 'free' | 'pro'

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

