// ─── lib/midtrans.ts ──────────────────────────────────────────────────────────
// Midtrans Snap + Core API helper
// Docs: https://docs.midtrans.com/reference/snap-api

// ─── Plan definitions ─────────────────────────────────────────────────────────

export const PLANS = {
  STARTER: {
    id:          'STARTER' as const,
    name:        'Starter',
    price:       299_000,
    description: 'Untuk FF kecil yang baru berkembang',
    features: [
      'Hingga 50 shipment/bulan',
      '2 pengguna (1 Owner + 1 Staff)',
      'Manajemen dokumen',
      'Invoice & laporan dasar',
      'Email notifikasi klien',
      'Support via email',
    ],
    highlight: false,
  },
  GROWTH: {
    id:          'GROWTH' as const,
    name:        'Growth',
    price:       599_000,
    description: 'Untuk FF yang sedang berkembang pesat',
    features: [
      'Hingga 200 shipment/bulan',
      '5 pengguna',
      'Semua fitur Starter',
      'Portal klien white-label',
      'Vessel tracking real-time',
      'AI delay prediction',
      'API access',
      'Priority support',
    ],
    highlight: true,
  },
  ENTERPRISE: {
    id:          'ENTERPRISE' as const,
    name:        'Enterprise',
    price:       1_299_000,
    description: 'Untuk FF besar & PPJK skala nasional',
    features: [
      'Shipment tidak terbatas',
      'Pengguna tidak terbatas',
      'Semua fitur Growth',
      'Custom domain white-label',
      'Dedicated account manager',
      'SLA 99.9% uptime',
      'On-boarding & training',
      'Custom integrations',
    ],
    highlight: false,
  },
} as const

export type PlanKey = keyof typeof PLANS

export function getPlanPrice(plan: PlanKey): number {
  return PLANS[plan]?.price ?? 0
}

export function getPlanName(plan: PlanKey): string {
  return PLANS[plan]?.name ?? plan
}

// ─── Midtrans Snap ────────────────────────────────────────────────────────────

const MIDTRANS_BASE_URL = process.env.MIDTRANS_IS_PRODUCTION === 'true'
  ? 'https://app.midtrans.com/snap/v1'
  : 'https://app.sandbox.midtrans.com/snap/v1'

function getAuthHeader(): string {
  const serverKey = process.env.MIDTRANS_SERVER_KEY ?? ''
  return `Basic ${Buffer.from(serverKey + ':').toString('base64')}`
}

export interface SnapTransactionParams {
  orderId:       string
  amount:        number
  customerName:  string
  customerEmail: string
  itemName:      string
  itemId:        string
}

export interface SnapTransactionResult {
  token:        string
  redirect_url: string
}

export async function createSnapTransaction(
  params: SnapTransactionParams
): Promise<SnapTransactionResult> {
  const payload = {
    transaction_details: {
      order_id:     params.orderId,
      gross_amount: params.amount,
    },
    item_details: [{
      id:       params.itemId,
      price:    params.amount,
      quantity: 1,
      name:     params.itemName,
    }],
    customer_details: {
      first_name: params.customerName,
      email:      params.customerEmail,
    },
    enabled_payments: [
      // Virtual Account
      'bca_va', 'bni_va', 'bri_va', 'mandiri_bill', 'permata_va', 'other_va',
      // QRIS & E-wallet
      'gopay', 'qris', 'shopeepay',
      // Credit/Debit card
      'credit_card',
      // Over the counter
      'indomaret', 'alfamart',
    ],
    credit_card: {
      secure: true,
    },
    expiry: {
      unit:     'hours',
      duration: 24,
    },
  }

  const res = await fetch(`${MIDTRANS_BASE_URL}/transactions`, {
    method:  'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': getAuthHeader(),
    },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error_messages?.[0] ?? 'Midtrans error')
  }

  return res.json()
}

// ─── Webhook signature verifier ───────────────────────────────────────────────

import crypto from 'crypto'

export function verifyMidtransSignature(params: {
  orderId:         string
  statusCode:      string
  grossAmount:     string
  signatureKey:    string
}): boolean {
  const serverKey = process.env.MIDTRANS_SERVER_KEY ?? ''
  const hash = crypto
    .createHash('sha512')
    .update(`${params.orderId}${params.statusCode}${params.grossAmount}${serverKey}`)
    .digest('hex')
  return hash === params.signatureKey
}

// ─── Order ID generator ───────────────────────────────────────────────────────

export function generateOrderId(orgId: string, plan: PlanKey): string {
  const ts   = Date.now()
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase()
  return `PLG-${plan}-${orgId.slice(-6).toUpperCase()}-${ts}-${rand}`
}
