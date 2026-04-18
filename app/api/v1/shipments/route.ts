import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authenticateApiKey, apiError, apiSuccess, logApiRequest, parsePagination, paginationMeta } from '@/lib/api-auth'
import { z } from 'zod'

const createSchema = z.object({
  clientId:           z.string().cuid(),
  type:               z.enum(['EXPORT','IMPORT']),
  mode:               z.enum(['SEA_FCL','SEA_LCL','AIR','LAND']),
  originCountry:      z.string().length(2).optional(),
  originPort:         z.string().max(100).optional(),
  destinationCountry: z.string().length(2).optional(),
  destinationPort:    z.string().max(100).optional(),
  cargoDescription:   z.string().max(500).optional(),
  grossWeight:        z.number().positive().optional(),
  volume:             z.number().positive().optional(),
  packageCount:       z.number().int().positive().optional(),
  hsCode:             z.string().max(20).optional(),
  vesselName:         z.string().max(100).optional(),
  voyageNo:           z.string().max(50).optional(),
  etd:                z.string().datetime().optional(),
  eta:                z.string().datetime().optional(),
  pibNo:              z.string().max(30).optional(),
  pebNo:              z.string().max(30).optional(),
  notes:              z.string().max(1000).optional(),
})

const SHIPMENT_SELECT = {
  id: true, referenceNo: true, type: true, mode: true, status: true,
  originCountry: true, originPort: true, destinationCountry: true, destinationPort: true,
  cargoDescription: true, grossWeight: true, volume: true, packageCount: true, hsCode: true,
  vesselName: true, voyageNo: true, etd: true, eta: true, atd: true, ata: true,
  pibNo: true, pebNo: true, customsDeadline: true,
  freightCost: true, localCharges: true, customsDuty: true, totalCost: true,
  invoiceNo: true, invoiceDate: true, isPaid: true,
  notes: true, createdAt: true, updatedAt: true,
  client: { select: { id: true, name: true, companyName: true, email: true, country: true } },
  _count: { select: { documents: true } },
} as const

export async function GET(req: NextRequest) {
  const t0 = Date.now()
  const auth = await authenticateApiKey(req, 'shipments:read')
  if ('error' in auth) return auth.error
  const { ctx } = auth

  const sp = new URL(req.url).searchParams
  const { page, limit, skip } = parsePagination(req)

  const where: any = { organizationId: ctx.organizationId }
  const status = sp.get('status'); if (status) where.status = status
  const type   = sp.get('type');   if (type)   where.type   = type
  const mode   = sp.get('mode');   if (mode)   where.mode   = mode
  const cid    = sp.get('client_id'); if (cid) where.clientId = cid
  const since  = sp.get('since');  if (since) where.createdAt = { ...where.createdAt, gte: new Date(since) }
  const until  = sp.get('until');  if (until) where.createdAt = { ...where.createdAt, lte: new Date(until) }
  const q      = sp.get('q')
  if (q) where.OR = [
    { referenceNo:      { contains: q, mode: 'insensitive' } },
    { cargoDescription: { contains: q, mode: 'insensitive' } },
    { client: { name:   { contains: q, mode: 'insensitive' } } },
  ]

  const [data, total] = await Promise.all([
    prisma.shipment.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' }, select: SHIPMENT_SELECT }),
    prisma.shipment.count({ where }),
  ])

  logApiRequest({ apiKeyId: ctx.apiKeyId, endpoint: '/api/v1/shipments', method: 'GET', status: 200, ip: req.headers.get('x-forwarded-for'), durationMs: Date.now() - t0 })
  return apiSuccess(data, paginationMeta(total, page, limit))
}

export async function POST(req: NextRequest) {
  const t0 = Date.now()
  const auth = await authenticateApiKey(req, 'shipments:write')
  if ('error' in auth) return auth.error
  const { ctx } = auth

  let body: any
  try { body = createSchema.parse(await req.json()) }
  catch (e: any) { return apiError(422, 'VALIDATION_ERROR', 'Data tidak valid', e.errors?.map((x: any) => ({ field: x.path.join('.'), message: x.message }))) }

  const client = await prisma.client.findFirst({ where: { id: body.clientId, organizationId: ctx.organizationId } })
  if (!client) return apiError(404, 'CLIENT_NOT_FOUND', 'Klien tidak ditemukan dalam organisasi ini')

  const count = await prisma.shipment.count({ where: { organizationId: ctx.organizationId } })
  const refNo = `FF-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`

  const shipment = await prisma.shipment.create({
    data: { organizationId: ctx.organizationId, referenceNo: refNo, ...body, etd: body.etd ? new Date(body.etd) : undefined, eta: body.eta ? new Date(body.eta) : undefined },
    select: SHIPMENT_SELECT,
  })

  prisma.activityLog.create({ data: { shipmentId: shipment.id, action: 'API_CREATED', description: `Dibuat via API key: ${ctx.keyName}` } }).catch(() => {})
  logApiRequest({ apiKeyId: ctx.apiKeyId, endpoint: '/api/v1/shipments', method: 'POST', status: 201, ip: req.headers.get('x-forwarded-for'), durationMs: Date.now() - t0 })
  return apiSuccess(shipment, undefined, 201)
}
