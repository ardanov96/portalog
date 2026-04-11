import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const createSchema = z.object({
  shipmentId:        z.string().cuid(),
  freightCost:       z.number().min(0).optional(),
  localCharges:      z.number().min(0).optional(),
  customsDuty:       z.number().min(0).optional(),
  otherCharges:      z.number().min(0).optional(),
  otherChargesLabel: z.string().optional(),
  discount:          z.number().min(0).optional(),
  taxPercent:        z.number().min(0).max(100).optional(),
  notes:             z.string().optional(),
  dueDate:           z.string().optional(),
  isPaid:            z.boolean().optional(),
})

// GET /api/invoices — list semua invoice org
export async function GET(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  const sp     = new URL(req.url).searchParams
  const isPaid = sp.get('isPaid')

  const shipments = await prisma.shipment.findMany({
    where: {
      organizationId: user.organizationId,
      invoiceNo:      { not: null },
      ...(isPaid !== null && { isPaid: isPaid === 'true' }),
    },
    orderBy: { invoiceDate: 'desc' },
    select: {
      id: true, referenceNo: true, invoiceNo: true, invoiceDate: true,
      isPaid: true, totalCost: true, freightCost: true, localCharges: true,
      customsDuty: true, status: true,
      client: { select: { id: true, name: true, companyName: true } },
    },
  })

  return NextResponse.json({ success: true, data: shipments })
}

// POST /api/invoices — generate invoice untuk shipment
export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  try {
    const body   = await req.json()
    const parsed = createSchema.parse(body)

    const shipment = await prisma.shipment.findFirst({
      where: { id: parsed.shipmentId, organizationId: user.organizationId },
    })
    if (!shipment) return NextResponse.json({ success: false, error: 'Shipment tidak ditemukan' }, { status: 404 })

    // Hitung total
    const subtotal     = (parsed.freightCost || 0) + (parsed.localCharges || 0) + (parsed.customsDuty || 0) + (parsed.otherCharges || 0)
    const afterDiscount = subtotal - (parsed.discount || 0)
    const taxAmount    = afterDiscount * ((parsed.taxPercent || 0) / 100)
    const totalCost    = afterDiscount + taxAmount

    // Generate invoice number — FF-INV-YYYY-NNNN
    const year   = new Date().getFullYear()
    const count  = await prisma.shipment.count({
      where: { organizationId: user.organizationId, invoiceNo: { not: null } },
    })
    const invoiceNo = `INV-${year}-${String(count + 1).padStart(4, '0')}`

    const updated = await prisma.shipment.update({
      where: { id: parsed.shipmentId },
      data: {
        invoiceNo,
        invoiceDate:  new Date(),
        freightCost:  parsed.freightCost,
        localCharges: parsed.localCharges,
        customsDuty:  parsed.customsDuty,
        totalCost,
        isPaid:       parsed.isPaid ?? false,
        // Simpan extra data di internalNotes sebagai JSON (schema fleksibel)
        internalNotes: JSON.stringify({
          otherCharges:      parsed.otherCharges,
          otherChargesLabel: parsed.otherChargesLabel,
          discount:          parsed.discount,
          taxPercent:        parsed.taxPercent,
          invoiceNotes:      parsed.notes,
          dueDate:           parsed.dueDate,
        }),
      },
      include: {
        client:       true,
        organization: true,
      },
    })

    await prisma.activityLog.create({
      data: {
        shipmentId:  parsed.shipmentId,
        userId:      user.id,
        action:      'invoice.created',
        description: `Invoice ${invoiceNo} dibuat — Total ${totalCost.toLocaleString('id-ID')}`,
      },
    })

    return NextResponse.json({ success: true, data: updated }, { status: 201 })
  } catch (e) {
    if (e instanceof z.ZodError) return NextResponse.json({ success: false, error: e.errors[0].message }, { status: 400 })
    console.error('[INVOICE POST]', e)
    return NextResponse.json({ success: false, error: 'Kesalahan server' }, { status: 500 })
  }
}
