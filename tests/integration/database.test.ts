import { after, before, test } from 'node:test'
import assert from 'node:assert/strict'
import { createTestDatabase } from '../helpers/database'
import { createSampleCVData } from '../../lib/types/cv'

let db: Awaited<ReturnType<typeof createTestDatabase>>
const fixture = createSampleCVData()
async function call<T = Record<string, unknown>>(name: string, args: unknown[]) {
  const result = await db.query<{ value: T }>(`SELECT public.${name}(${args.map((_, i) => `$${i + 1}`).join(',')}) AS value`, args)
  return result.rows[0].value
}
before(async () => {
  db = await createTestDatabase()
  await db.exec("INSERT INTO users(id,email,plan_tier) VALUES ('a','a@test.invalid','pro'),('b','b@test.invalid','pro'),('free','free@test.invalid','free');")
})
after(async () => { await db?.close() })

test('browser roles cannot read any private table or execute privileged RPCs', async () => {
  const result = await db.query<{ table_name: string; rls: boolean; readable: boolean }>(`SELECT c.relname AS table_name,c.relrowsecurity AS rls,has_table_privilege('anon',c.oid,'SELECT') OR has_table_privilege('authenticated',c.oid,'SELECT') AS readable FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind='r'`)
  assert.ok(result.rows.length >= 11)
  for (const row of result.rows) { assert.equal(row.rls, true, row.table_name); assert.equal(row.readable, false, row.table_name) }
  const functions = await db.query<{ accessible: boolean }>(`SELECT has_function_privilege('anon',p.oid,'EXECUTE') OR has_function_privilege('authenticated',p.oid,'EXECUTE') AS accessible FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname IN ('create_cv_atomic','save_cv_draft','snapshot_cv','restore_cv','consume_magic_token','save_photo','publish_cv','take_rate_limit')`)
  assert.equal(functions.rows.length, 8)
  assert.ok(functions.rows.every(row => !row.accessible))
  await db.exec('SET ROLE anon')
  await assert.rejects(db.query('SELECT * FROM users'), /permission denied/)
  await db.exec('RESET ROLE')
})

test('magic token is consumed once; expired and replayed tokens fail', async () => {
  await db.exec("INSERT INTO auth_tokens(email,token,expires_at) VALUES ('a@test.invalid','once',now()+interval '1 minute'),('a@test.invalid','expired',now()-interval '1 second')")
  const results = await Promise.all([call('consume_magic_token', ['once']), call('consume_magic_token', ['once'])])
  assert.equal(results.filter(Boolean).length, 1)
  assert.equal(await call('consume_magic_token', ['expired']), null)
  assert.equal(await call('consume_magic_token', ['missing']), null)
})

test('free creation is atomic and concurrent requests cannot exceed one CV', async () => {
  const results = await Promise.allSettled([call('create_cv_atomic', ['free','First','modern',fixture]), call('create_cv_atomic', ['free','Second','classic',fixture])])
  assert.equal(results.filter(result => result.status === 'fulfilled').length, 1)
  const count = await db.query<{ count: number }>("SELECT count(*)::int AS count FROM cvs WHERE user_id='free'")
  assert.equal(count.rows[0].count, 1)
  await assert.rejects(call('create_cv_atomic', ['b','Invalid','nonexistent',fixture]), /foreign key/)
  const partial = await db.query("SELECT * FROM cvs WHERE title='Invalid'")
  assert.equal(partial.rows.length, 0)
})

