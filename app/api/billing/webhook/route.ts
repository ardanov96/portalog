import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyMidtransNotification, PLANS, type PlanId } from '@/lib/billing'

// Midtrans mengirim POST ke endpoint ini setiap kali ada perubahan status pembayaran
// Setup: Dashboard Midtrans → Settings → Configuration → Payment Notification URL
// URL: https://yourdomain.com/api/billing/webhook

export async function POST(req: NextRequest) {
  try {
    const notification = await req.json()
    console.log('[WEBHOOK] Midtrans notification:', notification.order_id, notification.transaction_status)

    // Verifikasi signature key dari Midtrans
    const status = await verifyMidtransNotification(notification)

    const {
      order_id,
      transaction_status,
      payment_type,
      gross_amount,
      transaction_time,
    } = notification

    // Cari subscription berdasarkan order_id
    const sub = await prisma.subscription.findFirst({
      where: { lastOrderId: order_id },
      include: { organization: { select: { id: true, name: true, email: true } } },
    })

    if (!sub) {
      console.warn('[WEBHOOK] Subscription tidak ditemukan untuk order:', order_id)
      return NextResponse.json({ message: 'ok' }) // Tetap return 200 agar Midtrans tidak retry
    }

    // Tentukan plan dari amount
    const amount  = parseInt(gross_amount)
    const planId  = detectPlanFromAmount(amount)
    const now     = new Date()

    if (transaction_status === 'settlement' || transaction_status === 'capture') {
      // Pembayaran berhasil
      const periodEnd = new Date(now)
      if (isAnnual(amount, planId)) {
        periodEnd.setFullYear(periodEnd.getFullYear() + 1)
      } else {
        periodEnd.setMonth(periodEnd.getMonth() + 1)
      }

      await prisma.$transaction([
        prisma.subscription.update({
          where: { id: sub.id },
          data: {
            plan:               planId,
            status:             'ACTIVE',
            currentPeriodStart: now,
            currentPeriodEnd:   periodEnd,
            cancelAtPeriodEnd:  false,
            lastPaymentType:    payment_type,
          },
        }),
        prisma.billingHistory.create({
          data: {
            subscriptionId: sub.id,
            orderId:        order_id,
            amount:         amount,
            status:         'settlement',
            paymentType:    payment_type,
            description:    `Pembayaran Portalog ${planId}`,
            paidAt:         new Date(transaction_time),
          },
        }),
      ])

      console.log('[WEBHOOK] Payment settled:', order_id, planId, periodEnd)
    } else if (['cancel', 'expire', 'deny'].includes(transaction_status)) {
      // Pembayaran gagal/expired
      await prisma.subscription.update({
        where: { id: sub.id },
        data:  { status: 'PAST_DUE' },
      })

      await prisma.billingHistory.upsert({
        where:  { orderId: order_id },
        create: {
          subscriptionId: sub.id,
          orderId:        order_id,
          amount:         amount,
          status:         transaction_status,
          paymentType:    payment_type,
        },
        update: { status: transaction_status },
      })

      console.log('[WEBHOOK] Payment failed:', order_id, transaction_status)
    } else if (transaction_status === 'pending') {
      // Waiting for payment
      await prisma.billingHistory.upsert({
        where:  { orderId: order_id },
        create: {
          subscriptionId: sub.id,
          orderId:        order_id,
          amount:         amount,
          status:         'pending',
          paymentType:    payment_type,
        },
        update: { status: 'pending' },
      })
    }

    return NextResponse.json({ message: 'ok' })
  } catch (err: any) {
    console.error('[WEBHOOK] Error:', err)
    // Jangan return 500 — Midtrans akan retry dan kita perlu handle idempotency
    return NextResponse.json({ message: 'error', detail: err.message }, { status: 200 })
  }
}

function detectPlanFromAmount(amount: number): PlanId {
  // Toleransi ±1000 untuk pembayaran partial atau rounding
  if (amount >= PLANS.ENTERPRISE.priceAnnual - 1000)  return 'ENTERPRISE'
  if (amount >= PLANS.ENTERPRISE.price - 1000)         return 'ENTERPRISE'
  if (amount >= PLANS.GROWTH.priceAnnual - 1000)       return 'GROWTH'
  if (amount >= PLANS.GROWTH.price - 1000)             return 'GROWTH'
  return 'STARTER'
}

function isAnnual(amount: number, planId: PlanId): boolean {
  return amount >= PLANS[planId].priceAnnual - 1000
}
