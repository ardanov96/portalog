import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { notifyStatusChange, notifyDocumentReady, sendDeadlineReminders } from '@/lib/whatsapp'
import { emailNotifyStatusChange, emailNotifyDocumentReady, sendBulkDeadlineEmailReminders } from '@/lib/email'
import { z } from 'zod'

const manualSchema = z.object({
  type:       z.enum(['status_change', 'document_ready', 'deadline_check']),
  shipmentId: z.string().cuid().optional(),
  documentId: z.string().cuid().optional(),
})

// POST /api/notifications — kirim notifikasi manual
export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  try {
    const body   = await req.json()
    const parsed = manualSchema.parse(body)
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    if (parsed.type === 'status_change' && parsed.shipmentId) {
      const shipment = await prisma.shipment.findFirst({
        where: { id: parsed.shipmentId, organizationId: user.organizationId },
        include: {
          client:       true,
          organization: { select: { name: true } },
        },
      })
      if (!shipment) return NextResponse.json({ success: false, error: 'Shipment tidak ditemukan' }, { status: 404 })
      if (!shipment.client.phone) return NextResponse.json({ success: false, error: 'Klien tidak memiliki nomor WA' }, { status: 400 })

      const result = await notifyStatusChange(shipment.client.phone, {
        clientName:   shipment.client.name,
        referenceNo:  shipment.referenceNo,
        newStatus:    shipment.status,
        orgName:      shipment.organization.name,
        eta:          shipment.eta?.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
        portalUrl:    `${appUrl}/portal/tracking/${shipment.referenceNo}`,
      })

      // Mirror ke email jika klien punya email
      if (shipment.client.email) {
        emailNotifyStatusChange({
          clientName:  shipment.client.name,
          clientEmail: shipment.client.email,
          referenceNo: shipment.referenceNo,
          newStatus:   shipment.status,
          orgName:     shipment.organization.name,
          portalUrl:   `${appUrl}/portal/tracking/${shipment.referenceNo}`,
          eta:         shipment.eta?.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
        }).catch(e => console.warn('[EMAIL] non-fatal:', e))
      }

      await prisma.notification.create({
        data: {
          shipmentId:  shipment.id,
          type:        'SHIPMENT_STATUS_CHANGED',
          title:       `Status update: ${shipment.referenceNo}`,
          message:     `Notifikasi WA status ${shipment.status} dikirim ke ${shipment.client.phone}`,
          sentViaWa:   result.status,
        },
      })

      return NextResponse.json({ success: true, data: result })
    }

    if (parsed.type === 'document_ready' && parsed.documentId) {
      const doc = await prisma.document.findFirst({
        where: { id: parsed.documentId },
        include: {
          shipment: {
            include: {
              client:       true,
              organization: { select: { name: true } },
            },
          },
        },
      })
      if (!doc) return NextResponse.json({ success: false, error: 'Dokumen tidak ditemukan' }, { status: 404 })
      if (doc.shipment.organizationId !== user.organizationId) return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
      if (!doc.shipment.client.phone) return NextResponse.json({ success: false, error: 'Klien tidak memiliki nomor WA' }, { status: 400 })

      const result = await notifyDocumentReady(doc.shipment.client.phone, {
        clientName:   doc.shipment.client.name,
        referenceNo:  doc.shipment.referenceNo,
        documentName: doc.name,
        orgName:      doc.shipment.organization.name,
        portalUrl:    `${appUrl}/portal/tracking/${doc.shipment.referenceNo}`,
      })

      return NextResponse.json({ success: true, data: result })
    }

    if (parsed.type === 'deadline_check') {
      const active = ['BOOKING_CONFIRMED','DOCS_IN_PROGRESS','CUSTOMS_PROCESSING','CARGO_RELEASED','IN_TRANSIT','ARRIVED']
      const shipments = await prisma.shipment.findMany({
        where: {
          organizationId: user.organizationId,
          status: { in: active as any[] },
          OR: [
            { customsDeadline: { not: null } },
            { eta: { not: null } },
          ],
        },
        include: {
          client:       { select: { name: true, phone: true } },
          organization: { select: { name: true } },
        },
      })

      await sendDeadlineReminders(shipments as any)
      await sendBulkDeadlineEmailReminders(shipments as any)
      return NextResponse.json({ success: true, data: { checked: shipments.length } })
    }

    return NextResponse.json({ success: false, error: 'Tipe tidak valid' }, { status: 400 })
  } catch (e) {
    if (e instanceof z.ZodError) return NextResponse.json({ success: false, error: e.errors[0].message }, { status: 400 })
    console.error('[NOTIFICATIONS]', e)
    return NextResponse.json({ success: false, error: 'Kesalahan server' }, { status: 500 })
  }
}

// GET /api/notifications — list notifikasi untuk user ini
export async function GET() {  // ← hapus parameter req yang tidak dipakai
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  try {
    const notifications = await prisma.notification.findMany({
      where:   { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take:    30,
      include: {
        shipment: { select: { referenceNo: true, status: true } },
      },
    })

    const unreadCount = await prisma.notification.count({
      where: { userId: user.id, isRead: false },
    })

    return NextResponse.json({ success: true, data: notifications, unreadCount })
  } catch (err) {
    console.error('[GET /api/notifications]', err)
    return NextResponse.json({ success: false, error: 'Kesalahan server' }, { status: 500 })
  }
}
