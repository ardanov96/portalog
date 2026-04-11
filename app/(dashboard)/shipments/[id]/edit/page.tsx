import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ShipmentEditClient } from './ShipmentEditClient'

type Props = { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const user = await getCurrentUser()
  if (!user) return { title: 'Edit Shipment' }
  const s = await prisma.shipment.findFirst({
    where: { id, organizationId: user.organizationId },
    select: { referenceNo: true },
  })
  return { title: s ? `Edit ${s.referenceNo}` : 'Edit Shipment' }
}

export default async function EditShipmentPage({ params }: Props) {
  const { id } = await params
  const user   = await getCurrentUser()
  if (!user) notFound()

  const [shipment, clients] = await Promise.all([
    prisma.shipment.findFirst({
      where:   { id, organizationId: user.organizationId },
      include: { client: { select: { id: true, name: true, companyName: true } } },
    }),
    prisma.client.findMany({
      where:   { organizationId: user.organizationId, isActive: true },
      select:  { id: true, name: true, companyName: true },
      orderBy: { name: 'asc' },
    }),
  ])

  if (!shipment) notFound()

  return (
    <ShipmentEditClient
      shipment={JSON.parse(JSON.stringify(shipment))}
      clients={clients}
    />
  )
}
