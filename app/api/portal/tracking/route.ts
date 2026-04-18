import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { verifyPortalToken } from '@/lib/portal-auth'

async function getPortalClient() {
  const jar   = await cookies()
  const token = jar.get('ff_portal_session')?.value
  if (!token) return null
  const payload = await verifyPortalToken(token)
  if (!payload) return null
  return prisma.client.findUnique({
    where: { id: payload.clientId },
    include: { organization: { select: { id: true, name: true, logoUrl: true } } },
  })
}

export async function GET() {
  const client = await getPortalClient()
  if (!client) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  const shipments = await prisma.shipment.findMany({
    where: { clientId: client.id },
    orderBy: { createdAt: 'desc' },
    include: {
      documents: {
        where: { isVisibleToClient: true },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, type: true, name: true, status: true,
          fileUrl: true, createdAt: true,
        },
      },
      statusHistory: {
        orderBy: { changedAt: 'desc' },
        take: 5,
        select: { toStatus: true, note: true, changedAt: true },
      },
    },
  })

  return NextResponse.json({
    success: true,
    data: {
      client: {
        id:          client.id,
        name:        client.name,
        companyName: client.companyName,
        organization: client.organization,
      },
      shipments: JSON.parse(JSON.stringify(shipments)),
    },
  })
}
