'use client'

import { useState, useEffect } from 'react'
import {
  CreditCard, CheckCircle2, Clock, XCircle, Loader2,
  Star, Zap, Building2, ChevronRight, AlertCircle, Gift,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { PLANS, type PlanKey } from '@/lib/midtrans'
import Script from 'next/script'

// ─── Types ─────────────────────────────────────────────────────────────────────

interface BillingHistory {
  id:          string
  orderId:     string
  amount:      number
  status:      string
  paymentType: string | null
  description: string | null
  paidAt:      string | null
  createdAt:   string
}

interface Subscription {
  plan:               string
  status:             string
  trialEndsAt:        string | null
  currentPeriodStart: string | null
  currentPeriodEnd:   string | null
  cancelAtPeriodEnd:  boolean
  billingHistory:     BillingHistory[]
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  settlement: { label: 'Lunas',      color: 'bg-green-100 text-green-700', icon: CheckCircle2 },
  capture:    { label: 'Lunas',      color: 'bg-green-100 text-green-700', icon: CheckCircle2 },
  pending:    { label: 'Menunggu',   color: 'bg-amber-100 text-amber-700', icon: Clock        },
  cancel:     { label: 'Dibatalkan', color: 'bg-slate-100 text-slate-500', icon: XCircle      },
  expire:     { label: 'Kadaluarsa', color: 'bg-slate-100 text-slate-500', icon: XCircle      },
  deny:       { label: 'Ditolak',    color: 'bg-red-100 text-red-600',     icon: XCircle      },
}

const PLAN_ICONS: Record<string, React.ElementType> = {
  STARTER:    Zap,
  GROWTH:     Star,
  ENTERPRISE: Building2,
}

function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount)
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
}

// ─── Plan Card ─────────────────────────────────────────────────────────────────

