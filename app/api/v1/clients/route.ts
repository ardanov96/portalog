import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authenticateApiKey, apiError, apiSuccess, logApiRequest, parsePagination, paginationMeta } from '@/lib/api-auth'
import { z } from 'zod'

const createSchema = z.object({
  name:        z.string().min(2).max(100),
  companyName: z.string().max(150).optional(),
  email:       z.string().email().optional(),
  phone:       z.string().max(30).optional(),
  country:     z.string().length(2).default('ID'),
  address:     z.string().max(300).optional(),
  city:        z.string().max(100).optional(),
  npwp:        z.string().max(30).optional(),
  notes:       z.string().max(500).optional(),
})

export async function GET(req: NextRequest) {
  const t0 = Date.now()
  const auth = await authenticateApiKey(req, 'clients:read')
  if ('error' in auth) return auth.error
  const { ctx } = auth

  const { page, limit, skip } = parsePagination(req)
  const sp = new URL(req.url).searchParams
  const q  = sp.get('q')

  const where: any = { organizationId: ctx.organizationId, isActive: true }
  if (q) where.OR = [
    { name:        { contains: q, mode: 'insensitive' } },
    { companyName: { contains: q, mode: 'insensitive' } },
    { email:       { contains: q, mode: 'insensitive' } },
  ]

  const [data, total] = await Promise.all([
    prisma.client.findMany({
      where, skip, take: limit, orderBy: { name: 'asc' },
      select: { id: true, name: true, companyName: true, email: true, phone: true, country: true, city: true, npwp: true, createdAt: true, _count: { select: { shipments: true } } },
    }),
    prisma.client.count({ where }),
  ])

  logApiRequest({ apiKeyId: ctx.apiKeyId, endpoint: '/api/v1/clients', method: 'GET', status: 200, ip: req.headers.get('x-forwarded-for'), durationMs: Date.now() - t0 })
  return apiSuccess(data, paginationMeta(total, page, limit))
}

export async function POST(req: NextRequest) {
  const t0 = Date.now()
  const auth = await authenticateApiKey(req, 'clients:write')
  if ('error' in auth) return auth.error
  const { ctx } = auth

  let body: any
  try { body = createSchema.parse(await req.json()) }
  catch (e: any) { return apiError(422, 'VALIDATION_ERROR', 'Data tidak valid', e.errors?.map((x: any) => ({ field: x.path.join('.'), message: x.message }))) }

  if (body.email) {
    const exists = await prisma.client.findFirst({ where: { organizationId: ctx.organizationId, email: body.email } })
    if (exists) return apiError(409, 'DUPLICATE_EMAIL', `Klien dengan email ${body.email} sudah ada`)
  }

  const client = await prisma.client.create({
    data: { organizationId: ctx.organizationId, ...body },
    select: { id: true, name: true, companyName: true, email: true, phone: true, country: true, city: true, npwp: true, createdAt: true },
  })

  logApiRequest({ apiKeyId: ctx.apiKeyId, endpoint: '/api/v1/clients', method: 'POST', status: 201, ip: req.headers.get('x-forwarded-for'), durationMs: Date.now() - t0 })
  return apiSuccess(client, undefined, 201)
}
