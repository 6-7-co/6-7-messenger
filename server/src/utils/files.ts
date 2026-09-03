import { createHash } from 'node:crypto'
import { randomUUID } from 'node:crypto'
import { promises as fs } from 'node:fs'

const ALLOWED_IMAGE_MIME = new Set(['image/png', 'image/jpeg', 'image/gif', 'image/webp'])

export function detectImageMime(buffer: Buffer): string | null {
  if (buffer.length < 4) return null
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) return 'image/png'
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'image/jpeg'
  if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x38) return 'image/gif'
  if (buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46) return 'image/webp'
  return null
}

export function extensionForMime(mime: string): string {
  switch (mime) {
    case 'image/png':
      return 'png'
    case 'image/jpeg':
      return 'jpg'
    case 'image/gif':
      return 'gif'
    case 'image/webp':
      return 'webp'
    default:
      return 'bin'
  }
}

export function isAllowedImageMime(mime: string): boolean {
  return ALLOWED_IMAGE_MIME.has(mime)
}

export async function saveImage(uploadDir: string, buffer: Buffer): Promise<{ url: string; mimeType: string; size: number }> {
  const detected = detectImageMime(buffer)
  if (!detected || !isAllowedImageMime(detected)) {
    throw new Error('UNSUPPORTED_FILE_TYPE')
  }

  const ext = extensionForMime(detected)
  const id = randomUUID()
  const filename = `${id}.${ext}`
  const targetDir = uploadDir
  const target = `${targetDir}/${filename}`

  await fs.mkdir(targetDir, { recursive: true })
  await fs.writeFile(target, buffer, { flag: 'wx' })

  return {
    url: `/uploads/${filename}`,
    mimeType: detected,
    size: buffer.byteLength
  }
}

export function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex')
}