function PlanCard({
  planKey, currentPlan, onSelect, loading,
}: {
  planKey:     PlanKey
  currentPlan: string
  onSelect:    (p: PlanKey) => void
  loading:     PlanKey | null
}) {
  const plan     = PLANS[planKey]
  const Icon     = PLAN_ICONS[planKey] ?? Star
  const isActive = currentPlan === planKey
  const isLoading = loading === planKey

  return (
    <div className={cn(
      'relative bg-white rounded-2xl border-2 p-6 flex flex-col transition-all duration-200',
      plan.highlight ? 'border-brand-500 shadow-lg shadow-brand-100' : 'border-slate-200 hover:border-slate-300',
      isActive && 'border-green-400 bg-green-50/30',
    )}>
      {/* Popular badge */}
      {plan.highlight && !isActive && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-brand-600 text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
          Paling Populer
        </div>
      )}
      {isActive && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-green-500 text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3" /> Plan Aktif
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className={cn(
          'w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
          plan.highlight ? 'bg-brand-100' : 'bg-slate-100',
        )}>
          <Icon className={cn('w-5 h-5', plan.highlight ? 'text-brand-600' : 'text-slate-600')} />
        </div>
        <div>
          <h3 className="text-base font-bold text-slate-900">{plan.name}</h3>
          <p className="text-xs text-slate-500">{plan.description}</p>
        </div>
      </div>

      {/* Price */}
      <div className="mb-5">
        <div className="flex items-baseline gap-1">
          <span className="text-3xl font-bold text-slate-900">{formatRupiah(plan.price)}</span>
          <span className="text-sm text-slate-400">/bulan</span>
        </div>
      </div>

      {/* Features */}
      <ul className="space-y-2 flex-1 mb-6">
        {plan.features.map(f => (
          <li key={f} className="flex items-start gap-2 text-sm text-slate-600">
            <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
            {f}
          </li>
        ))}
      </ul>

      {/* CTA */}
      <button
        onClick={() => !isActive && onSelect(planKey)}
        disabled={isActive || !!loading}
        className={cn(
          'w-full py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2',
          isActive
            ? 'bg-green-100 text-green-700 cursor-default'
            : plan.highlight
            ? 'bg-brand-600 text-white hover:bg-brand-700 active:scale-[0.98]'
            : 'bg-slate-900 text-white hover:bg-slate-800 active:scale-[0.98]',
          !!loading && !isActive && 'opacity-60 cursor-not-allowed',
        )}
      >
        {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
        {isActive ? '✓ Plan Aktif' : isLoading ? 'Memproses...' : `Pilih ${plan.name}`}
      </button>
    </div>
  )
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function BillingPage() {
  const [subData, setSubData]     = useState<{ subscription: Subscription | null; referralCredits: number } | null>(null)
  const [loadingData, setLoadingData] = useState(true)
  const [loadingPlan, setLoadingPlan] = useState<PlanKey | null>(null)
  const [error, setError]         = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/billing/status')
      .then(r => r.json())
      .then(d => { if (d.success) setSubData(d.data) })
      .finally(() => setLoadingData(false))
  }, [])

  const handleSelectPlan = async (plan: PlanKey) => {
    setLoadingPlan(plan)
    setError(null)
    try {
      const res  = await fetch('/api/billing/checkout', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ plan }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)

      // Load Midtrans Snap.js dan buka popup
      if (typeof window !== 'undefined') {
        const snap = (window as any).snap
        if (snap) {
          snap.pay(data.snapToken, {
            onSuccess: () => { window.location.reload() },
            onPending: () => { window.location.reload() },
            onError:   () => setError('Pembayaran gagal. Coba lagi.'),
            onClose:   () => setLoadingPlan(null),
          })
        } else {
          // Fallback: redirect ke Midtrans hosted page
          window.location.href = data.redirectUrl
        }
      }
    } catch (err: any) {
      setError(err.message || 'Gagal memproses pembayaran')
      setLoadingPlan(null)
    }
  }

  const sub         = subData?.subscription
  const currentPlan = sub?.plan ?? 'TRIAL'
  const history     = sub?.billingHistory ?? []

  if (loadingData) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-7 h-7 animate-spin text-brand-500" />
    </div>
  )

  return (
    <>
      <Script
        src={
          process.env.NEXT_PUBLIC_MIDTRANS_IS_PRODUCTION === 'true'
            ? 'https://app.midtrans.com/snap/snap.js'
            : 'https://app.sandbox.midtrans.com/snap/snap.js'
        }
        data-client-key={process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY ?? ''}
        strategy="lazyOnload"
      />
      <div className="max-w-5xl space-y-8">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Billing & Langganan</h1>
          <p className="text-slate-500 text-sm mt-1">Kelola paket langganan dan riwayat pembayaran</p>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        {/* Active subscription info */}
        {sub && sub.status === 'ACTIVE' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-slate-800">
                Plan {currentPlan} — Aktif
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                Periode: {formatDate(sub.currentPeriodStart)} — {formatDate(sub.currentPeriodEnd)}
              </p>
            </div>
            {sub.cancelAtPeriodEnd && (
              <span className="text-xs font-semibold text-amber-700 bg-amber-100 px-3 py-1 rounded-full">
                Tidak diperbarui otomatis
              </span>
            )}
          </div>
        )}

        {/* Trial notice */}
        {(!sub || sub.status === 'TRIALING') && (
          <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
            <Clock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-800">Anda sedang dalam masa trial</p>
              <p className="text-xs text-amber-700 mt-0.5">
                {sub?.trialEndsAt
                  ? `Trial berakhir pada ${formatDate(sub.trialEndsAt)}. Pilih paket untuk melanjutkan.`
                  : 'Pilih paket untuk mulai berlangganan.'
                }
              </p>
            </div>
          </div>
        )}

        {/* Referral credits */}
        {(subData?.referralCredits ?? 0) > 0 && (
          <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-xl">
            <Gift className="w-4 h-4 text-green-600 shrink-0" />
            <p className="text-sm text-green-800">
              Anda memiliki <strong>{subData?.referralCredits} bulan gratis</strong> dari program referral.
              Kredit ini akan diterapkan otomatis pada pembayaran berikutnya.
            </p>
          </div>
        )}

        {/* Plan cards */}
        <div>
          <h2 className="text-base font-bold text-slate-800 mb-4">Pilih Paket</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {(Object.keys(PLANS) as PlanKey[]).map(key => (
              <PlanCard
                key={key}
                planKey={key}
                currentPlan={currentPlan}
                onSelect={handleSelectPlan}
                loading={loadingPlan}
              />
            ))}
          </div>
        </div>

        {/* Billing history */}
        <div>
          <h2 className="text-base font-bold text-slate-800 mb-4">Riwayat Pembayaran</h2>
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            {history.length === 0 ? (
              <div className="p-12 text-center">
                <CreditCard className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500 font-medium">Belum ada riwayat pembayaran</p>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    {['Order ID', 'Deskripsi', 'Jumlah', 'Metode', 'Tanggal', 'Status'].map(h => (
                      <th key={h} className="px-5 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {history.map(h => {
                    const cfg = STATUS_CONFIG[h.status] ?? STATUS_CONFIG.pending
                    const Icon = cfg.icon
                    return (
                      <tr key={h.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-5 py-3.5">
                          <p className="text-xs font-mono text-slate-600">{h.orderId}</p>
                        </td>
                        <td className="px-5 py-3.5">
                          <p className="text-sm text-slate-700">{h.description || '—'}</p>
                        </td>
                        <td className="px-5 py-3.5">
                          <p className="text-sm font-semibold text-slate-800">{formatRupiah(h.amount)}</p>
                        </td>
                        <td className="px-5 py-3.5">
                          <p className="text-xs text-slate-500 capitalize">{h.paymentType?.replace(/_/g, ' ') || '—'}</p>
                        </td>
                        <td className="px-5 py-3.5">
                          <p className="text-sm text-slate-600">{formatDate(h.paidAt ?? h.createdAt)}</p>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className={cn('inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full', cfg.color)}>
                            <Icon className="w-3 h-3" />
                            {cfg.label}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

      </div>
    </>
  )
}
