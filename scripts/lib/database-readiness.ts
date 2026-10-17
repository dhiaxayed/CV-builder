type DatabaseEnvironment = Record<string, string | undefined>

const requiredTables = {
  cvs: 'id,revision,draft_data,published_data,published_title,published_template_id',
  cv_versions: 'id,template_id',
  rate_limits: 'key,window_start,attempts',
  uploaded_files: 'id,user_id,storage_url,storage_provider',
  users: 'id,plan_tier',
} as const

const requiredFunctions = [
  'consume_magic_token', 'create_cv_atomic', 'save_cv_draft', 'snapshot_cv',
  'restore_cv', 'publish_cv', 'take_rate_limit', 'save_photo',
]

/** Read schema metadata and zero rows only. Never run a migration or invoke an RPC. */
export async function verifyDatabaseReadiness(env: DatabaseEnvironment, request: typeof fetch = fetch) {
  const databaseUrl = env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY
  if (!databaseUrl || !serviceKey) {
    throw new Error('Database readiness requires the Supabase URL and server-only SUPABASE_SERVICE_ROLE_KEY.')
  }

  const root = new URL('/rest/v1/', databaseUrl)
  const headers = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` }
  // One deadline covers every request, including the metadata response body.
  const signal = AbortSignal.timeout(15_000)
  try {
    await Promise.all(Object.entries(requiredTables).map(async ([table, columns]) => {
      const endpoint = new URL(table, root)
      endpoint.searchParams.set('select', columns)
      endpoint.searchParams.set('limit', '0')
      const response = await request(endpoint, { headers, signal, cache: 'no-store', redirect: 'error' })
      await response.body?.cancel()
      if (!response.ok) throw new Error(`Required database schema is unavailable: ${table}.`)
    }))

    const response = await request(root, {
      headers: { ...headers, Accept: 'application/openapi+json' }, signal, cache: 'no-store', redirect: 'error',
    })
    if (!response.ok) throw new Error('Database RPC metadata is unavailable; check PostgREST OpenAPI configuration.')
    const metadata = await response.json() as { paths?: Record<string, unknown> }
    const missing = requiredFunctions.filter(name => !metadata?.paths?.[`/rpc/${name}`])
    if (missing.length) throw new Error(`Required database functions are unavailable: ${missing.join(', ')}.`)
  } catch (error) {
    // Never print transport errors: they can include connection URLs/headers.
    const message = error instanceof Error && /^(Required database|Database RPC metadata)/.test(error.message)
      ? error.message : 'Database readiness could not be verified within the request deadline.'
    throw new Error(`${message} Apply migrations 003/004 and verify permissions before deploying.`)
  }
}
