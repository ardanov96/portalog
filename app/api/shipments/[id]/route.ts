import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { ShipmentStatus } from '@prisma/client'
import { notifyStatusChange } from '@/lib/whatsapp'
import { emailNotifyStatusChange } from '@/lib/email'

type Ctx = { params: Promise<{ id: string }> }

export async function GET(_: NextRequest, { params }: Ctx) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const shipment = await prisma.shipment.findFirst({
    where: { id, organizationId: user.organizationId },
    include: {
      client:        true,
      assignedTo:    { select: { id: true, name: true, email: true, avatarUrl: true } },
      documents:     { orderBy: { createdAt: 'desc' } },
      statusHistory: { orderBy: { changedAt: 'desc' }, take: 10 },
      activityLogs:  { orderBy: { createdAt: 'desc' }, take: 20 },
    },
  })

  if (!shipment) return NextResponse.json({ success: false, error: 'Shipment tidak ditemukan' }, { status: 404 })
  return NextResponse.json({ success: true, data: shipment })
}

const updateSchema = z.object({
  // Status
  status:           z.nativeEnum(ShipmentStatus).optional(),
  statusChangeNote: z.string().optional(),
  assignedToId:     z.string().cuid().optional(),

  // Rute
  originCountry:      z.string().optional(),
  originPort:         z.string().optional(),
  destinationCountry: z.string().optional(),
  destinationPort:    z.string().optional(),

  // Kargo
  cargoDescription: z.string().optional(),
  grossWeight:      z.number().optional().nullable(),
  volume:           z.number().optional().nullable(),
  packageCount:     z.number().int().optional().nullable(),
  hsCode:           z.string().optional(),

  // Vessel & jadwal
  vesselName:       z.string().optional(),
  voyageNo:         z.string().optional(),
  etd:              z.string().datetime().optional().nullable(),
  eta:              z.string().datetime().optional().nullable(),
  ata:              z.string().datetime().optional().nullable(),
  customsDeadline:  z.string().datetime().optional().nullable(),

  // Bea cukai
  pibNo:            z.string().optional(),
  pebNo:            z.string().optional(),

  // Keuangan
  freightCost:      z.number().optional(),
  localCharges:     z.number().optional(),
  customsDuty:      z.number().optional(),
  totalCost:        z.number().optional(),
  invoiceNo:        z.string().optional(),
  isPaid:           z.boolean().optional(),

  // Catatan
  notes:            z.string().optional(),
  internalNotes:    z.string().optional(),
})

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  try {
    const parsed = updateSchema.parse(await req.json())
    const existing = await prisma.shipment.findFirst({ where: { id, organizationId: user.organizationId } })
    if (!existing) return NextResponse.json({ success: false, error: 'Shipment tidak ditemukan' }, { status: 404 })

    const { statusChangeNote, ...data } = parsed

    const updated = await prisma.$transaction(async (tx) => {
      if (parsed.status && parsed.status !== existing.status) {
        await tx.shipmentStatusHistory.create({
          data: { shipmentId: id, fromStatus: existing.status, toStatus: parsed.status, note: statusChangeNote, changedById: user.id },
        })
        await tx.activityLog.create({
          data: { shipmentId: id, userId: user.id, action: 'shipment.status_changed', description: `Status berubah: ${existing.status} → ${parsed.status}` },
        })
      }
      return tx.shipment.update({
        where: { id },
        data: {
          ...data,
          // Convert datetime strings to Date objects
          etd:             data.etd             ? new Date(data.etd)             : data.etd,
          eta:             data.eta             ? new Date(data.eta)             : data.eta,
          ata:             data.ata             ? new Date(data.ata)             : data.ata,
          customsDeadline: data.customsDeadline ? new Date(data.customsDeadline) : data.customsDeadline,
        },
        include: {
          client:     { select: { id: true, name: true, companyName: true } },
          documents:  true,
          assignedTo: { select: { id: true, name: true } },
        },
      })
    })

    // ── Kirim notifikasi WA + Email jika status berubah ──────────────────
    if (parsed.status && parsed.status !== existing.status) {
      try {
        const [fullClient, org] = await Promise.all([
          prisma.client.findUnique({
            where:  { id: existing.clientId },
            select: { phone: true, email: true, name: true },
          }),
          prisma.organization.findUnique({
            where:  { id: user.organizationId },
            select: { name: true, email: true },
          }),
        ])

        const appUrl    = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
        const portalUrl = `${appUrl}/portal/tracking/${existing.referenceNo}`
        const eta       = existing.eta?.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
        const clientName = (updated as any).client?.name ?? fullClient?.name ?? ''

        // WA — kalau ada nomor HP
        if (fullClient?.phone && org) {
          notifyStatusChange(fullClient.phone, {
            clientName,
            referenceNo: existing.referenceNo,
            newStatus:   parsed.status,
            orgName:     org.name,
            eta,
            portalUrl,
            note:        statusChangeNote,
          }).catch(e => console.warn('[WA] non-fatal:', e))
        }

        // Email — kalau ada email klien
        if (fullClient?.email && org) {
          emailNotifyStatusChange({
            clientName,
            clientEmail:  fullClient.email,
            referenceNo:  existing.referenceNo,
            newStatus:    parsed.status,
            orgName:      org.name,
            orgEmail:     org.email ?? undefined,
            eta,
            portalUrl,
            note:         statusChangeNote,
          }).catch(e => console.warn('[EMAIL] non-fatal:', e))
        }
      } catch (notifErr) {
        console.warn('[NOTIF] Gagal kirim notifikasi (non-fatal):', notifErr)
      }
    }

    return NextResponse.json({ success: true, data: updated })
  } catch (e) {
    if (e instanceof z.ZodError) return NextResponse.json({ success: false, error: e.errors[0].message }, { status: 400 })
    console.error('[SHIPMENT PATCH]', e)
    return NextResponse.json({ success: false, error: 'Kesalahan server' }, { status: 500 })
  }
}

export async function DELETE(_: NextRequest, { params }: Ctx) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  if (user.role === 'STAFF') return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const existing = await prisma.shipment.findFirst({ where: { id, organizationId: user.organizationId } })
  if (!existing) return NextResponse.json({ success: false, error: 'Shipment tidak ditemukan' }, { status: 404 })

  await prisma.shipment.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
