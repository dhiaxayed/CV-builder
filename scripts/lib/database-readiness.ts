import { serverDatabaseKey } from '../../lib/db/config'

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
  const serviceKey = serverDatabaseKey(env)
  if (!databaseUrl || !serviceKey) {
    const missing = [
      ...(!databaseUrl ? ['SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL'] : []),
      ...(!serviceKey ? ['SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY (server-only)'] : []),
    ]
    throw new Error(`Missing deployment configuration: ${missing.join('; ')}. Add the missing variables in Vercel Settings > Environment Variables for this deployment environment, then redeploy. A publishable/anon key cannot replace a server credential.`)
  }

  const root = new URL('/rest/v1/', databaseUrl)
  // Modern secret keys are not JWTs. Legacy service-role keys also need Bearer.
  const headers: Record<string, string> = { apikey: serviceKey }
  if (!serviceKey.startsWith('sb_secret_')) headers.Authorization = `Bearer ${serviceKey}`
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
