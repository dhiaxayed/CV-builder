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

/** Optional read-only diagnostic supporting the original and migrated schemas. */
export async function verifyDatabaseReadiness(env: DatabaseEnvironment, request: typeof fetch = fetch) {
  const databaseUrl = env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = serverDatabaseKey(env)
  if (!databaseUrl || !serviceKey) {
    const missing = [
      ...(!databaseUrl ? ['SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL'] : []),
      ...(!serviceKey ? ['SUPABASE_SECRET_KEY, SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY'] : []),
    ]
    throw new Error(`Missing deployment configuration: ${missing.join('; ')}. Configure the existing Supabase URL and key for this deployment environment.`)
  }

  const root = new URL('/rest/v1/', databaseUrl)
  // Modern secret keys are not JWTs. Legacy service-role keys also need Bearer.
  const headers: Record<string, string> = { apikey: serviceKey }
  if (!/^sb_(secret|publishable)_/.test(serviceKey)) headers.Authorization = `Bearer ${serviceKey}`
  // One deadline covers every request, including the metadata response body.
  const signal = AbortSignal.timeout(15_000)
  try {
    const readTable = async (table: string, columns: string) => {
      const endpoint = new URL(table, root)
      endpoint.searchParams.set('select', columns)
      endpoint.searchParams.set('limit', '0')
      const response = await request(endpoint, { headers, signal, cache: 'no-store', redirect: 'error' })
      if (!response.ok) {
        const body = await response.json() as { code?: string }
        return body.code || 'UNAVAILABLE'
      }
      await response.body?.cancel()
      return null
    }
    const probe = await readTable('cvs', requiredTables.cvs)
    if (probe === '42703' || probe === 'PGRST204') {
      for (const [table, columns] of Object.entries({ cvs: 'id,current_version_id', cv_versions: 'id,cv_id,version,data', users: 'id,plan_tier' })) {
        if (await readTable(table, columns)) throw new Error(`Required database schema is unavailable: ${table}.`)
      }
      return { schema: 'legacy' as const }
    }
    if (probe) throw new Error('Required database schema is unavailable: cvs.')
    await Promise.all(Object.entries(requiredTables).filter(([table]) => table !== 'cvs').map(async ([table, columns]) => {
      if (await readTable(table, columns)) throw new Error(`Required database schema is unavailable: ${table}.`)
    }))

    const response = await request(root, {
      headers: { ...headers, Accept: 'application/openapi+json' }, signal, cache: 'no-store', redirect: 'error',
    })
    if (!response.ok) throw new Error('Database RPC metadata is unavailable; check PostgREST OpenAPI configuration.')
    const metadata = await response.json() as { paths?: Record<string, unknown> }
    const missing = requiredFunctions.filter(name => !metadata?.paths?.[`/rpc/${name}`])
    if (missing.length) throw new Error(`Required database functions are unavailable: ${missing.join(', ')}.`)
    return { schema: 'migrated' as const }
  } catch (error) {
    // Never print transport errors: they can include connection URLs/headers.
    const message = error instanceof Error && /^(Required database|Database RPC metadata)/.test(error.message)
      ? error.message : 'Database readiness could not be verified within the request deadline.'
    throw new Error(`${message} Verify the database configuration and permissions for the selected schema.`)
  }
}
