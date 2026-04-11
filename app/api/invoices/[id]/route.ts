import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

type Ctx = { params: Promise<{ id: string }> }

const updateSchema = z.object({
  isPaid:       z.boolean().optional(),
  freightCost:  z.number().min(0).optional(),
  localCharges: z.number().min(0).optional(),
  customsDuty:  z.number().min(0).optional(),
  totalCost:    z.number().min(0).optional(),
})

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  try {
    const parsed   = updateSchema.parse(await req.json())
    const existing = await prisma.shipment.findFirst({
      where: { id, organizationId: user.organizationId },
    })
    if (!existing) return NextResponse.json({ success: false, error: 'Tidak ditemukan' }, { status: 404 })

    const updated = await prisma.shipment.update({ where: { id }, data: parsed })
    return NextResponse.json({ success: true, data: updated })
  } catch (e) {
    if (e instanceof z.ZodError) return NextResponse.json({ success: false, error: e.errors[0].message }, { status: 400 })
    return NextResponse.json({ success: false, error: 'Kesalahan server' }, { status: 500 })
  }
}
