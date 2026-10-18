/** Prefer a server credential, retaining the original deployment's public-key fallback. */
export function serverDatabaseKey(env: Record<string, string | undefined>) {
  return env.SUPABASE_SECRET_KEY?.trim() || env.SUPABASE_SERVICE_ROLE_KEY?.trim()
    || env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY?.trim() || env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || undefined
}
