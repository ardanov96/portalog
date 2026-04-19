'use client'

import { useState, useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'
import { PLANS, formatRupiahBilling, type PlanId } from '@/lib/billing'
import {
  Check, Zap, Crown, Building2, AlertTriangle,
  RefreshCw, Clock, CreditCard, ChevronRight,
  X, Loader2, ExternalLink, Calendar, Receipt,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface SubscriptionInfo {
  plan:     string; status:  string; isActive: boolean; isTrial: boolean
  daysLeft: number | null; limits: any
  trialEndsAt?: string; currentPeriodEnd?: string
}
interface BillingItem {
  id: string; orderId: string; amount: number; status: string
  paymentType: string | null; paidAt: string | null; createdAt: string
  description: string | null
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_CFG: Record<string, { label: string; bg: string; text: string }> = {
  TRIALING:  { label: 'Trial',       bg: 'bg-amber-50',  text: 'text-amber-700'  },
  ACTIVE:    { label: 'Aktif',       bg: 'bg-green-50',  text: 'text-green-700'  },
  PAST_DUE:  { label: 'Belum Bayar', bg: 'bg-red-50',    text: 'text-red-700'    },
  CANCELLED: { label: 'Dibatalkan',  bg: 'bg-slate-100', text: 'text-slate-600'  },
  EXPIRED:   { label: 'Kadaluarsa',  bg: 'bg-red-100',   text: 'text-red-800'    },
}

const PAYMENT_STATUS_CFG: Record<string, { label: string; color: string }> = {
  settlement: { label: 'Berhasil', color: 'text-green-600' },
  pending:    { label: 'Pending',  color: 'text-amber-600' },
  cancel:     { label: 'Batal',    color: 'text-slate-500' },
  expire:     { label: 'Expired',  color: 'text-red-500'   },
  deny:       { label: 'Ditolak',  color: 'text-red-600'   },
}

const PLAN_ICON: Record<string, any> = {
  STARTER:    Zap,
  GROWTH:     Crown,
  ENTERPRISE: Building2,
  TRIAL:      Clock,
}

function formatDate(d?: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
}

// ─── Plan card ────────────────────────────────────────────────────────────────

function PlanCard({
  planId, billing, currentPlan, isActive, onSelect, loading,
}: {
  planId: PlanId; billing: 'monthly' | 'annual'
  currentPlan: string; isActive: boolean
  onSelect: (id: PlanId) => void; loading: boolean
}) {
  const plan    = PLANS[planId]
  const price   = billing === 'annual' ? plan.priceAnnual : plan.price
  const isCurrent = currentPlan === planId && isActive
  const Icon    = PLAN_ICON[planId] ?? Zap

  return (
    <div className={cn(
      'relative border rounded-2xl p-5 transition-all',
      isCurrent
        ? 'border-brand-400 bg-brand-50 ring-2 ring-brand-100'
        : planId === 'GROWTH'
        ? 'border-violet-300 bg-white'
        : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'
    )}>
      {planId === 'GROWTH' && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-violet-600 text-white text-[10px] font-bold rounded-full whitespace-nowrap">
          Paling Populer
        </div>
      )}
      {isCurrent && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-brand-600 text-white text-[10px] font-bold rounded-full whitespace-nowrap">
          Paket Anda
        </div>
      )}

      <div className="flex items-center gap-2.5 mb-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${plan.color}18` }}>
          <Icon className="w-4.5 h-4.5" style={{ color: plan.color }} />
        </div>
        <div>
          <p className="text-sm font-bold text-slate-900">{plan.name}</p>
          <p className="text-[10px] text-slate-400">{plan.description}</p>
        </div>
      </div>

      <div className="mb-4">
        <span className="text-2xl font-bold text-slate-900">{formatRupiahBilling(price)}</span>
        <span className="text-xs text-slate-400 ml-1">/{billing === 'annual' ? 'tahun' : 'bulan'}</span>
        {billing === 'annual' && (
          <p className="text-[10px] text-green-600 font-semibold mt-0.5">
            Hemat {formatRupiahBilling((plan.price * 12) - plan.priceAnnual)}/tahun
          </p>
        )}
      </div>

      <ul className="space-y-1.5 mb-5">
        {plan.features.map(f => (
          <li key={f} className="flex items-start gap-2 text-xs text-slate-600">
            <Check className="w-3.5 h-3.5 text-green-500 shrink-0 mt-0.5" />
            {f}
          </li>
        ))}
      </ul>

      <button
        onClick={() => onSelect(planId)}
        disabled={isCurrent || loading}
        className={cn(
          'w-full py-2.5 rounded-xl text-sm font-semibold transition-all',
          isCurrent
            ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
            : planId === 'GROWTH'
            ? 'bg-violet-600 text-white hover:bg-violet-700 active:scale-[0.98]'
            : 'bg-brand-600 text-white hover:bg-brand-700 active:scale-[0.98]'
        )}
      >
        {isCurrent ? 'Paket aktif' : `Pilih ${plan.name}`}
      </button>
    </div>
  )
}

// ─── Checkout modal ───────────────────────────────────────────────────────────

function CheckoutModal({
  planId, billing, onClose, onSuccess,
}: {
  planId: PlanId; billing: 'monthly' | 'annual'
  onClose: () => void; onSuccess: () => void
}) {
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [snapReady, setSnapReady] = useState(false)
  const plan  = PLANS[planId]
  const price = billing === 'annual' ? plan.priceAnnual : plan.price

  // Load Midtrans Snap.js
  useEffect(() => {
    const clientKey = process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY
    if (!clientKey) { console.warn('NEXT_PUBLIC_MIDTRANS_CLIENT_KEY tidak di-set'); return }

    const isProduction = process.env.NEXT_PUBLIC_MIDTRANS_IS_PRODUCTION === 'true'
    const snapUrl = isProduction
      ? 'https://app.midtrans.com/snap/snap.js'
      : 'https://app.sandbox.midtrans.com/snap/snap.js'

    if (document.querySelector(`script[src="${snapUrl}"]`)) { setSnapReady(true); return }

    const script    = document.createElement('script')
    script.src      = snapUrl
    script.setAttribute('data-client-key', clientKey)
    script.onload   = () => setSnapReady(true)
    script.onerror  = () => setError('Gagal load Midtrans Snap. Cek koneksi internet.')
    document.head.appendChild(script)
  }, [])

  const handlePayment = async () => {
    if (!snapReady) { setError('Midtrans belum siap'); return }
    setLoading(true); setError('')

    try {
      const res  = await fetch('/api/billing/checkout', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ planId, billing }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)

      // Buka Snap popup
      ;(window as any).snap?.pay(data.data.snapToken, {
        onSuccess: () => { onSuccess() },
        onPending: () => { onSuccess() }, // juga refresh untuk tampilkan pending
        onError:   (err: any) => { setError('Pembayaran gagal: ' + (err.message ?? err)) },
        onClose:   () => { setLoading(false) },
      })
    } catch (e: any) {
      setError(e.message || 'Gagal membuat sesi pembayaran')
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-slate-900">Konfirmasi Langganan</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="bg-slate-50 rounded-xl p-4 mb-4 border border-slate-200">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-semibold text-slate-800">Portalog {plan.name}</span>
            <span className="text-xs text-slate-400">{billing === 'annual' ? 'Tahunan' : 'Bulanan'}</span>
          </div>
          <p className="text-xl font-bold text-slate-900">{formatRupiahBilling(price)}</p>
          {billing === 'annual' && (
            <p className="text-xs text-green-600 mt-0.5">Termasuk diskon tahunan</p>
          )}
        </div>

        <ul className="space-y-1.5 mb-5">
          {['Pembayaran aman via Midtrans', 'Transfer bank, QRIS, kartu kredit', 'Aktif otomatis setelah pembayaran', 'Bisa dibatalkan kapan saja'].map(t => (
            <li key={t} className="flex items-center gap-2 text-xs text-slate-600">
              <Check className="w-3.5 h-3.5 text-green-500 shrink-0" /> {t}
            </li>
          ))}
        </ul>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-3 py-2 mb-4 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
            <p className="text-xs text-red-700">{error}</p>
          </div>
        )}

        <button
          onClick={handlePayment}
          disabled={loading || !snapReady}
          className="w-full py-3 bg-brand-600 text-white rounded-xl text-sm font-bold hover:bg-brand-700 disabled:opacity-60 transition-all flex items-center justify-center gap-2"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
          {loading ? 'Memproses...' : `Bayar ${formatRupiahBilling(price)}`}
        </button>

        <p className="text-center text-[10px] text-slate-400 mt-3">
          Dengan melanjutkan, Anda menyetujui syarat & ketentuan layanan Portalog.
        </p>
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function BillingPage() {
  const [sub, setSub]           = useState<SubscriptionInfo | null>(null)
  const [history, setHistory]   = useState<BillingItem[]>([])
  const [loading, setLoading]   = useState(true)
  const [billing, setBilling]   = useState<'monthly' | 'annual'>('monthly')
  const [checkout, setCheckout] = useState<PlanId | null>(null)
  const [cancelling, setCancelling] = useState(false)

  const fetchBilling = async () => {
    setLoading(true)
    try {
      const res  = await fetch('/api/billing/portal')
      const data = await res.json()
      if (data.success) { setSub(data.data.subscription); setHistory(data.data.history) }
    } finally { setLoading(false) }
  }

  useEffect(() => { fetchBilling() }, [])

  // Handle payment result from URL params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('payment') === 'success') {
      fetchBilling()
      window.history.replaceState({}, '', '/billing')
    }
  }, [])

  const handleCancel = async () => {
    if (!confirm('Batalkan langganan? Anda masih bisa menggunakan Portalog hingga akhir periode.')) return
    setCancelling(true)
    await fetch('/api/billing/portal', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'cancel' }) })
    fetchBilling()
    setCancelling(false)
  }

  const handleReactivate = async () => {
    await fetch('/api/billing/portal', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'reactivate' }) })
    fetchBilling()
  }

  const SubIcon = sub ? (PLAN_ICON[sub.plan] ?? Clock) : Clock
  const statusCfg = sub ? (STATUS_CFG[sub.status] ?? STATUS_CFG.PAST_DUE) : STATUS_CFG.TRIALING

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Billing &amp; Langganan</h1>
        <p className="text-slate-500 text-sm">Kelola paket dan riwayat pembayaran</p>
      </div>

      {/* Current subscription card */}
      {loading ? (
        <div className="h-36 bg-slate-100 rounded-2xl animate-pulse" />
      ) : sub ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <div className="flex items-start gap-4 flex-wrap">
            <div className="w-12 h-12 rounded-xl bg-brand-50 flex items-center justify-center shrink-0">
              <SubIcon className="w-6 h-6 text-brand-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <h2 className="text-base font-bold text-slate-900">
                  Portalog {sub.plan === 'TRIAL' ? 'Trial' : sub.plan}
                </h2>
                <span className={cn('text-xs font-semibold px-2.5 py-0.5 rounded-full', statusCfg.bg, statusCfg.text)}>
                  {statusCfg.label}
                </span>
                {sub.isTrial && sub.daysLeft !== null && sub.daysLeft <= 3 && (
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-100 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> {sub.daysLeft} hari lagi
                  </span>
                )}
              </div>

              <div className="flex flex-wrap gap-4 text-xs text-slate-500">
                {sub.isTrial && sub.trialEndsAt && (
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-amber-500" />
                    Trial berakhir: {formatDate(sub.trialEndsAt)}
                  </span>
                )}
                {!sub.isTrial && sub.currentPeriodEnd && (
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    Perpanjang: {formatDate(sub.currentPeriodEnd)}
                  </span>
                )}
                <span className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-green-500" />
                  {sub.limits.shipments === -1 ? 'Shipment unlimited' : `${sub.limits.shipments} shipment/bulan`}
                </span>
                <span className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-green-500" />
                  {sub.limits.users === -1 ? 'User unlimited' : `Maks ${sub.limits.users} user`}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button onClick={fetchBilling} className="p-2 rounded-xl border border-slate-200 text-slate-400 hover:bg-slate-50 transition-all">
                <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
              </button>
              {sub.status === 'ACTIVE' && !sub.isTrial && (
                <button onClick={handleCancel} disabled={cancelling}
                  className="px-3 py-2 rounded-xl border border-red-200 text-red-600 text-xs font-semibold hover:bg-red-50 disabled:opacity-50 transition-all">
                  Batalkan
                </button>
              )}
            </div>
          </div>

          {/* Trial warning */}
          {sub.isTrial && (
            <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-amber-800">
                  Trial Anda berakhir dalam {sub.daysLeft ?? 0} hari
                </p>
                <p className="text-xs text-amber-600 mt-0.5">
                  Pilih paket di bawah untuk melanjutkan menggunakan Portalog tanpa gangguan.
                </p>
              </div>
            </div>
          )}

          {/* Cancel notice */}
          {sub.status === 'ACTIVE' && (
            <p className="text-[10px] text-slate-400 mt-3 text-center">
              Pembatalan berlaku di akhir periode penagihan. Data Anda tetap aman.
            </p>
          )}
        </div>
      ) : null}

      {/* Billing toggle */}
      <div className="flex items-center gap-3">
        <h2 className="text-base font-semibold text-slate-800">Pilih Paket</h2>
        <div className="flex gap-1 bg-slate-100 p-1 rounded-xl ml-auto">
          {(['monthly', 'annual'] as const).map(b => (
            <button key={b} onClick={() => setBilling(b)}
              className={cn('px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                billing === b ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500')}>
              {b === 'monthly' ? 'Bulanan' : 'Tahunan'}
              {b === 'annual' && <span className="ml-1 text-green-600 font-bold">-17%</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Plan cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {(Object.keys(PLANS) as PlanId[]).map(planId => (
          <PlanCard
            key={planId}
            planId={planId}
            billing={billing}
            currentPlan={sub?.plan ?? ''}
            isActive={sub?.isActive ?? false}
            onSelect={(id) => setCheckout(id)}
            loading={false}
          />
        ))}
      </div>

      {/* Billing history */}
      {history.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
            <Receipt className="w-4 h-4 text-brand-500" />
            <h3 className="text-sm font-semibold text-slate-800">Riwayat Pembayaran</h3>
          </div>
          <div className="divide-y divide-slate-50">
            {history.map(item => {
              const pCfg = PAYMENT_STATUS_CFG[item.status] ?? PAYMENT_STATUS_CFG.pending
              return (
                <div key={item.id} className="flex items-center gap-4 px-5 py-3.5">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                    <CreditCard className="w-4 h-4 text-slate-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 font-mono">{item.orderId}</p>
                    <p className="text-xs text-slate-400">{formatDate(item.paidAt ?? item.createdAt)}</p>
                  </div>
                  <span className={cn('text-xs font-semibold', pCfg.color)}>{pCfg.label}</span>
                  <span className="text-sm font-bold text-slate-800">{formatRupiahBilling(item.amount)}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Checkout modal */}
      {checkout && (
        <CheckoutModal
          planId={checkout}
          billing={billing}
          onClose={() => setCheckout(null)}
          onSuccess={() => { setCheckout(null); fetchBilling() }}
        />
      )}
    </div>
  )
}
