import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { uploadFile, ALLOWED_MIME_TYPES, MAX_FILE_SIZE } from '@/lib/storage'
import { DocumentType, DocumentStatus } from '@prisma/client'
import { z } from 'zod'

const metaSchema = z.object({
  shipmentId:        z.string().cuid(),
  documentType:      z.nativeEnum(DocumentType),
  name:              z.string().min(1).optional(),
  notes:             z.string().optional(),
  isVisibleToClient: z.string().optional().transform(v => v === 'true'),
})

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  try {
    const formData = await req.formData()
    const file     = formData.get('file') as File | null

    if (!file) return NextResponse.json({ success: false, error: 'File tidak ditemukan' }, { status: 400 })

    // Validasi ukuran
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ success: false, error: `Ukuran file maksimal ${MAX_FILE_SIZE / 1024 / 1024} MB` }, { status: 400 })
    }

    // Validasi tipe file
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json({
        success: false,
        error: 'Tipe file tidak didukung. Gunakan PDF, JPG, PNG, Excel, atau Word.',
      }, { status: 400 })
    }

    // Parse metadata dari form
    const rawMeta: Record<string, string> = {}
    for (const [key, value] of formData.entries()) {
      if (key !== 'file' && typeof value === 'string') rawMeta[key] = value
    }
    const meta = metaSchema.parse(rawMeta)

    // Verifikasi shipment milik org ini
    const shipment = await prisma.shipment.findFirst({
      where: { id: meta.shipmentId, organizationId: user.organizationId },
      select: { id: true, referenceNo: true },
    })
    if (!shipment) return NextResponse.json({ success: false, error: 'Shipment tidak ditemukan' }, { status: 404 })

    // Cek versi dokumen existing dengan tipe yang sama
    const existing = await prisma.document.findFirst({
      where: { shipmentId: meta.shipmentId, type: meta.documentType },
      orderBy: { version: 'desc' },
      select: { version: true },
    })
    const version = (existing?.version ?? 0) + 1

    // Upload ke storage
    const uploaded = await uploadFile(file, {
      shipmentId:   meta.shipmentId,
      originalName: file.name,
      mimeType:     file.type,
    })

    // Simpan ke database
    const docName  = meta.name || file.name.replace(/\.[^/.]+$/, '')
    const document = await prisma.document.create({
      data: {
        shipmentId:        meta.shipmentId,
        type:              meta.documentType,
        status:            DocumentStatus.UPLOADED,
        name:              docName,
        fileUrl:           uploaded.url,
        fileSize:          uploaded.size,
        mimeType:          file.type,
        version,
        notes:             meta.notes || null,
        isRequired:        false,
        isVisibleToClient: meta.isVisibleToClient ?? false,
        uploadedById:      user.id,
      },
    })

    // Activity log
    await prisma.activityLog.create({
      data: {
        shipmentId:  meta.shipmentId,
        userId:      user.id,
        action:      'document.uploaded',
        description: `Dokumen "${docName}" (${meta.documentType}) diunggah — v${version}`,
        metadata:    { fileSize: uploaded.size, mimeType: file.type },
      },
    })

    return NextResponse.json({ success: true, data: document }, { status: 201 })
  } catch (e) {
    if (e instanceof z.ZodError) return NextResponse.json({ success: false, error: e.errors[0].message }, { status: 400 })
    console.error('[UPLOAD]', e)
    return NextResponse.json({ success: false, error: 'Gagal mengupload file' }, { status: 500 })
  }
}

// GET /api/upload?shipmentId=xxx — list dokumen untuk shipment
export async function GET(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  const shipmentId = new URL(req.url).searchParams.get('shipmentId')
  if (!shipmentId) return NextResponse.json({ success: false, error: 'shipmentId wajib diisi' }, { status: 400 })

  const shipment = await prisma.shipment.findFirst({
    where: { id: shipmentId, organizationId: user.organizationId },
  })
  if (!shipment) return NextResponse.json({ success: false, error: 'Shipment tidak ditemukan' }, { status: 404 })

  const documents = await prisma.document.findMany({
    where: { shipmentId },
    orderBy: [{ type: 'asc' }, { version: 'desc' }],
  })

  return NextResponse.json({ success: true, data: documents })
}
