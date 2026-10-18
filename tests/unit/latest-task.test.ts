import { test } from 'node:test'
import assert from 'node:assert/strict'
import { setTimeout as delay } from 'node:timers/promises'
import { LatestTask } from '../../lib/latest-task'

test('slow compilations serialize, intermediate edits disappear and stale failures stay hidden',async () => {
  let active=0,maximum=0
  const started:string[]=[],results:string[]=[],failures:unknown[]=[]
  const releases=new Map<string,() => void>()
  const queue=new LatestTask<string,string>(async input => {
    started.push(input); active++; maximum=Math.max(maximum,active)
    await new Promise<void>(resolve => releases.set(input,resolve))
    active--
    if (input==='old') throw new Error('Obsolete PDF overflow')
    return input
  },result => results.push(result),error => failures.push(error))
  queue.schedule('old',0); await delay(10)
  queue.schedule('intermediate',0); await delay(10)
  queue.schedule('latest',0); await delay(10)
  releases.get('old')!(); await delay(10)
  assert.deepEqual(started,['old','latest'])
  releases.get('latest')!(); await delay(10)
  assert.equal(maximum,1); assert.deepEqual(results,['latest']); assert.deepEqual(failures,[])
  queue.dispose()
})

test('leaving the preview discards pending work and callbacks from active work',async () => {
  let release!:() => void
  const results:string[]=[]
  const queue=new LatestTask<string,string>(async input => {
    await new Promise<void>(resolve => { release=resolve }); return input
  },result => results.push(result),() => assert.fail('No obsolete error'))
  queue.schedule('active',0); await delay(10)
  queue.schedule('pending',0); queue.dispose(); release(); await delay(10)
  assert.deepEqual(results,[])
})
