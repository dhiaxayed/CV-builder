// Test-only PostgREST subset backed by real PostgreSQL (PGlite). This process is
// never imported by the application and never connects to a live database.
// Only the explicit live-AI runner may pass a provider key; all data stays synthetic.
import { createServer } from 'node:http'
import { spawn } from 'node:child_process'
import { createTestDatabase } from './database'

async function main() {
const modernKey = process.env.E2E_DATABASE_KEY_TYPE === 'secret'
const serviceKey = modernKey ? 'sb_secret_isolated-test-key' : 'isolated-test-service-key'
const db = await createTestDatabase()
const identifier = (value: string) => {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(value)) throw new Error('Invalid test SQL identifier')
  return `"${value}"`
}
const server = createServer(async (request,response) => {
  response.setHeader('Content-Type','application/json')
  try {
    const url = new URL(request.url || '/', 'http://127.0.0.1:3002')
    const chunks = []
    for await (const chunk of request) chunks.push(chunk)
    const text = Buffer.concat(chunks).toString('utf8')
    const body = text ? JSON.parse(text) : {}
    if (url.pathname === '/__test/pro' && request.method === 'POST') {
      await db.query("UPDATE users SET plan_tier='pro' WHERE email=$1",[body.email])
      response.end('{"success":true}'); return
    }
    if (url.pathname === '/__test/expire' && request.method === 'POST') {
      await db.query("UPDATE sessions SET expires_at=now()-interval '1 second' WHERE user_id IN (SELECT id FROM users WHERE email=$1)",[body.email])
      response.end('{"success":true}'); return
    }
    if (request.headers.apikey !== serviceKey || (!modernKey && request.headers.authorization !== `Bearer ${serviceKey}`)) { response.statusCode=403; response.end('{"message":"permission denied"}'); return }
    const segments = url.pathname.split('/').filter(Boolean)
    const rows = await db.transaction(async tx => {
      await tx.exec('SET LOCAL ROLE service_role')
      if (segments[2] === 'rpc') {
        const keys = Object.keys(body)
        const query = `SELECT public.${identifier(segments[3])}(${keys.map((key,i) => `${identifier(key)} := $${i+1}`).join(',')}) AS value`
        return { rpc:true,value:(await tx.query<{ value:unknown }>(query,Object.values(body))).rows[0].value }
      }
      const table = segments[2]
      if (!table) throw new Error('Missing table')
      const parameters: unknown[] = []
      const param = (value:unknown) => { parameters.push(value); return `$${parameters.length}` }
      const filters: string[] = []
      for (const [key,value] of url.searchParams) {
        if (['select','order','limit','on_conflict'].includes(key)) continue
        let column = key.includes('->') ? '' : identifier(key)
        if (key.includes('->')) {
          const [base,first,second] = key.split(/->>?/)
          column = `${identifier(base)}->'${first.replace(/[^a-zA-Z0-9_]/g,'')}'->>'${second.replace(/[^a-zA-Z0-9_]/g,'')}'`
        }
        const dot = value.indexOf('.')
        const op = value.slice(0,dot)
        const operand = value.slice(dot+1)
        const comparison: Record<string,string> = { eq:'=',gt:'>',gte:'>=',lt:'<',lte:'<=',neq:'<>' }
        if (op === 'is' && operand === 'null') filters.push(`${column} IS NULL`)
        else if (comparison[op]) filters.push(`${column} ${comparison[op]} ${param(operand)}`)
        else throw new Error(`Unsupported test filter ${op}`)
      }
      const where = filters.length ? ` WHERE ${filters.join(' AND ')}` : ''
      const select = url.searchParams.get('select') || '*'
      const selection = select === '*' ? '*' : select.includes('users!inner') ? 'jsonb_build_object(\'id\',users.id,\'email\',users.email,\'name\',users.name,\'photo_url\',users.photo_url,\'plan_tier\',users.plan_tier,\'preferences\',users.preferences) AS users' : select.split(',').map(field => field.startsWith('draft_name:') ? `draft_data->'basics'->>'name' AS draft_name` : field.startsWith('draft_title:') ? `draft_data->'basics'->>'title' AS draft_title` : identifier(field)).join(',')
      let sql: string
      if (request.method === 'GET' || request.method === 'HEAD') {
        let from = `public.${identifier(table)}`
        if (select.includes('users!inner')) from += ' JOIN users ON users.id=sessions.user_id'
        sql = `SELECT ${selection} FROM ${from}${where}`
        const order = url.searchParams.get('order')
        if (order) { const [column,direction] = order.split('.'); sql += ` ORDER BY ${identifier(column)} ${direction === 'desc' ? 'DESC' : 'ASC'}` }
        const limit = url.searchParams.get('limit')
        if (limit) sql += ` LIMIT ${Math.min(100,Math.max(0,Number(limit)))}`
      } else if (request.method === 'POST') {
        const record = Array.isArray(body) ? body[0] : body
        const columns = Object.keys(record)
        sql = `INSERT INTO public.${identifier(table)}(${columns.map(identifier).join(',')}) VALUES(${columns.map(key => param(record[key])).join(',')})`
        if (url.searchParams.get('on_conflict')) sql += ` ON CONFLICT(${identifier(url.searchParams.get('on_conflict')!)}) DO NOTHING`
        sql += ' RETURNING *'
      } else if (request.method === 'PATCH') {
        sql = `UPDATE public.${identifier(table)} SET ${Object.keys(body).map(key => `${identifier(key)}=${param(body[key])}`).join(',')}${where} RETURNING *`
      } else if (request.method === 'DELETE') sql = `DELETE FROM public.${identifier(table)}${where} RETURNING *`
      else throw new Error('Unsupported test method')
      return { rpc:false,value:(await tx.query(sql,parameters)).rows }
    })
    if (rows.rpc) { response.end(JSON.stringify(rows.value)); return }
    const result = rows.value as unknown[]
    if (String(request.headers.accept).includes('application/vnd.pgrst.object+json')) {
      if (result.length !== 1) { response.statusCode=406; response.end(JSON.stringify({ code:'PGRST116',message:'Expected one row',details:`The result contains ${result.length} rows` })); return }
      response.end(JSON.stringify(result[0])); return
    }
    response.end(JSON.stringify(result))
  } catch (error) {
    response.statusCode=400
    response.end(JSON.stringify({ code:'TEST_DATABASE_ERROR',message:error instanceof Error ? error.message : 'Test query failed' }))
  }
})
server.listen(3002,'127.0.0.1',() => console.log('Isolated test database ready'))
const child = spawn(process.execPath,['node_modules/next/dist/bin/next',process.env.E2E_PRODUCTION === '1' ? 'start' : 'dev','--hostname','127.0.0.1','--port','3001'],{
  stdio:'inherit',windowsHide:true,
  env:{ ...process.env,SUPABASE_URL:'http://127.0.0.1:3002',NEXT_PUBLIC_SUPABASE_URL:'http://127.0.0.1:3002',SUPABASE_SECRET_KEY:modernKey ? serviceKey : '',SUPABASE_SERVICE_ROLE_KEY:modernKey ? '' : serviceKey,NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY:'isolated-public-key',NEXT_PUBLIC_APP_URL:'http://127.0.0.1:3001',EMAIL_PROVIDER:'console',GROQ_API_KEY:process.env.E2E_LIVE_AI === '1' ? process.env.GROQ_API_KEY || '' : '',OPENROUTER_API_KEY:process.env.E2E_LIVE_AI === '1' ? process.env.OPENROUTER_API_KEY || '' : '',LATEX_RENDERER:process.env.LATEX_RENDERER || 'system',NEXT_TELEMETRY_DISABLED:'1' },
})
const stop = async () => { child.kill(); server.close(); await db.close(); process.exit() }
process.on('SIGINT',stop); process.on('SIGTERM',stop)
child.on('exit',code => { server.close(); void db.close().then(() => process.exit(code || 0)) })

}
main().catch(error => { console.error(error); process.exitCode = 1 })
