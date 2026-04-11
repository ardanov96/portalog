import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { createSessionToken, setSessionCookie } from '@/lib/auth'

type Ctx = { params: Promise<{ token: string }> }

// GET — validate invite token (untuk halaman accept)
export async function GET(_: NextRequest, { params }: Ctx) {
  const { token } = await params

  const invite = await prisma.staffInvite.findUnique({
    where:   { token },
    include: { organization: { select: { id: true, name: true, logoUrl: true } } },
  })

  if (!invite) {
    return NextResponse.json({ success: false, error: 'Link undangan tidak valid atau sudah kadaluarsa' }, { status: 404 })
  }

  if (invite.acceptedAt) {
    return NextResponse.json({ success: false, error: 'Undangan ini sudah diterima sebelumnya' }, { status: 410 })
  }

  if (new Date() > invite.expiresAt) {
    return NextResponse.json({ success: false, error: 'Link undangan sudah kadaluarsa. Minta Owner untuk mengirim ulang undangan.' }, { status: 410 })
  }

  return NextResponse.json({
    success: true,
    data: {
      email:        invite.email,
      name:         invite.name,
      role:         invite.role,
      organization: invite.organization,
      expiresAt:    invite.expiresAt,
    },
  })
}

const acceptSchema = z.object({
  name:     z.string().min(2, 'Nama minimal 2 karakter'),
  password: z.string().min(8, 'Password minimal 8 karakter'),
})

// POST — terima undangan dan buat akun
export async function POST(req: NextRequest, { params }: Ctx) {
  const { token } = await params

  try {
    const body = acceptSchema.parse(await req.json())

    const invite = await prisma.staffInvite.findUnique({
      where: { token },
    })

    if (!invite)           return NextResponse.json({ success: false, error: 'Link tidak valid' }, { status: 404 })
    if (invite.acceptedAt) return NextResponse.json({ success: false, error: 'Undangan sudah diterima' }, { status: 410 })
    if (new Date() > invite.expiresAt) return NextResponse.json({ success: false, error: 'Undangan sudah kadaluarsa' }, { status: 410 })

    // Cek email belum dipakai
    const emailTaken = await prisma.user.findUnique({ where: { email: invite.email } })
    if (emailTaken) return NextResponse.json({ success: false, error: 'Email ini sudah terdaftar' }, { status: 409 })

    const hash = await bcrypt.hash(body.password, 12)

    // Buat user dan tandai invite sebagai diterima dalam satu transaksi
    const newUser = await prisma.$transaction(async (tx) => {
      const u = await tx.user.create({
        data: {
          organizationId: invite.organizationId,
          name:           body.name,
          email:          invite.email,
          passwordHash:   hash,
          role:           invite.role,
          isActive:       true,
        },
      })

      await tx.staffInvite.update({
        where: { id: invite.id },
        data:  { acceptedAt: new Date() },
      })

      return u
    })

    // Login otomatis setelah daftar
    const sessionToken = await createSessionToken(newUser.id)
    await setSessionCookie(sessionToken)

    return NextResponse.json({
      success: true,
      data: {
        id:    newUser.id,
        name:  newUser.name,
        email: newUser.email,
        role:  newUser.role,
      },
    })
  } catch (e) {
    if (e instanceof z.ZodError) return NextResponse.json({ success: false, error: e.errors[0].message }, { status: 400 })
    console.error('[INVITE ACCEPT]', e)
    return NextResponse.json({ success: false, error: 'Gagal memproses undangan' }, { status: 500 })
  }
}
