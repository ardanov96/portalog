import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authenticateApiKey, apiError, apiSuccess, logApiRequest } from '@/lib/api-auth'
import { z } from 'zod'

type Ctx = { params: Promise<{ id: string }> }

const SHIPMENT_DETAIL_SELECT = {
  id: true, referenceNo: true, type: true, mode: true, status: true,
  originCountry: true, originPort: true, destinationCountry: true, destinationPort: true,
  cargoDescription: true, grossWeight: true, volume: true, packageCount: true, hsCode: true,
  vesselName: true, voyageNo: true, imoNumber: true, mmsiNumber: true,
  etd: true, eta: true, atd: true, ata: true, etaUpdatedAt: true,
  vesselLat: true, vesselLon: true, vesselSpeed: true, vesselCourse: true, vesselStatus: true,
  pibNo: true, pebNo: true, customsDeadline: true,
  freightCost: true, localCharges: true, customsDuty: true, totalCost: true,
  invoiceNo: true, invoiceDate: true, isPaid: true,
  notes: true, createdAt: true, updatedAt: true,
  client: { select: { id: true, name: true, companyName: true, email: true, phone: true, country: true } },
  documents: { where: { isVisibleToClient: true }, select: { id: true, type: true, name: true, status: true, fileUrl: true, createdAt: true } },
  statusHistory: { orderBy: { changedAt: 'desc' as const }, take: 20, select: { fromStatus: true, toStatus: true, note: true, changedAt: true } },
} as const

const updateSchema = z.object({
  status:           z.enum(['BOOKING_CONFIRMED','DOCS_IN_PROGRESS','CUSTOMS_PROCESSING','CARGO_RELEASED','IN_TRANSIT','ARRIVED','DELIVERED','COMPLETED','CANCELLED']).optional(),
  statusNote:       z.string().max(500).optional(),
  vesselName:       z.string().max(100).optional(),
  voyageNo:         z.string().max(50).optional(),
  etd:              z.string().datetime().optional().nullable(),
  eta:              z.string().datetime().optional().nullable(),
  atd:              z.string().datetime().optional().nullable(),
  ata:              z.string().datetime().optional().nullable(),
  pibNo:            z.string().max(30).optional().nullable(),
  pebNo:            z.string().max(30).optional().nullable(),
  freightCost:      z.number().optional().nullable(),
  localCharges:     z.number().optional().nullable(),
  customsDuty:      z.number().optional().nullable(),
  totalCost:        z.number().optional().nullable(),
  invoiceNo:        z.string().max(50).optional().nullable(),
  isPaid:           z.boolean().optional(),
  notes:            z.string().max(1000).optional().nullable(),
}).strict()

export async function GET(req: NextRequest, { params }: Ctx) {
  const t0 = Date.now()
  const auth = await authenticateApiKey(req, 'shipments:read')
  if ('error' in auth) return auth.error
  const { ctx } = auth
  const { id } = await params

  const shipment = await prisma.shipment.findFirst({ where: { id, organizationId: ctx.organizationId }, select: SHIPMENT_DETAIL_SELECT })
  if (!shipment) return apiError(404, 'NOT_FOUND', 'Shipment tidak ditemukan')

  logApiRequest({ apiKeyId: ctx.apiKeyId, endpoint: `/api/v1/shipments/${id}`, method: 'GET', status: 200, ip: req.headers.get('x-forwarded-for'), durationMs: Date.now() - t0 })
  return apiSuccess(shipment)
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const t0 = Date.now()
  const auth = await authenticateApiKey(req, 'shipments:write')
  if ('error' in auth) return auth.error
  const { ctx } = auth
  const { id } = await params

  const existing = await prisma.shipment.findFirst({ where: { id, organizationId: ctx.organizationId }, select: { id: true, status: true } })
  if (!existing) return apiError(404, 'NOT_FOUND', 'Shipment tidak ditemukan')

  let body: any
  try { body = updateSchema.parse(await req.json()) }
  catch (e: any) { return apiError(422, 'VALIDATION_ERROR', 'Data tidak valid', e.errors?.map((x: any) => ({ field: x.path.join('.'), message: x.message }))) }

  const { status: newStatus, statusNote, ...updateData } = body

  // Handle status change with history
  if (newStatus && newStatus !== existing.status) {
    await prisma.shipmentStatusHistory.create({
      data: { shipmentId: id, fromStatus: existing.status as any, toStatus: newStatus as any, note: statusNote ?? `Status diubah via API (${ctx.keyName})`, changedAt: new Date() },
    })
    updateData.status = newStatus
  }

  // Parse dates
  for (const field of ['etd', 'eta', 'atd', 'ata']) {
    if (updateData[field]) updateData[field] = new Date(updateData[field])
    else if (updateData[field] === null) updateData[field] = null
  }

  const shipment = await prisma.shipment.update({ where: { id }, data: updateData, select: SHIPMENT_DETAIL_SELECT })
  logApiRequest({ apiKeyId: ctx.apiKeyId, endpoint: `/api/v1/shipments/${id}`, method: 'PATCH', status: 200, ip: req.headers.get('x-forwarded-for'), durationMs: Date.now() - t0 })
  return apiSuccess(shipment)
}

export async function DELETE(req: NextRequest, { params }: Ctx) {
  const t0 = Date.now()
  const auth = await authenticateApiKey(req, 'shipments:write')
  if ('error' in auth) return auth.error
  const { ctx } = auth
  const { id } = await params

  const existing = await prisma.shipment.findFirst({ where: { id, organizationId: ctx.organizationId }, select: { id: true, status: true } })
  if (!existing) return apiError(404, 'NOT_FOUND', 'Shipment tidak ditemukan')
  if (existing.status !== 'DRAFT') return apiError(409, 'CONFLICT', 'Hanya shipment berstatus DRAFT yang bisa dihapus via API')

  await prisma.shipment.delete({ where: { id } })
  logApiRequest({ apiKeyId: ctx.apiKeyId, endpoint: `/api/v1/shipments/${id}`, method: 'DELETE', status: 200, ip: req.headers.get('x-forwarded-for'), durationMs: Date.now() - t0 })
  return apiSuccess({ id, deleted: true })
}
