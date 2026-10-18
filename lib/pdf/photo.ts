import sharp from 'sharp'
import { AppError } from '@/lib/errors'

/** The same centre crop as the editor avatar, with real transparency in PDFs. */
export async function circularPhoto(photoData:string):Promise<Buffer> {
  const match=photoData.match(/^data:image\/(?:png|jpeg|webp);base64,([A-Za-z0-9+/=]+)$/)
  if (!match || match[1].length>7000000) throw new AppError(400,'INVALID_PHOTO','Unable to render the CV photo.')
  try {
    return await sharp(Buffer.from(match[1],'base64'),{ animated:false,limitInputPixels:16000000 })
      .rotate().resize(256,256,{ fit:'cover',position:'centre' }).ensureAlpha()
      .composite([{ input:Buffer.from('<svg width="256" height="256"><circle cx="128" cy="128" r="128" fill="white"/></svg>'),blend:'dest-in' }])
      .png().toBuffer()
  } catch { throw new AppError(400,'INVALID_PHOTO','Unable to render the CV photo.') }
}
