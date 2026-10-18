import { test } from 'node:test'
import assert from 'node:assert/strict'
import { canReplaceAISummary, canReplaceAIExperience } from '../../lib/ai/editor-guards'
import { renderFixture } from '../fixtures/render'

test('late AI responses cannot replace manually edited or deleted fields',() => {
  const source=renderFixture()
  assert.equal(canReplaceAISummary(source,source,'Proposed wording'),true)
  assert.equal(canReplaceAISummary({ ...source,summary:'My newer wording' },source,'Proposed wording'),false)
  const job=source.experience[0]
  assert.equal(canReplaceAIExperience(source,source,job.id,['Proposed bullet']),true)
  assert.equal(canReplaceAIExperience({ ...source,experience:[] },source,job.id,['Proposed bullet']),false)
  const current={ ...source,experience:[{ ...job,bullets:['Manual change'] }] }
  assert.equal(canReplaceAIExperience(current,source,job.id,['Proposed bullet']),false)
  // Applying a summary does not disable independent experience suggestions.
  assert.equal(canReplaceAIExperience({ ...source,summary:'Applied summary' },source,job.id,['Proposed bullet']),true)
})
