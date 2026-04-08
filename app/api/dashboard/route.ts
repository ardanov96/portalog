import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ShipmentStatus } from '@prisma/client'

const ACTIVE: ShipmentStatus[] = [
  'BOOKING_CONFIRMED', 'DOCS_IN_PROGRESS', 'CUSTOMS_PROCESSING',
  'CARGO_RELEASED', 'IN_TRANSIT', 'ARRIVED',
]

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  const orgId        = user.organizationId
  const now          = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const in3Days      = new Date(now.getTime() + 3 * 86_400_000)

  const [total, active, completed, pendingDocs, byStatus, recent, deadlines] = await Promise.all([
    prisma.shipment.count({ where: { organizationId: orgId } }),
    prisma.shipment.count({ where: { organizationId: orgId, status: { in: ACTIVE } } }),
    prisma.shipment.count({ where: { organizationId: orgId, status: 'COMPLETED', updatedAt: { gte: startOfMonth } } }),
    prisma.document.count({ where: { status: { in: ['PENDING', 'UNDER_REVIEW'] }, shipment: { organizationId: orgId } } }),
    prisma.shipment.groupBy({ by: ['status'], where: { organizationId: orgId }, _count: { status: true } }),
    prisma.activityLog.findMany({
      where: { shipment: { organizationId: orgId } },
      orderBy: { createdAt: 'desc' }, take: 8,
      include: { shipment: { select: { referenceNo: true } } },
    }),
    prisma.shipment.findMany({
      where: {
        organizationId: orgId, status: { in: ACTIVE },
        OR: [
          { customsDeadline: { gte: now, lte: in3Days } },
          { eta: { gte: now, lte: in3Days } },
        ],
      },
      select: { id: true, referenceNo: true, eta: true, customsDeadline: true, client: { select: { name: true } } },
      orderBy: { eta: 'asc' }, take: 5,
    }),
  ])

  return NextResponse.json({
    success: true,
    data: {
      totalShipments:    total,
      activeShipments:   active,
      completedThisMonth: completed,
      pendingDocuments:  pendingDocs,
      shipmentsByStatus: byStatus.map((s) => ({ status: s.status, count: s._count.status })),
      recentActivity:    recent.map((l) => ({ id: l.id, description: l.description, action: l.action, createdAt: l.createdAt, shipmentRef: l.shipment?.referenceNo })),
      upcomingDeadlines: deadlines,
    },
  })
}
