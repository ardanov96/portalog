import { writeFile, mkdir } from 'fs/promises'
import { join }             from 'path'
import { existsSync }       from 'fs'

// ─── Types ────────────────────────────────────────────────────────────────────

export type UploadResult = {
  url:      string   // URL publik permanen dari Vercel Blob
  key:      string   // path / pathname di storage
  size:     number   // bytes
  mimeType: string
}

// ─── Utility ──────────────────────────────────────────────────────────────────

function sanitizeFilename(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9.\-_]/g, '_')
    .replace(/_+/g, '_')
    .toLowerCase()
}

function generateKey(shipmentId: string, filename: string): string {
  const ts   = Date.now()
  const safe = sanitizeFilename(filename)
  return `shipments/${shipmentId}/${ts}_${safe}`
}

const isBlobConfigured = () => !!process.env.BLOB_READ_WRITE_TOKEN

// ─── Vercel Blob uploader ─────────────────────────────────────────────────────

async function uploadToBlob(
  buffer: Buffer,
  key: string,
  mimeType: string,
): Promise<string> {
  const { put } = await import('@vercel/blob')

  const blob = await put(key, buffer, {
    access:      'public',      // URL langsung bisa diakses tanpa signed URL
    contentType: mimeType,
    addRandomSuffix: false,     // key sudah unik karena ada timestamp
  })

  return blob.url
}

// ─── Vercel Blob delete ───────────────────────────────────────────────────────

async function deleteFromBlob(url: string): Promise<void> {
  const { del } = await import('@vercel/blob')
  await del(url)
}

// ─── Local fallback (development tanpa token) ─────────────────────────────────

async function uploadToLocal(buffer: Buffer, key: string): Promise<string> {
  const filePath = join(process.cwd(), 'public', key.replace('shipments/', 'uploads/'))
  const fileDir  = filePath.substring(0, filePath.lastIndexOf('/'))

  if (!existsSync(fileDir)) {
    await mkdir(fileDir, { recursive: true })
  }

  await writeFile(filePath, buffer)
  return `/${key.replace('shipments/', 'uploads/')}`
}

async function deleteFromLocal(key: string): Promise<void> {
  try {
    const { unlink } = await import('fs/promises')
    const filePath   = join(process.cwd(), 'public', key.replace('shipments/', 'uploads/'))
    await unlink(filePath)
  } catch { /* file mungkin sudah tidak ada */ }
}

// ─── Main exports ─────────────────────────────────────────────────────────────

export async function uploadFile(
  file: File | Buffer,
  options: {
    shipmentId:   string
    originalName: string
    mimeType?:    string
  },
): Promise<UploadResult> {
  const buffer = file instanceof File ? Buffer.from(await file.arrayBuffer()) : file
  const mime   = options.mimeType ?? (file instanceof File ? file.type : 'application/octet-stream')
  const key    = generateKey(options.shipmentId, options.originalName)
  const size   = buffer.length

  let url: string

  if (isBlobConfigured()) {
    url = await uploadToBlob(buffer, key, mime)
  } else {
    console.warn('[STORAGE] BLOB_READ_WRITE_TOKEN tidak di-set — menggunakan penyimpanan lokal')
    url = await uploadToLocal(buffer, key)
  }

  return { url, key, size, mimeType: mime }
}

export async function deleteFile(keyOrUrl: string): Promise<void> {
  if (!isBlobConfigured()) {
    await deleteFromLocal(keyOrUrl)
    return
  }

  // Vercel Blob delete menerima full URL (bukan key)
  // Kalau yang dipass adalah key (lama), skip — tidak bisa delete tanpa URL
  if (keyOrUrl.startsWith('https://')) {
    await deleteFromBlob(keyOrUrl)
  } else {
    console.warn('[STORAGE] deleteFile: perlu full blob URL, bukan key path:', keyOrUrl)
  }
}

export function isStorageConfigured(): boolean {
  return isBlobConfigured()
}

// ─── Constants (tidak berubah — kompatibel dengan route.ts yang ada) ──────────

export const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]

export const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB

export function getFileIcon(mimeType: string): string {
  if (mimeType === 'application/pdf')                                    return 'pdf'
  if (mimeType.startsWith('image/'))                                     return 'image'
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel'))   return 'excel'
  if (mimeType.includes('word'))                                         return 'word'
  return 'file'
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024)         return `${bytes} B`
  if (bytes < 1024 * 1024)  return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
