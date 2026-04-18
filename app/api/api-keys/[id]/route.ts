import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

type Ctx = { params: Promise<{ id: string }> }

const updateSchema = z.object({
  name:         z.string().min(3).max(80).optional(),
  description:  z.string().max(200).optional().nullable(),
  isActive:     z.boolean().optional(),
  monthlyLimit: z.number().int().min(100).max(1_000_000).optional(),
  expiresAt:    z.string().datetime().optional().nullable(),
})

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  const { id } = await params

  const key = await prisma.apiKey.findFirst({ where: { id, organizationId: user.organizationId } })
  if (!key) return NextResponse.json({ success: false, error: 'API key tidak ditemukan' }, { status: 404 })

  let body: any
  try { body = updateSchema.parse(await req.json()) }
  catch (e: any) { return NextResponse.json({ success: false, error: e.errors?.[0]?.message }, { status: 400 }) }

  if (body.expiresAt) body.expiresAt = new Date(body.expiresAt)
  else if (body.expiresAt === null) body.expiresAt = null

  const updated = await prisma.apiKey.update({ where: { id }, data: body, select: { id: true, name: true, keyPrefix: true, scopes: true, isActive: true, monthlyLimit: true, expiresAt: true } })
  return NextResponse.json({ success: true, data: updated })
}

export async function DELETE(_: NextRequest, { params }: Ctx) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  if (user.role !== 'OWNER') return NextResponse.json({ success: false, error: 'Hanya Owner' }, { status: 403 })
  const { id } = await params

  const key = await prisma.apiKey.findFirst({ where: { id, organizationId: user.organizationId } })
  if (!key) return NextResponse.json({ success: false, error: 'Tidak ditemukan' }, { status: 404 })

  await prisma.apiKey.delete({ where: { id } })
  return NextResponse.json({ success: true, data: { id, deleted: true } })
}
