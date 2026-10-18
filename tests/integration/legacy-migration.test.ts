import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { createTestDatabase } from '../helpers/database'
import { createEmptyCVData } from '../../lib/types/cv'

test('optional migration preserves compatibility drafts, frozen public copies and original template history', async () => {
  const db = await createTestDatabase({ legacy: true })
  try {
    const original = { ...createEmptyCVData(), summary: 'Original history' }
    const draft = { ...original, summary: 'Private working draft', _cvBuilder: { revision: 4, title: 'Private title', templateId: 'tech', originalTemplateId: 'classic' } }
    const published = { ...original, summary: 'Frozen public summary', _cvBuilder: { title: 'Published title', templateId: 'elegant' } }
    await db.exec("INSERT INTO users(id,email) VALUES ('owner','legacy@example.invalid'); INSERT INTO cvs(id,user_id,title,template_id,is_public,share_token) VALUES ('cv','owner','Private title','tech',true,'original-share-token');")
    for (const [id, version, data] of [['history', 1, original], ['draft', 0, draft], ['published', -1, published]] as const) {
      await db.query('INSERT INTO cv_versions(id,cv_id,version,data,created_by) VALUES ($1,$2,$3,$4,$5)', [id, 'cv', version, JSON.stringify(data), 'owner'])
    }
    await db.exec("UPDATE cvs SET current_version_id='history' WHERE id='cv';")
    await db.exec(await readFile('scripts/003-security-and-drafts.sql', 'utf8'))
    await db.exec(await readFile('scripts/004-photo-assets.sql', 'utf8'))
    const cv = (await db.query<{ draft_data: { summary: string }; published_data: { summary: string }; published_title: string; published_template_id: string }>('SELECT draft_data,published_data,published_title,published_template_id FROM cvs')).rows[0]
    assert.equal(cv.draft_data.summary, 'Private working draft')
    assert.equal(cv.published_data.summary, 'Frozen public summary')
    assert.equal(cv.published_title, 'Published title')
    assert.equal(cv.published_template_id, 'elegant')
    const history = (await db.query<{ data: unknown; template_id: string }>("SELECT data,template_id FROM cv_versions WHERE id='history'")).rows[0]
    assert.deepEqual(history.data, original)
    assert.equal(history.template_id, 'classic')
  } finally { await db.close() }
})
