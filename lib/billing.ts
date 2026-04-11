// ─── Billing config & Midtrans helper ────────────────────────────────────────
// Docs: https://docs.midtrans.com
// Gunakan Midtrans Snap untuk halaman pembayaran (tidak perlu redirect ke Midtrans)
// Setup:
//   1. Daftar di dashboard.midtrans.com (atau sandbox.midtrans.com untuk testing)
//   2. Settings → Access Keys → copy Server Key & Client Key
//   3. Isi .env:
//      MIDTRANS_SERVER_KEY="SB-Mid-server-xxx" (sandbox) atau "Mid-server-xxx" (prod)
//      MIDTRANS_CLIENT_KEY="SB-Mid-client-xxx"
//      MIDTRANS_IS_PRODUCTION="false"  → "true" saat go-live

// ─── Plan definitions ─────────────────────────────────────────────────────────

export type PlanId = 'STARTER' | 'GROWTH' | 'ENTERPRISE'

export interface Plan {
  id:           PlanId
  name:         string
  price:        number       // IDR per bulan
  priceAnnual:  number       // IDR per tahun (diskon ~17%)
  description:  string
  color:         string
  limits: {
    users:       number      // -1 = unlimited
    shipments:   number      // per bulan, -1 = unlimited
    clients:     number      // -1 = unlimited
    storage:     number      // GB
    portal:      boolean
    aiFeatures:  boolean
    analytics:   boolean
    apiAccess:   boolean
  }
  features: string[]
}

export const PLANS: Record<PlanId, Plan> = {
  STARTER: {
    id:           'STARTER',
    name:         'Starter',
    price:        299_000,
    priceAnnual:  2_990_000,
    description:  'Untuk FF kecil yang baru mulai digitalisasi',
    color:        '#3b82f6',
    limits: {
      users:      2,
      shipments:  50,
      clients:    20,
      storage:    5,
      portal:     true,
      aiFeatures: false,
      analytics:  false,
      apiAccess:  false,
    },
    features: [
      '2 pengguna (owner + 1 staff)',
      '50 shipment/bulan',
      '20 klien',
      '5 GB storage dokumen',
      'Client portal tracking',
      'Notifikasi WA & email',
      'Invoice PDF',
    ],
  },
  GROWTH: {
    id:           'GROWTH',
    name:         'Growth',
    price:        699_000,
    priceAnnual:  6_990_000,
    description:  'Untuk FF yang sedang berkembang',
    color:        '#7c3aed',
    limits: {
      users:      10,
      shipments:  -1,
      clients:    -1,
      storage:    50,
      portal:     true,
      aiFeatures: true,
      analytics:  true,
      apiAccess:  false,
    },
    features: [
      '10 pengguna',
      'Shipment & klien unlimited',
      '50 GB storage dokumen',
      'AI suggest HS Code',
      'Laporan & analytics',
      'Semua fitur Starter',
    ],
  },
  ENTERPRISE: {
    id:           'ENTERPRISE',
    name:         'Enterprise',
    price:        1_499_000,
    priceAnnual:  14_990_000,
    description:  'Untuk FF besar dengan kebutuhan custom',
    color:        '#059669',
    limits: {
      users:      -1,
      shipments:  -1,
      clients:    -1,
      storage:    500,
      portal:     true,
      aiFeatures: true,
      analytics:  true,
      apiAccess:  true,
    },
    features: [
      'Pengguna unlimited',
      'Shipment & klien unlimited',
      '500 GB storage dokumen',
      'OCR dokumen (coming soon)',
      'API access',
      'Priority support',
      'Semua fitur Growth',
    ],
  },
}

// Trial config
export const TRIAL_DAYS = 14
export const TRIAL_PLAN_LIMITS = PLANS.GROWTH.limits // Trial = Growth features

// ─── Feature gate helper ──────────────────────────────────────────────────────

import { prisma } from './prisma'

export type SubscriptionInfo = {
  plan:      string
  status:    string
  isActive:  boolean
  isTrial:   boolean
  daysLeft:  number | null
  limits:    typeof PLANS.STARTER.limits
  trialEndsAt?: Date | null
  currentPeriodEnd?: Date | null
}

export async function getSubscription(organizationId: string): Promise<SubscriptionInfo> {
  const sub = await prisma.subscription.findUnique({
    where: { organizationId },
  })

  const now = new Date()

  // Tidak ada subscription → anggap masih trial baru (dari register)
  if (!sub) {
    return {
      plan:     'TRIAL',
      status:   'TRIALING',
      isActive: true,
      isTrial:  true,
      daysLeft: TRIAL_DAYS,
      limits:   TRIAL_PLAN_LIMITS,
    }
  }

  const isTrial    = sub.status === 'TRIALING'
  const trialLeft  = sub.trialEndsAt ? Math.max(0, Math.ceil((sub.trialEndsAt.getTime() - now.getTime()) / 86_400_000)) : null
  const periodLeft = sub.currentPeriodEnd ? Math.max(0, Math.ceil((sub.currentPeriodEnd.getTime() - now.getTime()) / 86_400_000)) : null

  const isActive = sub.status === 'ACTIVE' || (isTrial && (trialLeft ?? 0) > 0)
  const planLimits = isTrial
    ? TRIAL_PLAN_LIMITS
    : PLANS[sub.plan as PlanId]?.limits ?? PLANS.STARTER.limits

  return {
    plan:    sub.plan,
    status:  sub.status,
    isActive,
    isTrial,
    daysLeft: isTrial ? trialLeft : periodLeft,
    limits:  planLimits,
    trialEndsAt:       sub.trialEndsAt,
    currentPeriodEnd:  sub.currentPeriodEnd,
  }
}

