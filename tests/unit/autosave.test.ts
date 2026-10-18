import { test } from 'node:test'
import assert from 'node:assert/strict'
import { RevisionSaver } from '../../lib/autosave'
const deferred = () => { let resolve!: (revision: number) => void; const promise = new Promise<number>(done => { resolve = done }); return { promise, resolve } }

test('edits during a save remain dirty and writes serialize', async () => {
  const first = deferred()
  const calls: Array<[string,number]> = []
  const saver = new RevisionSaver('initial',0,async (data, revision) => { calls.push([data,revision]); return calls.length === 1 ? first.promise : revision + 1 })
  saver.change('one')
  const saving = saver.flush()
  await new Promise(resolve => setImmediate(resolve))
  saver.change('two')
  const second = saver.flush()
  assert.equal(saver.dirty,true)
  first.resolve(1)
  await Promise.all([saving,second])
  assert.deepEqual(calls,[['one',0],['two',1]])
  assert.equal(saver.dirty,false)
  assert.equal(saver.serverRevision,2)
})

test('failures preserve data and retry; conflicts block automatic overwrite', async () => {
  let fail = true
  const saver = new RevisionSaver('initial',0,async () => { if (fail) throw new Error('offline'); return 1 })
  saver.change('local work')
  await assert.rejects(saver.flush(),/offline/)
  assert.equal(saver.value,'local work'); assert.equal(saver.dirty,true); assert.equal(saver.status,'failed')
  fail = false
  await saver.flush()
  assert.equal(saver.status,'saved')
  const conflict = new RevisionSaver('initial',0,async () => { throw Object.assign(new Error('conflict'), { status: 409 }) })
  conflict.change('local')
  await assert.rejects(conflict.flush(),/conflict/)
  conflict.change('newer local')
  await assert.rejects(conflict.flush(),/conflict/)
  assert.equal(conflict.value,'newer local'); assert.equal(conflict.status,'conflict')
})

test('snapshots wait for autosave and subsequent edits use the snapshot revision', async () => {
  const saver = new RevisionSaver('initial',0,async (_data, revision) => revision + 1)
  saver.change('before snapshot')
  await saver.exclusive(async (data,revision) => {
    assert.equal(data,'before snapshot'); assert.equal(revision,1)
    saver.change('during snapshot')
    return { result: undefined, revision: 2 }
  })
  assert.equal(saver.dirty,true)
  await saver.flush()
  assert.equal(saver.serverRevision,3)
})

test('export holds a revision while newer typing queues for the next save',async () => {
  const release=deferred()
  const calls:Array<[string,number]>=[]
  const saver=new RevisionSaver('initial',0,async (value,revision) => { calls.push([value,revision]); return revision+1 })
  saver.change('exported draft')
  const exporting=saver.exclusive(async (snapshot,revision) => {
    assert.equal(snapshot,'exported draft'); assert.equal(revision,1)
    await release.promise
    assert.equal(saver.serverRevision,1)
    return { result:snapshot }
  })
  await new Promise(resolve => setImmediate(resolve))
  saver.change('typed during export')
  const saving=saver.flush()
  await new Promise(resolve => setImmediate(resolve))
  assert.deepEqual(calls,[['exported draft',0]])
  release.resolve(1)
  assert.equal(await exporting,'exported draft')
  await saving
  assert.deepEqual(calls,[['exported draft',0],['typed during export',1]])
  assert.equal(saver.dirty,false)
})
