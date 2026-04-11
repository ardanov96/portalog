import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import bcrypt from 'bcryptjs'

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  const [org, staff] = await Promise.all([
    prisma.organization.findUnique({ where: { id: user.organizationId } }),
    prisma.user.findMany({
      where: { organizationId: user.organizationId, isActive: true },
      select: { id: true, name: true, email: true, role: true, lastLoginAt: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    }),
  ])

  return NextResponse.json({ success: true, data: { org, staff, currentUser: user } })
}

const orgSchema = z.object({
  name:    z.string().min(2).optional(),
  npwp:    z.string().optional(),
  phone:   z.string().optional(),
  email:   z.string().email().optional().or(z.literal('')),
  address: z.string().optional(),
  city:    z.string().optional(),
})

const profileSchema = z.object({
  name:            z.string().min(2).optional(),
  phone:           z.string().optional(),
  currentPassword: z.string().optional(),
  newPassword:     z.string().min(8).optional(),
})

export async function PATCH(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const type = body.type as 'org' | 'profile'

  try {
    if (type === 'org') {
      if (user.role !== 'OWNER')
        return NextResponse.json({ success: false, error: 'Hanya Owner yang bisa edit organisasi' }, { status: 403 })
      const parsed = orgSchema.parse(body)
      const org = await prisma.organization.update({ where: { id: user.organizationId }, data: parsed })
      return NextResponse.json({ success: true, data: org })
    }

    if (type === 'profile') {
      const parsed = profileSchema.parse(body)
      const updateData: any = {}
      if (parsed.name)  updateData.name  = parsed.name
      if (parsed.phone) updateData.phone = parsed.phone

      if (parsed.newPassword) {
        if (!parsed.currentPassword)
          return NextResponse.json({ success: false, error: 'Password lama wajib diisi' }, { status: 400 })
        const fullUser = await prisma.user.findUnique({ where: { id: user.id } })
        const valid = fullUser && await bcrypt.compare(parsed.currentPassword, fullUser.passwordHash)
        if (!valid) return NextResponse.json({ success: false, error: 'Password lama salah' }, { status: 400 })
        updateData.passwordHash = await bcrypt.hash(parsed.newPassword, 12)
      }

      const updated = await prisma.user.update({ where: { id: user.id }, data: updateData })
      return NextResponse.json({ success: true, data: { id: updated.id, name: updated.name, email: updated.email } })
    }

    return NextResponse.json({ success: false, error: 'Tipe tidak valid' }, { status: 400 })
  } catch (e) {
    if (e instanceof z.ZodError) return NextResponse.json({ success: false, error: e.errors[0].message }, { status: 400 })
    return NextResponse.json({ success: false, error: 'Kesalahan server' }, { status: 500 })
  }
}
