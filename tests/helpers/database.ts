import { PGlite } from '@electric-sql/pglite'
import { readFile } from 'node:fs/promises'

export async function createTestDatabase(options: { legacy?: boolean } = {}) {
  const db = await PGlite.create()
  await db.exec('CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;')
  // uuid-ossp is only enabled (never used) by 001; PostgreSQL's core UUID
  // function is available. PGlite does not ship that optional extension.
  const bootstrap = (await readFile('scripts/001-create-tables.sql', 'utf8')).replace('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";', '')
  await db.exec(bootstrap)
  for (const name of options.legacy ? ['002-add-plan-tier.sql'] : ['002-add-plan-tier.sql', '003-security-and-drafts.sql', '004-photo-assets.sql']) {
    await db.exec(await readFile(`scripts/${name}`, 'utf8'))
  }
  // Test only: reproduce the existing project's browser-role grants, without
  // modifying any deployed database or granting access in migration scripts.
  if (options.legacy) await db.exec('GRANT USAGE ON SCHEMA public TO anon; GRANT ALL ON ALL TABLES IN SCHEMA public TO anon;')
  return db
}
