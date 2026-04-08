import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { createSessionToken, setSessionCookie } from '@/lib/auth'
import { slugify } from '@/lib/utils'
import { z } from 'zod'

const schema = z.object({
  name:             z.string().min(2),
  email:            z.string().email(),
  password:         z.string().min(8, 'Password minimal 8 karakter'),
  organizationName: z.string().min(3),
})

export async function POST(req: NextRequest) {
  try {
    const body = schema.parse(await req.json())

    if (await prisma.user.findUnique({ where: { email: body.email } })) {
      return NextResponse.json({ success: false, error: 'Email sudah terdaftar' }, { status: 409 })
    }

    // unique slug
    let slug = slugify(body.organizationName)
    let i = 1
    while (await prisma.organization.findUnique({ where: { slug } })) slug = `${slugify(body.organizationName)}-${i++}`

    const hash = await bcrypt.hash(body.password, 12)

    const { org, user } = await prisma.$transaction(async (tx) => {
      const org  = await tx.organization.create({ data: { name: body.organizationName, slug } })
      const user = await tx.user.create({
        data: { organizationId: org.id, name: body.name, email: body.email, passwordHash: hash, role: 'OWNER' },
      })
      return { org, user }
    })

    const token = await createSessionToken(user.id)
    await setSessionCookie(token)

    return NextResponse.json({
      success: true,
      data: { id: user.id, name: user.name, email: user.email, role: user.role, organization: { id: org.id, name: org.name, slug: org.slug } },
    }, { status: 201 })
  } catch (e) {
    if (e instanceof z.ZodError) return NextResponse.json({ success: false, error: e.errors[0].message }, { status: 400 })
    console.error('[REGISTER]', e)
    return NextResponse.json({ success: false, error: 'Kesalahan server' }, { status: 500 })
  }
}
