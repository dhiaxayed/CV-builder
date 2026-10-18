/** Resolve only server credentials. Public/publishable keys are never a fallback. */
export function serverDatabaseKey(env: Record<string, string | undefined>) {
  return env.SUPABASE_SECRET_KEY?.trim() || env.SUPABASE_SERVICE_ROLE_KEY?.trim() || undefined
}
