import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { createSessionToken, setSessionCookie } from '@/lib/auth'
import { z } from 'zod'

const schema = z.object({
  email:    z.string().email(),
  password: z.string().min(1),
})

export async function POST(req: NextRequest) {
  try {
    const { email, password } = schema.parse(await req.json())

    const user = await prisma.user.findUnique({
      where: { email, isActive: true },
      include: { organization: { select: { id: true, name: true, slug: true } } },
    })

    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return NextResponse.json({ success: false, error: 'Email atau password salah' }, { status: 401 })
    }

    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } })

    const token = await createSessionToken(user.id)
    await setSessionCookie(token)

    return NextResponse.json({
      success: true,
      data: {
        id: user.id, name: user.name, email: user.email,
        role: user.role, organization: user.organization,
      },
    })
  } catch (e) {
    if (e instanceof z.ZodError) return NextResponse.json({ success: false, error: 'Data tidak valid' }, { status: 400 })
    console.error('[LOGIN]', e)
    return NextResponse.json({ success: false, error: 'Kesalahan server' }, { status: 500 })
  }
}
