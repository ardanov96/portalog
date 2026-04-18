import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createPortalToken } from '@/lib/portal-auth'
import { cookies } from 'next/headers'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

const PORTAL_COOKIE = 'ff_portal_session'

const loginSchema = z.object({
  email:    z.string().email(),
  password: z.string().min(1),
})

// POST /api/portal/auth — portal login
export async function POST(req: NextRequest) {
  try {
    const { email, password } = loginSchema.parse(await req.json())

    const client = await prisma.client.findFirst({
      where: { portalEmail: email, isActive: true },
      include: { organization: { select: { id: true, name: true } } },
    })

    if (!client || !client.portalPasswordHash) {
      return NextResponse.json({ success: false, error: 'Email atau password salah' }, { status: 401 })
    }

    const valid = await bcrypt.compare(password, client.portalPasswordHash)
    if (!valid) {
      return NextResponse.json({ success: false, error: 'Email atau password salah' }, { status: 401 })
    }

    const token = await createPortalToken(client.id)
    const jar   = await cookies()
    jar.set(PORTAL_COOKIE, token, {
      httpOnly: true,
      secure:   process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge:   60 * 60 * 24 * 30,
      path:     '/',
    })

    return NextResponse.json({
      success: true,
      data: {
        id:           client.id,
        name:         client.name,
        companyName:  client.companyName,
        email:        client.portalEmail,
        organization: client.organization,
      },
    })
  } catch (e) {
    if (e instanceof z.ZodError) return NextResponse.json({ success: false, error: 'Data tidak valid' }, { status: 400 })
    return NextResponse.json({ success: false, error: 'Kesalahan server' }, { status: 500 })
  }
}

// DELETE /api/portal/auth — portal logout
export async function DELETE() {
  const jar = await cookies()
  jar.delete(PORTAL_COOKIE)
  return NextResponse.json({ success: true })
}
