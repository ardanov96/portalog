// ─── Cloudflare R2 Storage Helper ────────────────────────────────────────────
// Menggunakan AWS S3-compatible API — R2 kompatibel 100% dengan SDK S3
//
// Setup R2:
// 1. Buka dash.cloudflare.com → R2 → Create bucket "forwarder-docs"
// 2. Account → R2 → Manage API Tokens → Create token (Object Read & Write)
// 3. Copy endpoint dari bucket settings
// 4. Isi .env:
//    STORAGE_ENDPOINT="https://<accountid>.r2.cloudflarestorage.com"
//    STORAGE_ACCESS_KEY="..."
//    STORAGE_SECRET_KEY="..."
//    STORAGE_BUCKET="forwarder-docs"
//    STORAGE_PUBLIC_URL="https://pub-xxx.r2.dev"  (kalau bucket public)
//
// Fallback: kalau env tidak di-set, file disimpan di /public/uploads (lokal dev)

import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

export type UploadResult = {
  url:      string   // URL publik / signed URL
  key:      string   // path di storage
  size:     number   // bytes
  mimeType: string
}

// ─── Utility ─────────────────────────────────────────────────────────────────

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

// ─── Cloudflare R2 uploader ───────────────────────────────────────────────────

async function uploadToR2(
  buffer: Buffer,
  key: string,
  mimeType: string,
): Promise<string> {
  const endpoint  = process.env.STORAGE_ENDPOINT!
  const accessKey = process.env.STORAGE_ACCESS_KEY!
  const secretKey = process.env.STORAGE_SECRET_KEY!
  const bucket    = process.env.STORAGE_BUCKET!

  // Gunakan AWS Signature v4 via fetch — tanpa SDK
  // (menghindari dependency besar @aws-sdk/client-s3)
  const { createHmac, createHash } = await import('crypto')

  const now    = new Date()
  const date   = now.toISOString().replace(/[:-]|\.\d{3}/g, '').slice(0, 15) + 'Z'
  const dateShort = date.slice(0, 8)
  const region = 'auto'
  const service = 's3'

  const url = `${endpoint}/${bucket}/${key}`

  const contentHash = createHash('sha256').update(buffer).digest('hex')

  const headers: Record<string, string> = {
    'Content-Type':        mimeType,
    'Content-Length':      String(buffer.length),
    'Host':                new URL(endpoint).host,
    'x-amz-content-sha256': contentHash,
    'x-amz-date':          date,
  }

  // Canonical request
  const signedHeaders = Object.keys(headers).sort().join(';')
  const canonicalHeaders = Object.keys(headers).sort().map(k => `${k}:${headers[k]}\n`).join('')
  const canonicalRequest = [
    'PUT',
    `/${bucket}/${key}`,
    '',
    canonicalHeaders,
    signedHeaders,
    contentHash,
  ].join('\n')

  // String to sign
  const credScope    = `${dateShort}/${region}/${service}/aws4_request`
  const stringToSign = ['AWS4-HMAC-SHA256', date, credScope, createHash('sha256').update(canonicalRequest).digest('hex')].join('\n')

  // Signing key
  const sign = (key: string | Buffer, data: string) => createHmac('sha256', key).update(data).digest()
  const signingKey = sign(sign(sign(sign(`AWS4${secretKey}`, dateShort), region), service), 'aws4_request')
  const signature  = createHmac('sha256', signingKey).update(stringToSign).digest('hex')

  const authHeader = `AWS4-HMAC-SHA256 Credential=${accessKey}/${credScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`

  const res = await fetch(url, {
    method:  'PUT',
    headers: { ...headers, Authorization: authHeader },
    body: new Uint8Array(buffer),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`R2 upload failed: ${res.status} ${text}`)
  }

  // Return public URL
  const publicBase = process.env.STORAGE_PUBLIC_URL
  if (publicBase) return `${publicBase}/${key}`
  return `${endpoint}/${bucket}/${key}`
}

// ─── Local fallback uploader (development) ───────────────────────────────────

