import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { createSessionToken } from '@/lib/auth'
import { z } from 'zod'

const schema = z.object({
  email:    z.string().email(),
  password: z.string().min(1),
})

const COOKIE_NAME = 'ff_session'

export async function POST(req: NextRequest) {
  try {
    const { email, password } = schema.parse(await req.json())

    const user = await prisma.user.findUnique({
      where: { email, isActive: true },
      include: { organization: { select: { id: true, name: true, slug: true } } },
    })

    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return NextResponse.json(
        { success: false, error: 'Email atau password salah' },
        { status: 401 }
      )
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    })

    const token = await createSessionToken(user.id)

    // ✅ Set cookie langsung di NextResponse, bukan via cookies() helper
    const response = NextResponse.json({
      success: true,
      data: {
        id:           user.id,
        name:         user.name,
        email:        user.email,
        role:         user.role,
        organization: user.organization,
      },
    })

    response.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure:   process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge:   60 * 60 * 24 * 7,
      path:     '/',
    })

    return response

  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Data tidak valid' },
        { status: 400 }
      )
    }
    console.error('[LOGIN]', e)
    return NextResponse.json(
      { success: false, error: 'Kesalahan server' },
      { status: 500 }
    )
  }
}