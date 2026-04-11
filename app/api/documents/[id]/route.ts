import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { DocumentStatus } from '@prisma/client'

type Ctx = { params: Promise<{ id: string }> }

const updateSchema = z.object({
  status:            z.nativeEnum(DocumentStatus).optional(),
  name:              z.string().optional(),
  fileUrl:           z.string().url().optional().nullable(),
  notes:             z.string().optional(),
  isVisibleToClient: z.boolean().optional(),
})

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  try {
    const parsed = updateSchema.parse(await req.json())
    const doc = await prisma.document.findFirst({
      where: { id },
      include: { shipment: { select: { organizationId: true, id: true } } },
    })
    if (!doc || doc.shipment.organizationId !== user.organizationId)
      return NextResponse.json({ success: false, error: 'Dokumen tidak ditemukan' }, { status: 404 })

    const updateData: any = { ...parsed }
    if (parsed.status === 'APPROVED') {
      updateData.approvedById = user.id
      updateData.approvedAt   = new Date()
    }

    const updated = await prisma.document.update({ where: { id }, data: updateData })

    await prisma.activityLog.create({
      data: {
        shipmentId:  doc.shipment.id,
        userId:      user.id,
        action:      'document.updated',
        description: `Dokumen "${doc.name}" diupdate${parsed.status ? ` → ${parsed.status}` : ''}`,
      },
    })

    return NextResponse.json({ success: true, data: updated })
  } catch (e) {
    if (e instanceof z.ZodError) return NextResponse.json({ success: false, error: e.errors[0].message }, { status: 400 })
    return NextResponse.json({ success: false, error: 'Kesalahan server' }, { status: 500 })
  }
}

export async function DELETE(_: NextRequest, { params }: Ctx) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const doc = await prisma.document.findFirst({
    where: { id },
    include: { shipment: { select: { organizationId: true } } },
  })
  if (!doc || doc.shipment.organizationId !== user.organizationId)
    return NextResponse.json({ success: false, error: 'Dokumen tidak ditemukan' }, { status: 404 })
  await prisma.document.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
