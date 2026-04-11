import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { DocumentType, DocumentStatus } from '@prisma/client'

const createSchema = z.object({
  shipmentId:        z.string().cuid(),
  type:              z.nativeEnum(DocumentType),
  name:              z.string().min(1),
  notes:             z.string().optional(),
  isRequired:        z.boolean().default(true),
  isVisibleToClient: z.boolean().default(false),
})

export async function GET(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  const shipmentId = new URL(req.url).searchParams.get('shipmentId') ?? undefined
  const status     = new URL(req.url).searchParams.get('status')     ?? undefined

  const docs = await prisma.document.findMany({
    where: {
      ...(shipmentId && { shipmentId }),
      ...(status     && { status: status as DocumentStatus }),
      shipment: { organizationId: user.organizationId },
    },
    orderBy: { createdAt: 'desc' },
    include: { shipment: { select: { id: true, referenceNo: true } } },
  })

  return NextResponse.json({ success: true, data: docs })
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  try {
    const parsed = createSchema.parse(await req.json())

    const shipment = await prisma.shipment.findFirst({
      where: { id: parsed.shipmentId, organizationId: user.organizationId },
    })
    if (!shipment) return NextResponse.json({ success: false, error: 'Shipment tidak ditemukan' }, { status: 404 })

    const existing = await prisma.document.findFirst({
      where: { shipmentId: parsed.shipmentId, type: parsed.type },
      orderBy: { version: 'desc' },
    })
    const version = (existing?.version ?? 0) + 1

    const doc = await prisma.document.create({
      data: { ...parsed, version, status: DocumentStatus.PENDING, uploadedById: user.id },
    })

    return NextResponse.json({ success: true, data: doc }, { status: 201 })
  } catch (e) {
    if (e instanceof z.ZodError) return NextResponse.json({ success: false, error: e.errors[0].message }, { status: 400 })
    return NextResponse.json({ success: false, error: 'Kesalahan server' }, { status: 500 })
  }
}
