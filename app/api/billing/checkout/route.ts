// app/api/billing/checkout/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import {
  createSnapTransaction,
  generateOrderId,
  getPlanName,
  getPlanPrice,
  type PlanKey,
  PLANS,
} from '@/lib/midtrans'

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  try {
    const { plan } = await req.json() as { plan: PlanKey }

    if (!PLANS[plan]) {
      return NextResponse.json({ success: false, error: 'Plan tidak valid' }, { status: 400 })
    }

    // Ambil data org + subscription
    const org = await prisma.organization.findUnique({
      where:   { id: user.organizationId },
      include: { subscription: true },
    })
    if (!org) return NextResponse.json({ success: false, error: 'Org tidak ditemukan' }, { status: 404 })

    const amount  = getPlanPrice(plan)
    const orderId = generateOrderId(org.id, plan)

    // Buat Snap transaction di Midtrans
    const snap = await createSnapTransaction({
      orderId,
      amount,
      customerName:  user.name,
      customerEmail: user.email,
      itemName:      `Portalog ${getPlanName(plan)} - 1 Bulan`,
      itemId:        `plan_${plan.toLowerCase()}`,
    })

    // Simpan order pending ke BillingHistory
    const sub = org.subscription
    if (sub) {
      await prisma.billingHistory.create({
        data: {
          subscriptionId: sub.id,
          orderId,
          amount,
          status:      'pending',
          description: `Portalog ${getPlanName(plan)} - 1 Bulan`,
        },
      })

      // Update lastOrderId di subscription
      await prisma.subscription.update({
        where: { id: sub.id },
        data:  { lastOrderId: orderId },
      })
    }

    return NextResponse.json({
      success:     true,
      snapToken:   snap.token,
      redirectUrl: snap.redirect_url,
      orderId,
    })
  } catch (err: any) {
    console.error('[POST /api/billing/checkout]', err)
    return NextResponse.json({ success: false, error: err.message ?? 'Gagal membuat transaksi' }, { status: 500 })
  }
}
