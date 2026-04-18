import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authenticateApiKey, apiSuccess, logApiRequest } from '@/lib/api-auth'

export async function GET(req: NextRequest) {
  const t0 = Date.now()
  const auth = await authenticateApiKey(req, 'analytics:read')
  if ('error' in auth) return auth.error
  const { ctx } = auth

  const sp   = new URL(req.url).searchParams
  const year = parseInt(sp.get('year') ?? String(new Date().getFullYear()))
  const ys   = new Date(year, 0, 1)
  const ye   = new Date(year + 1, 0, 1)

  const [shipments, clientCount] = await Promise.all([
    prisma.shipment.findMany({
      where: { organizationId: ctx.organizationId, createdAt: { gte: ys, lt: ye } },
      select: { status: true, type: true, mode: true, totalCost: true, isPaid: true, createdAt: true },
    }),
    prisma.client.count({ where: { organizationId: ctx.organizationId, isActive: true } }),
  ])

  const total    = shipments.length
  const completed = shipments.filter(s => ['COMPLETED','DELIVERED'].includes(s.status)).length
  const revenue   = shipments.reduce((sum, s) => sum + (s.totalCost ?? 0), 0)

  const byStatus = Object.fromEntries(
    [...new Set(shipments.map(s => s.status))].map(status => [
      status, shipments.filter(s => s.status === status).length
    ])
  )

  const byMonth = Array.from({ length: 12 }, (_, m) => {
    const ms = shipments.filter(s => new Date(s.createdAt).getMonth() === m)
    return {
      month: m + 1,
      label: new Date(year, m, 1).toLocaleString('id-ID', { month: 'short' }),
      count: ms.length,
      revenue: ms.reduce((sum, s) => sum + (s.totalCost ?? 0), 0),
    }
  })

  logApiRequest({ apiKeyId: ctx.apiKeyId, endpoint: '/api/v1/analytics', method: 'GET', status: 200, ip: req.headers.get('x-forwarded-for'), durationMs: Date.now() - t0 })
  return apiSuccess({ year, summary: { total, completed, cancelled: shipments.filter(s => s.status === 'CANCELLED').length, revenue, paidRevenue: shipments.filter(s => s.isPaid).reduce((sum, s) => sum + (s.totalCost ?? 0), 0), clients: clientCount }, byStatus, byMonth })
}
