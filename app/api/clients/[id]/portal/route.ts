import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

type Ctx = { params: Promise<{ id: string }> }

const schema = z.object({
  portalEmail:    z.string().email(),
  portalPassword: z.string().min(6, 'Password minimal 6 karakter'),
})

// POST — aktifkan atau reset akses portal klien
export async function POST(req: NextRequest, { params }: Ctx) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  try {
    const { portalEmail, portalPassword } = schema.parse(await req.json())

    const client = await prisma.client.findFirst({ where: { id, organizationId: user.organizationId } })
    if (!client) return NextResponse.json({ success: false, error: 'Klien tidak ditemukan' }, { status: 404 })

    // Cek email tidak bentrok dengan klien lain
    const conflict = await prisma.client.findFirst({
      where: { portalEmail, id: { not: id } },
    })
    if (conflict) return NextResponse.json({ success: false, error: 'Email portal sudah dipakai klien lain' }, { status: 409 })

    const hash = await bcrypt.hash(portalPassword, 12)
    await prisma.client.update({
      where: { id },
      data: { portalEmail, portalPasswordHash: hash },
    })

    return NextResponse.json({
      success: true,
      data: { portalEmail, message: 'Akses portal berhasil diaktifkan' },
    })
  } catch (e) {
    if (e instanceof z.ZodError) return NextResponse.json({ success: false, error: e.errors[0].message }, { status: 400 })
    return NextResponse.json({ success: false, error: 'Kesalahan server' }, { status: 500 })
  }
}

// DELETE — nonaktifkan akses portal klien
export async function DELETE(_: NextRequest, { params }: Ctx) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const client = await prisma.client.findFirst({ where: { id, organizationId: user.organizationId } })
  if (!client) return NextResponse.json({ success: false, error: 'Klien tidak ditemukan' }, { status: 404 })
  await prisma.client.update({ where: { id }, data: { portalEmail: null, portalPasswordHash: null } })
  return NextResponse.json({ success: true })
}
