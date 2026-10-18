import 'server-only'
import { requireDatabase } from './index'
import { databaseError } from '@/lib/errors'

let schema: Promise<boolean> | undefined

/** Detect the original schema with an empty query; never inspect another user's CV. */
export function usesLegacySchema(): Promise<boolean> {
  if (!schema) {
    schema = (async () => {
      const { error } = await requireDatabase().from('cvs').select('revision,draft_data').limit(0)
      if (!error) return false
      if (error.code === '42703' || error.code === 'PGRST204') return true
      databaseError(error)
    })().catch(error => { schema = undefined; throw error })
  }
  return schema
}