export async function canPerformAction(
  organizationId: string,
  action: 'create_shipment' | 'create_client' | 'add_user' | 'use_ai' | 'view_analytics'
): Promise<{ allowed: boolean; reason?: string }> {
  const sub = await getSubscription(organizationId)

  if (!sub.isActive) {
    return { allowed: false, reason: 'Subscription tidak aktif. Perbarui langganan untuk melanjutkan.' }
  }

  const limits = sub.limits

  if (action === 'use_ai' && !limits.aiFeatures) {
    return { allowed: false, reason: 'Fitur AI tersedia di paket Growth ke atas.' }
  }

  if (action === 'view_analytics' && !limits.analytics) {
    return { allowed: false, reason: 'Laporan & analytics tersedia di paket Growth ke atas.' }
  }

  if (action === 'create_shipment' && limits.shipments !== -1) {
    const now = new Date()
    const som = new Date(now.getFullYear(), now.getMonth(), 1)
    const count = await prisma.shipment.count({
      where: { organizationId, createdAt: { gte: som } },
    })
    if (count >= limits.shipments) {
      return { allowed: false, reason: `Batas ${limits.shipments} shipment/bulan tercapai. Upgrade ke Growth untuk unlimited.` }
    }
  }

  if (action === 'create_client' && limits.clients !== -1) {
    const count = await prisma.client.count({ where: { organizationId } })
    if (count >= limits.clients) {
      return { allowed: false, reason: `Batas ${limits.clients} klien tercapai. Upgrade ke Growth untuk unlimited.` }
    }
  }

  if (action === 'add_user' && limits.users !== -1) {
    const count = await prisma.user.count({ where: { organizationId, isActive: true } })
    if (count >= limits.users) {
      return { allowed: false, reason: `Batas ${limits.users} pengguna tercapai. Upgrade untuk menambah lebih banyak staff.` }
    }
  }

  return { allowed: true }
}

// ─── Midtrans helpers ─────────────────────────────────────────────────────────

function midtransBase64() {
  const key = process.env.MIDTRANS_SERVER_KEY ?? ''
  return Buffer.from(`${key}:`).toString('base64')
}

function midtransBaseUrl() {
  const isProd = process.env.MIDTRANS_IS_PRODUCTION === 'true'
  return isProd
    ? 'https://app.midtrans.com'
    : 'https://app.sandbox.midtrans.com'
}

export async function createMidtransSnapToken(options: {
  orderId:      string
  amount:       number
  customerName: string
  customerEmail: string
  description:  string
  callbackUrl?: string
}) {
  const url = `${midtransBaseUrl()}/snap/v1/transactions`

  const body = {
    transaction_details: {
      order_id:     options.orderId,
      gross_amount: options.amount,
    },
    credit_card: { secure: true },
    customer_details: {
      first_name: options.customerName,
      email:      options.customerEmail,
    },
    item_details: [
      {
        id:       options.orderId,
        price:    options.amount,
        quantity: 1,
        name:     options.description.slice(0, 50),
      },
    ],
    callbacks: {
      finish:  options.callbackUrl ?? `${process.env.NEXT_PUBLIC_APP_URL}/billing?payment=success`,
      unfinish:`${process.env.NEXT_PUBLIC_APP_URL}/billing?payment=unfinish`,
      error:   `${process.env.NEXT_PUBLIC_APP_URL}/billing?payment=error`,
    },
    expiry: { unit: 'hour', duration: 24 },
  }

  const res = await fetch(url, {
    method:  'POST',
    headers: {
      Authorization:  `Basic ${midtransBase64()}`,
      'Content-Type': 'application/json',
      Accept:         'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Midtrans error: ${err}`)
  }

  return res.json() as Promise<{ token: string; redirect_url: string }>
}

export async function verifyMidtransNotification(notification: Record<string, string>) {
  const { createHash } = await import('crypto')
  const {
    order_id, status_code, gross_amount, transaction_status, signature_key,
  } = notification

  const serverKey = process.env.MIDTRANS_SERVER_KEY ?? ''
  const expected  = createHash('sha512')
    .update(`${order_id}${status_code}${gross_amount}${serverKey}`)
    .digest('hex')

  if (expected !== signature_key) {
    throw new Error('Signature tidak valid')
  }

  return transaction_status
}

export function formatRupiahBilling(amount: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount)
}
