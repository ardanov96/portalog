import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { PLANS, createMidtransSnapToken, type PlanId } from '@/lib/billing'
import { z } from 'zod'

const schema = z.object({
  planId:   z.enum(['STARTER', 'GROWTH', 'ENTERPRISE']),
  billing:  z.enum(['monthly', 'annual']).default('monthly'),
})

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  if (user.role !== 'OWNER') return NextResponse.json({ success: false, error: 'Hanya Owner yang bisa manage billing' }, { status: 403 })

  try {
    const { planId, billing } = schema.parse(await req.json())
    const plan   = PLANS[planId as PlanId]
    const amount = billing === 'annual' ? plan.priceAnnual : plan.price

    const orderId = `FOS-${user.organizationId.slice(-8).toUpperCase()}-${Date.now()}`

    // Ambil email dari org kalau ada
    const org = await prisma.organization.findUnique({
      where:  { id: user.organizationId },
      select: { email: true, name: true },
    })

    const snapData = await createMidtransSnapToken({
      orderId,
      amount,
      customerName:  user.name,
      customerEmail: org?.email ?? user.email,
      description:   `ForwarderOS ${plan.name} — ${billing === 'annual' ? 'Tahunan' : 'Bulanan'}`,
    })

    // Simpan pending order di subscription
    await prisma.subscription.upsert({
      where:  { organizationId: user.organizationId },
      create: {
        organizationId: user.organizationId,
        plan:           planId,
        status:         'PAST_DUE',
        lastOrderId:    orderId,
      },
      update: {
        lastOrderId: orderId,
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        snapToken:   snapData.token,
        redirectUrl: snapData.redirect_url,
        orderId,
        amount,
        planId,
      },
    })
  } catch (e: any) {
    console.error('[BILLING CHECKOUT]', e)
    return NextResponse.json({ success: false, error: e.message || 'Gagal membuat sesi pembayaran' }, { status: 500 })
  }
}
