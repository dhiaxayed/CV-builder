import 'server-only'
import { requireDatabase } from '@/lib/db'
import { AppError, databaseError } from '@/lib/errors'

export async function photoDataForOwner(url: string | undefined, userId: string): Promise<string | undefined> {
  if (!url || url.startsWith('data:image/')) return url || undefined
  const id = url.match(/^\/api\/photos\/([A-Za-z0-9_-]+)$/)?.[1]
  if (!id) throw new AppError(400, 'INVALID_PHOTO', 'Use a photo uploaded to your account.')
  const { data, error } = await requireDatabase().from('uploaded_files').select('storage_url').eq('id',id).eq('user_id',userId).eq('file_type','photo').maybeSingle()
  if (error) databaseError(error)
  if (!data) throw new AppError(400, 'INVALID_PHOTO', 'The photo is not available in your account.')
  return data.storage_url as string
}