test('V1/V2/V3 survive restore, edits, and V4; optimistic saves reject stale revisions', async () => {
  const cv = await call<{ id: string; current_version_id: string }>('create_cv_atomic', ['a','History','modern',fixture])
  const v1 = cv.current_version_id
  const draft2 = { ...fixture, summary: 'Draft two' }
  await call('save_cv_draft', [cv.id,'a',0,draft2,null,null])
  const v2 = await call<{ version: { id: string }; revision: number }>('snapshot_cv', [cv.id,'a',1,'V2'])
  await call('save_cv_draft', [cv.id,'a',v2.revision,{ ...fixture, summary: 'Draft three' },null,null])
  const v3 = await call<{ version: { id: string }; revision: number }>('snapshot_cv', [cv.id,'a',3,'V3'])
  const restored = await call<{ revision: number }>('restore_cv', [cv.id,'a',v1,v3.revision])
  await call('save_cv_draft', [cv.id,'a',restored.revision,{ ...fixture, summary: 'New branch' },null,'tech'])
  const v4 = await call<{ version: { version: number; data: { summary: string } } }>('snapshot_cv', [cv.id,'a',6,'V4'])
  assert.equal(v4.version.version, 4)
  assert.equal(v4.version.data.summary, 'New branch')
  const history = await db.query<{ version: number; data: { summary: string } }>('SELECT version,data FROM cv_versions WHERE cv_id=$1 ORDER BY version',[cv.id])
  assert.deepEqual(history.rows.slice(0,3).map(row => row.data.summary), [fixture.summary,'Draft two','Draft three'])
  await assert.rejects(db.query("UPDATE cv_versions SET data='{}' WHERE id=$1",[v1]), /IMMUTABLE_CV_VERSION/)
  await assert.rejects(call('save_cv_draft',[cv.id,'a',0,fixture,null,null]), /REVISION_CONFLICT/)
  await assert.rejects(call('restore_cv',[cv.id,'b',v1,7]), /CV_NOT_FOUND/)
  const other = await call<{ id: string }>('create_cv_atomic',['b','Other','classic',fixture])
  await assert.rejects(call('restore_cv',[other.id,'b',v1,0]), /VERSION_NOT_FOUND/)
  const concurrent = await Promise.allSettled([call('snapshot_cv',[cv.id,'a',7,'C1']),call('snapshot_cv',[cv.id,'a',7,'C2'])])
  assert.equal(concurrent.filter(result => result.status === 'fulfilled').length,1)
  await db.query('DELETE FROM cvs WHERE id=$1',[cv.id])
  assert.equal((await db.query('SELECT id FROM cv_versions WHERE cv_id=$1',[cv.id])).rows.length,0)
})

test('publishing freezes intended content, repeated activation is stable, revocation destroys the link', async () => {
  const cv = await call<{ id: string }>('create_cv_atomic',['a','Published','elegant',fixture])
  assert.equal(await call('publish_cv',[cv.id,'a',true,'token-first']), 'token-first')
  await call('save_cv_draft',[cv.id,'a',0,{ ...fixture, summary: 'PRIVATE DRAFT' },null,null])
  assert.equal(await call('publish_cv',[cv.id,'a',true,'token-second']), 'token-first')
  const rows = await db.query<{ summary: string }>("SELECT published_data->>'summary' AS summary FROM cvs WHERE id=$1",[cv.id])
  assert.equal(rows.rows[0].summary, fixture.summary)
  await assert.rejects(call('publish_cv',[cv.id,'b',false,'bad']), /CV_NOT_FOUND/)
  assert.equal(await call('publish_cv',[cv.id,'a',false,'ignored']), null)
  assert.equal((await db.query("SELECT id FROM cvs WHERE share_token='token-first' AND is_public")).rows.length,0)
  assert.equal(await call('publish_cv',[cv.id,'a',true,'token-third']), 'token-third')
})

test('photo persistence rolls back on conflicts and stores only a reference in snapshots', async () => {
  const cv = await call<{ id: string }>('create_cv_atomic',['a','Photo','modern',fixture])
  const photoArgs = [cv.id,0,'photo-test','data:image/webp;base64,dGVzdA==','photo.webp',4]
  await assert.rejects(call('save_photo',['b','cv',...photoArgs]),/CV_NOT_FOUND/)
  const uploaded = await call<{ url: string; revision: number }>('save_photo',['a','cv',...photoArgs])
  assert.equal(uploaded.url,'/api/photos/photo-test')
  assert.equal(uploaded.revision,1)
  await assert.rejects(call('save_photo',['a','cv',cv.id,0,'orphan','data:image/webp;base64,dGVzdA==','bad.webp',4]),/REVISION_CONFLICT/)
  assert.equal((await db.query("SELECT id FROM uploaded_files WHERE id='orphan'")).rows.length,0)
  const snapshot = await call<{ version: { data: { basics: { photoUrl: string } } } }>('snapshot_cv',[cv.id,'a',1,'With photo'])
  assert.equal(snapshot.version.data.basics.photoUrl,uploaded.url)
})

test('distributed rate limit uses a shared atomic database counter', async () => {
  assert.deepEqual(await Promise.all([1,2,3].map(() => call('take_rate_limit',['key',2,60]))),[true,true,false])
})