async function uploadToLocal(
  buffer: Buffer,
  key: string,
): Promise<string> {
  const uploadDir = join(process.cwd(), 'public', 'uploads')
  const filePath  = join(process.cwd(), 'public', key.replace('shipments/', 'uploads/'))
  const fileDir   = filePath.substring(0, filePath.lastIndexOf('/'))

  if (!existsSync(fileDir)) {
    await mkdir(fileDir, { recursive: true })
  }

  await writeFile(filePath, buffer)

  // Return URL yang bisa diakses via Next.js static
  return `/${key.replace('shipments/', 'uploads/')}`
}

// ─── Delete from R2 ──────────────────────────────────────────────────────────

async function deleteFromR2(key: string): Promise<void> {
  const endpoint  = process.env.STORAGE_ENDPOINT!
  const accessKey = process.env.STORAGE_ACCESS_KEY!
  const secretKey = process.env.STORAGE_SECRET_KEY!
  const bucket    = process.env.STORAGE_BUCKET!

  const { createHmac, createHash } = await import('crypto')
  const now      = new Date()
  const date     = now.toISOString().replace(/[:-]|\.\d{3}/g, '').slice(0, 15) + 'Z'
  const dateShort = date.slice(0, 8)
  const region   = 'auto'
  const emptyHash = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'

  const headers: Record<string, string> = {
    'Host':                new URL(endpoint).host,
    'x-amz-content-sha256': emptyHash,
    'x-amz-date':          date,
  }

  const signedHeaders      = Object.keys(headers).sort().join(';')
  const canonicalHeaders   = Object.keys(headers).sort().map(k => `${k}:${headers[k]}\n`).join('')
  const canonicalRequest   = ['DELETE', `/${bucket}/${key}`, '', canonicalHeaders, signedHeaders, emptyHash].join('\n')
  const credScope          = `${dateShort}/${region}/s3/aws4_request`
  const stringToSign       = ['AWS4-HMAC-SHA256', date, credScope, createHash('sha256').update(canonicalRequest).digest('hex')].join('\n')
  const sign               = (k: string | Buffer, d: string) => createHmac('sha256', k).update(d).digest()
  const signingKey         = sign(sign(sign(sign(`AWS4${secretKey}`, dateShort), region), 's3'), 'aws4_request')
  const signature          = createHmac('sha256', signingKey).update(stringToSign).digest('hex')
  const authHeader         = `AWS4-HMAC-SHA256 Credential=${accessKey}/${credScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`

  await fetch(`${endpoint}/${bucket}/${key}`, {
    method: 'DELETE',
    headers: { ...headers, Authorization: authHeader },
  })
}

// ─── Main exports ─────────────────────────────────────────────────────────────

const isR2Configured = () =>
  !!(process.env.STORAGE_ENDPOINT &&
     process.env.STORAGE_ACCESS_KEY &&
     process.env.STORAGE_SECRET_KEY &&
     process.env.STORAGE_BUCKET)

export async function uploadFile(
  file: File | Buffer,
  options: {
    shipmentId: string
    originalName: string
    mimeType?: string
  },
): Promise<UploadResult> {
  const buffer   = file instanceof File ? Buffer.from(await file.arrayBuffer()) : file
  const mime     = options.mimeType ?? (file instanceof File ? file.type : 'application/octet-stream')
  const key      = generateKey(options.shipmentId, options.originalName)
  const size     = buffer.length

  let url: string
  if (isR2Configured()) {
    url = await uploadToR2(buffer, key, mime)
  } else {
    console.warn('[STORAGE] R2 tidak dikonfigurasi — menggunakan penyimpanan lokal')
    url = await uploadToLocal(buffer, key)
  }

  return { url, key, size, mimeType: mime }
}

export async function deleteFile(key: string): Promise<void> {
  if (!isR2Configured()) {
    // Local: hapus file dari public/uploads
    try {
      const { unlink } = await import('fs/promises')
      const filePath   = join(process.cwd(), 'public', key.replace('shipments/', 'uploads/'))
      await unlink(filePath)
    } catch { /* file mungkin tidak ada */ }
    return
  }
  await deleteFromR2(key)
}

export function isStorageConfigured(): boolean {
  return isR2Configured()
}

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
  if (mimeType === 'application/pdf')       return 'pdf'
  if (mimeType.startsWith('image/'))        return 'image'
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return 'excel'
  if (mimeType.includes('word'))            return 'word'
  return 'file'
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024)        return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
