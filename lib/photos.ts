export function imageSignature(buffer: Uint8Array): 'jpeg' | 'png' | 'webp' | null {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'jpeg'
  if (buffer.length >= 8 && [137,80,78,71,13,10,26,10].every((value, index) => buffer[index] === value)) return 'png'
  if (buffer.length >= 12 && String.fromCharCode(...buffer.slice(0,4)) === 'RIFF' && String.fromCharCode(...buffer.slice(8,12)) === 'WEBP') return 'webp'
  return null
}
// Keep multipart requests below Vercel's 4.5 MB function payload limit.
export const MAX_PHOTO_BYTES = 4 * 1024 * 1024
