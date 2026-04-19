import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { randomBytes } from 'crypto'
import { emailSendStaffInvite } from '@/lib/email'

const INVITE_EXPIRES_HOURS = 48

const sendSchema = z.object({
  email: z.string().email('Email tidak valid'),
  name:  z.string().min(2, 'Nama minimal 2 karakter').optional(),
  role:  z.enum(['STAFF', 'OWNER']).default('STAFF'),
})

// POST — kirim undangan baru
export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user)              return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  if (user.role !== 'OWNER') return NextResponse.json({ success: false, error: 'Hanya Owner yang dapat mengundang staff' }, { status: 403 })

  try {
    const body = sendSchema.parse(await req.json())

    // Cek apakah email sudah terdaftar sebagai user aktif
    const existing = await prisma.user.findUnique({ where: { email: body.email } })
    if (existing) {
      if (existing.organizationId === user.organizationId) {
        return NextResponse.json({ success: false, error: 'Email ini sudah terdaftar di organisasi Anda' }, { status: 409 })
      }
      return NextResponse.json({ success: false, error: 'Email ini sudah terdaftar di Portalog' }, { status: 409 })
    }

    // Batalkan invite lama yang belum diterima untuk email yang sama
    await prisma.staffInvite.deleteMany({
      where: {
        organizationId: user.organizationId,
        email:          body.email,
        acceptedAt:     null,
      },
    })

    // Buat token acak yang aman
    const token     = randomBytes(32).toString('hex')
    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + INVITE_EXPIRES_HOURS)

    const invite = await prisma.staffInvite.create({
      data: {
        organizationId: user.organizationId,
        email:          body.email,
        name:           body.name,
        role:           body.role,
        token,
        expiresAt,
        invitedById:    user.id,
      },
    })

    const appUrl    = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
    const inviteUrl = `${appUrl}/invite/${token}`

    // Kirim email undangan
    const emailResult = await emailSendStaffInvite({
      to:          body.email,
      inviteeName: body.name,
      inviterName: user.name,
      orgName:     user.organization.name,
      inviteUrl,
      expiresIn:   `${INVITE_EXPIRES_HOURS} jam`,
      role:        body.role,
    })

    if (!emailResult.success) {
      console.warn('[INVITE] Email gagal terkirim:', emailResult.error)
      // Tetap return sukses — invite sudah dibuat, email akan bisa dikirim ulang
    }

    return NextResponse.json({
      success: true,
      data: {
        id:        invite.id,
        email:     invite.email,
        name:      invite.name,
        role:      invite.role,
        expiresAt: invite.expiresAt,
        emailSent: emailResult.success,
        inviteUrl, // kembalikan URL untuk testing tanpa email
      },
    }, { status: 201 })
  } catch (e) {
    if (e instanceof z.ZodError) return NextResponse.json({ success: false, error: e.errors[0].message }, { status: 400 })
    console.error('[INVITE POST]', e)
    return NextResponse.json({ success: false, error: 'Gagal mengirim undangan' }, { status: 500 })
  }
}

// GET — list invite yang pending
export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  const invites = await prisma.staffInvite.findMany({
    where: {
      organizationId: user.organizationId,
      acceptedAt:     null,
      expiresAt:      { gt: new Date() }, // hanya yang belum expired
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({ success: true, data: invites })
}

// DELETE — batalkan invite
export async function DELETE(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user)              return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  if (user.role !== 'OWNER') return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })

  const { inviteId } = await req.json()
  await prisma.staffInvite.deleteMany({
    where: { id: inviteId, organizationId: user.organizationId },
  })

  return NextResponse.json({ success: true })
}
