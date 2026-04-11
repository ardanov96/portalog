import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

type Ctx = { params: Promise<{ id: string }> }

export async function GET(_: NextRequest, { params }: Ctx) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const client = await prisma.client.findFirst({
    where: { id, organizationId: user.organizationId },
    include: {
      shipments: {
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true, referenceNo: true, type: true, mode: true,
          status: true, eta: true, createdAt: true,
          _count: { select: { documents: true } },
        },
      },
      _count: { select: { shipments: true } },
    },
  })
  if (!client) return NextResponse.json({ success: false, error: 'Klien tidak ditemukan' }, { status: 404 })
  return NextResponse.json({ success: true, data: client })
}

const updateSchema = z.object({
  name:        z.string().min(2).optional(),
  companyName: z.string().optional(),
  npwp:        z.string().optional(),
  email:       z.string().email().optional().or(z.literal('')),
  phone:       z.string().optional(),
  address:     z.string().optional(),
  city:        z.string().optional(),
  country:     z.string().optional(),
  notes:       z.string().optional(),
  isActive:    z.boolean().optional(),
})

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  try {
    const parsed  = updateSchema.parse(await req.json())
    const existing = await prisma.client.findFirst({ where: { id, organizationId: user.organizationId } })
    if (!existing) return NextResponse.json({ success: false, error: 'Klien tidak ditemukan' }, { status: 404 })
    const updated = await prisma.client.update({ where: { id }, data: parsed })
    return NextResponse.json({ success: true, data: updated })
  } catch (e) {
    if (e instanceof z.ZodError) return NextResponse.json({ success: false, error: e.errors[0].message }, { status: 400 })
    return NextResponse.json({ success: false, error: 'Kesalahan server' }, { status: 500 })
  }
}

export async function DELETE(_: NextRequest, { params }: Ctx) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  if (user.role === 'STAFF') return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
  const { id } = await params
  const existing = await prisma.client.findFirst({ where: { id, organizationId: user.organizationId } })
  if (!existing) return NextResponse.json({ success: false, error: 'Klien tidak ditemukan' }, { status: 404 })
  await prisma.client.update({ where: { id }, data: { isActive: false } })
  return NextResponse.json({ success: true })
}
