import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { renderToBuffer } from '@react-pdf/renderer'
import { InvoicePDFDocument } from '@/components/invoices/InvoicePDFDocument'

type Ctx = { params: Promise<{ id: string }> }

export async function GET(_: NextRequest, { params }: Ctx) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const shipment = await prisma.shipment.findFirst({
    where: { id, organizationId: user.organizationId, invoiceNo: { not: null } },
    include: {
      client:       true,
      organization: true,
    },
  })

  if (!shipment) return NextResponse.json({ success: false, error: 'Invoice tidak ditemukan' }, { status: 404 })

  // Parse extra invoice data dari internalNotes
  let extra: Record<string, any> = {}
  try {
    if (shipment.internalNotes) extra = JSON.parse(shipment.internalNotes)
  } catch { /* ignore */ }

  const subtotal      = (shipment.freightCost || 0) + (shipment.localCharges || 0) + (shipment.customsDuty || 0) + (extra.otherCharges || 0)
  const afterDiscount = subtotal - (extra.discount || 0)
  const taxAmount     = afterDiscount * ((extra.taxPercent || 0) / 100)
  const total         = afterDiscount + taxAmount

  const invoiceData = {
    invoiceNo:    shipment.invoiceNo!,
    invoiceDate:  shipment.invoiceDate?.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) ?? '-',
    dueDate:      extra.dueDate ?? null,
    referenceNo:  shipment.referenceNo,
    isPaid:       shipment.isPaid,
    shipmentType: shipment.type,
    shipmentMode: shipment.mode,
    originPort:   shipment.originPort ?? '-',
    destPort:     shipment.destinationPort ?? '-',
    etd:          shipment.etd?.toLocaleDateString('id-ID') ?? '-',
    eta:          shipment.eta?.toLocaleDateString('id-ID') ?? '-',
    vesselName:   shipment.vesselName ?? '-',
    voyageNo:     shipment.voyageNo ?? '-',
    notes:        extra.invoiceNotes ?? shipment.notes ?? null,

    // Client
    clientName:    shipment.client.companyName || shipment.client.name,
    clientPic:     shipment.client.companyName ? shipment.client.name : null,
    clientAddress: shipment.client.address ?? null,
    clientCity:    shipment.client.city ?? null,
    clientNpwp:    shipment.client.npwp ?? null,
    clientEmail:   shipment.client.email ?? null,
    clientPhone:   shipment.client.phone ?? null,

    // Org
    orgName:    shipment.organization.name,
    orgAddress: shipment.organization.address ?? null,
    orgCity:    shipment.organization.city ?? null,
    orgPhone:   shipment.organization.phone ?? null,
    orgEmail:   shipment.organization.email ?? null,
    orgNpwp:    shipment.organization.npwp ?? null,

    // Line items
    items: [
      shipment.freightCost   ? { label: 'Ocean/Air Freight', amount: shipment.freightCost } : null,
      shipment.localCharges  ? { label: 'Local Charges & Handling', amount: shipment.localCharges } : null,
      shipment.customsDuty   ? { label: 'Bea Masuk & PDRI', amount: shipment.customsDuty } : null,
      extra.otherCharges     ? { label: extra.otherChargesLabel || 'Biaya Lainnya', amount: extra.otherCharges } : null,
    ].filter(Boolean) as { label: string; amount: number }[],

    subtotal,
    discount:    extra.discount    || null,
    taxPercent:  extra.taxPercent  || null,
    taxAmount:   extra.taxPercent ? taxAmount : null,
    total,
  }

  try {
    const buffer = await renderToBuffer(
      <InvoicePDFDocument data={invoiceData} />
    )

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type':        'application/pdf',
        'Content-Disposition': `attachment; filename="${shipment.invoiceNo}.pdf"`,
        'Content-Length':      String(buffer.length),
    },
    })
  } catch (err) {
    console.error('[PDF RENDER]', err)
    return NextResponse.json({ success: false, error: 'Gagal generate PDF' }, { status: 500 })
  }
}
