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
  referralCode:     z.string().optional(),   // ← tambahkan ini
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

    // ─── Klaim referral code jika ada ──────────────────────────────────────
    if (body.referralCode) {
      const code = body.referralCode.toUpperCase()

      const referrerOrg = await prisma.organization.findFirst({
        where: { referralCode: code },
      })

      if (referrerOrg && referrerOrg.id !== org.id) {
        const existingReferral = await prisma.referral.findFirst({
          where: {
            referrerOrgId: referrerOrg.id,
            referredEmail: body.email,
            status:        'PENDING',
          },
        })

        if (existingReferral) {
          await prisma.referral.update({
            where: { id: existingReferral.id },
            data: {
              referredOrgId:   org.id,
              referredOrgName: org.name,
              status:          'QUALIFIED',
              qualifiedAt:     new Date(),
            },
          })
        } else {
          await prisma.referral.create({
            data: {
              referrerOrgId:   referrerOrg.id,
              referredOrgId:   org.id,
              referredOrgName: org.name,
              code,
              status:          'QUALIFIED',
              rewardMonths:    1,
              qualifiedAt:     new Date(),
              expiresAt:       new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
            },
          })
        }

        // Tambah kredit ke referrer
        await prisma.organization.update({
          where: { id: referrerOrg.id },
          data:  { referralCredits: { increment: 1 } },
        })
      }
    }
    // ───────────────────────────────────────────────────────────────────────

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
