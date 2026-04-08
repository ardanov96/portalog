import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { ShipmentType, ShipmentMode } from '@prisma/client'

const createSchema = z.object({
  clientId:           z.string().cuid(),
  type:               z.nativeEnum(ShipmentType),
  mode:               z.nativeEnum(ShipmentMode),
  originCountry:      z.string().optional(),
  originPort:         z.string().optional(),
  destinationCountry: z.string().optional(),
  destinationPort:    z.string().optional(),
  cargoDescription:   z.string().optional(),
  grossWeight:        z.number().positive().optional(),
  volume:             z.number().positive().optional(),
  packageCount:       z.number().int().positive().optional(),
  hsCode:             z.string().optional(),
  vesselName:         z.string().optional(),
  voyageNo:           z.string().optional(),
  etd:                z.string().datetime().optional(),
  eta:                z.string().datetime().optional(),
  customsDeadline:    z.string().datetime().optional(),
  notes:              z.string().optional(),
})

export async function GET(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  const sp       = new URL(req.url).searchParams
  const status   = sp.get('status') ?? undefined
  const clientId = sp.get('clientId') ?? undefined
  const search   = sp.get('search') ?? undefined
  const page     = Math.max(1, Number(sp.get('page') ?? 1))
  const limit    = Math.min(50, Number(sp.get('limit') ?? 20))

  const where = {
    organizationId: user.organizationId,
    ...(status   && { status: status as any }),
    ...(clientId && { clientId }),
    ...(search   && {
      OR: [
        { referenceNo:       { contains: search, mode: 'insensitive' as const } },
        { cargoDescription:  { contains: search, mode: 'insensitive' as const } },
        { client: { name:    { contains: search, mode: 'insensitive' as const } } },
      ],
    }),
  }

  const [shipments, total] = await Promise.all([
    prisma.shipment.findMany({
      where, orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit, take: limit,
      select: {
        id: true, referenceNo: true, type: true, mode: true, status: true,
        originPort: true, destinationPort: true, eta: true, etd: true,
        cargoDescription: true, createdAt: true,
        client:     { select: { id: true, name: true, companyName: true } },
        assignedTo: { select: { id: true, name: true } },
        _count:     { select: { documents: true } },
      },
    }),
    prisma.shipment.count({ where }),
  ])

  return NextResponse.json({
    success: true, data: shipments,
    meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
  })
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  try {
    const parsed = createSchema.parse(await req.json())

    const client = await prisma.client.findFirst({
      where: { id: parsed.clientId, organizationId: user.organizationId },
    })
    if (!client) return NextResponse.json({ success: false, error: 'Client tidak ditemukan' }, { status: 404 })

    const year   = new Date().getFullYear()
    const count  = await prisma.shipment.count({ where: { organizationId: user.organizationId } })
    const refNo  = `FF-${year}-${String(count + 1).padStart(3, '0')}`

    const shipment = await prisma.shipment.create({
      data: {
        organizationId: user.organizationId,
        assignedToId:   user.id,
        referenceNo:    refNo,
        ...parsed,
        etd:             parsed.etd ? new Date(parsed.etd) : undefined,
        eta:             parsed.eta ? new Date(parsed.eta) : undefined,
        customsDeadline: parsed.customsDeadline ? new Date(parsed.customsDeadline) : undefined,
      },
      include: {
        client:     { select: { id: true, name: true, companyName: true } },
        assignedTo: { select: { id: true, name: true } },
      },
    })

    await prisma.activityLog.create({
      data: {
        shipmentId:  shipment.id,
        userId:      user.id,
        action:      'shipment.created',
        description: `Shipment ${refNo} dibuat untuk ${client.name}`,
      },
    })

    return NextResponse.json({ success: true, data: shipment }, { status: 201 })
  } catch (e) {
    if (e instanceof z.ZodError) return NextResponse.json({ success: false, error: e.errors[0].message }, { status: 400 })
    console.error('[SHIPMENTS POST]', e)
    return NextResponse.json({ success: false, error: 'Kesalahan server' }, { status: 500 })
  }
}
