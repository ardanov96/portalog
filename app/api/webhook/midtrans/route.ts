// app/api/webhooks/midtrans/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyMidtransSignature } from '@/lib/midtrans'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    const {
      order_id:          orderId,
      transaction_status: txStatus,
      fraud_status:       fraudStatus,
      payment_type:       paymentType,
      gross_amount:       grossAmount,
      status_code:        statusCode,
      signature_key:      signatureKey,
    } = body

    // ── 1. Verifikasi signature ───────────────────────────────────────────────
    const isValid = verifyMidtransSignature({
      orderId, statusCode, grossAmount, signatureKey,
    })
    if (!isValid) {
      console.warn('[WEBHOOK] Invalid signature for order:', orderId)
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
    }

    // ── 2. Tentukan status final ──────────────────────────────────────────────
    // settlement = lunas, capture (fraud ok) = lunas CC
    const isSuccess = txStatus === 'settlement' ||
      (txStatus === 'capture' && fraudStatus === 'accept')
    const isFailed  = ['cancel', 'deny', 'expire'].includes(txStatus)

    const finalStatus = isSuccess ? 'settlement'
      : isFailed       ? txStatus
      : 'pending'

    // ── 3. Cari BillingHistory by orderId ─────────────────────────────────────
    const billing = await prisma.billingHistory.findUnique({
      where:   { orderId },
      include: { subscription: { include: { organization: true } } },
    })
    if (!billing) {
      console.warn('[WEBHOOK] BillingHistory not found for order:', orderId)
      return NextResponse.json({ received: true }) // tetap 200 agar Midtrans tidak retry
    }

    // ── 4. Update BillingHistory ──────────────────────────────────────────────
    await prisma.billingHistory.update({
      where: { orderId },
      data: {
        status:      finalStatus,
        paymentType: paymentType ?? null,
        paidAt:      isSuccess ? new Date() : null,
      },
    })

    if (!isSuccess) {
      return NextResponse.json({ received: true })
    }

    // ── 5. Jika sukses: update Subscription ───────────────────────────────────
    const sub = billing.subscription
    const org = sub.organization

    // Parse plan dari orderId: PLG-STARTER-xxx / PLG-GROWTH-xxx / PLG-ENTERPRISE-xxx
    const planMatch = orderId.match(/^PLG-(STARTER|GROWTH|ENTERPRISE)-/)
    const newPlan   = planMatch?.[1] as 'STARTER' | 'GROWTH' | 'ENTERPRISE' | undefined

    const now          = new Date()
    const periodStart  = now
    const periodEnd    = new Date(now)
    periodEnd.setMonth(periodEnd.getMonth() + 1)

    await prisma.subscription.update({
      where: { id: sub.id },
      data: {
        plan:               newPlan ?? sub.plan,
        status:             'ACTIVE',
        currentPeriodStart: periodStart,
        currentPeriodEnd:   periodEnd,
        lastOrderId:        orderId,
        lastPaymentType:    paymentType ?? null,
        cancelAtPeriodEnd:  false,
      },
    })

    // ── 6. Klaim referral credit jika ada QUALIFIED ───────────────────────────
    const qualifiedReferrals = await prisma.referral.findMany({
      where: { referredOrgId: org.id, status: 'QUALIFIED' },
    })

    for (const referral of qualifiedReferrals) {
      // Update referral → REWARDED
      await prisma.referral.update({
        where: { id: referral.id },
        data: {
          status:          'REWARDED',
          rewardAppliedAt: now,
        },
      })

      // Tambah kredit ke org referrer
      await prisma.organization.update({
        where: { id: referral.referrerOrgId },
        data:  { referralCredits: { increment: referral.rewardMonths } },
      })
    }

    // ── 7. Kurangi referralCredits jika dipakai ───────────────────────────────
    // (Opsional: pakai kredit referrer untuk perpanjang subscription mereka sendiri)
    // Logic ini bisa ditambahkan nanti saat billing cycle berikutnya

    console.log(`[WEBHOOK] Payment success: ${orderId} | Org: ${org.name} | Plan: ${newPlan}`)

    return NextResponse.json({ received: true })
  } catch (err) {
    console.error('[WEBHOOK /midtrans]', err)
    return NextResponse.json({ error: 'Webhook error' }, { status: 500 })
  }
}
