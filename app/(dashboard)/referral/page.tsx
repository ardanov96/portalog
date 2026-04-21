'use client'

import { useState, useEffect } from 'react'
import {
  Gift, Copy, Check, CheckCircle2, Clock, XCircle,
  Users, Trophy, Star, Loader2, Mail, Send,
  ArrowRight, Sparkles, Info,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ─── Types ─────────────────────────────────────────────────────────────────────

type ReferralStatus = 'PENDING' | 'QUALIFIED' | 'REWARDED' | 'EXPIRED'

interface ReferralItem {
  id:             string
  referredEmail:  string | null
  referredOrgName:string | null
  status:         ReferralStatus
  rewardMonths:   number
  qualifiedAt:    string | null
  expiresAt:      string
  createdAt:      string
}

interface ReferralData {
  referralCode:    string
  referralCredits: number
  stats: {
    total:             number
    qualified:         number
    rewarded:          number
    pending:           number
    totalMonthsEarned: number
  }
  referrals: ReferralItem[]
}

// ─── Status config ─────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<ReferralStatus, { label: string; color: string; icon: React.ElementType }> = {
  PENDING:   { label: 'Menunggu',    color: 'bg-amber-100 text-amber-700',  icon: Clock       },
  QUALIFIED: { label: 'Subscribe!',  color: 'bg-blue-100 text-blue-700',   icon: CheckCircle2 },
  REWARDED:  { label: 'Reward Diterima', color: 'bg-green-100 text-green-700', icon: Trophy  },
  EXPIRED:   { label: 'Kedaluwarsa', color: 'bg-slate-100 text-slate-500', icon: XCircle     },
}

// ─── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, icon: Icon, color }: {
  label: string; value: number | string; sub?: string
  icon: React.ElementType; color: string
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 flex items-start gap-4">
      <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0', color)}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-2xl font-bold text-slate-900">{value}</p>
        <p className="text-sm font-medium text-slate-600">{label}</p>
        {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

// ─── How it works ──────────────────────────────────────────────────────────────

function HowItWorks() {
  const steps = [
    { n: '01', title: 'Bagikan Kode',    desc: 'Kirim kode referral unik kamu ke rekan bisnis yang belum pakai Portalog.',  icon: Gift      },
    { n: '02', title: 'Mereka Daftar',   desc: 'Mereka mendaftar dan memasukkan kode referralmu saat subscribe.',           icon: Users     },
    { n: '03', title: 'Kamu Dapat Reward', desc: 'Begitu mereka subscribe, kamu otomatis mendapat 1 bulan gratis.',         icon: Trophy    },
  ]

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6">
      <div className="flex items-center gap-2 mb-5">
        <Info className="w-4 h-4 text-brand-500" />
        <h3 className="text-sm font-bold text-slate-800">Cara Kerja Program Referral</h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {steps.map((s, i) => (
          <div key={s.n} className="flex gap-4">
            <div className="flex flex-col items-center">
              <div className="w-9 h-9 rounded-xl bg-brand-50 flex items-center justify-center shrink-0">
                <s.icon className="w-4.5 h-4.5 text-brand-600" />
              </div>
              {i < steps.length - 1 && (
                <div className="w-px flex-1 bg-slate-100 mt-2 hidden md:block" />
              )}
            </div>
            <div className="pb-2">
              <p className="text-[10px] font-bold text-brand-500 uppercase tracking-wider mb-1">{s.n}</p>
              <p className="text-sm font-semibold text-slate-800 mb-1">{s.title}</p>
              <p className="text-xs text-slate-500 leading-relaxed">{s.desc}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-5 p-3.5 bg-amber-50 border border-amber-100 rounded-xl flex items-start gap-2.5">
        <Sparkles className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
        <p className="text-xs text-amber-700 leading-relaxed">
          <span className="font-semibold">Tidak ada batas!</span> Kamu bisa mengundang sebanyak mungkin rekan bisnis. Setiap referral yang berhasil subscribe memberikan kamu <span className="font-semibold">1 bulan gratis</span> tambahan.
        </p>
      </div>
    </div>
  )
}

// ─── Referral table ────────────────────────────────────────────────────────────

function ReferralTable({ referrals }: { referrals: ReferralItem[] }) {
  if (referrals.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
        <Users className="w-10 h-10 text-slate-300 mx-auto mb-3" />
        <p className="text-slate-500 font-medium">Belum ada undangan</p>
        <p className="text-slate-400 text-sm mt-1">Undang rekan bisnis untuk mulai mengumpulkan reward</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100">
        <h3 className="text-sm font-bold text-slate-800">Riwayat Undangan</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              {['Email Diundang', 'Perusahaan', 'Tanggal Undang', 'Status', 'Reward'].map(h => (
                <th key={h} className="px-5 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {referrals.map(r => {
              const cfg = STATUS_CONFIG[r.status]
              const StatusIcon = cfg.icon
              return (
                <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                        <Mail className="w-3.5 h-3.5 text-slate-400" />
                      </div>
                      <p className="text-sm text-slate-700">{r.referredEmail || '—'}</p>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <p className="text-sm text-slate-600">{r.referredOrgName || <span className="text-slate-400 italic">Belum daftar</span>}</p>
                  </td>
                  <td className="px-5 py-3.5">
                    <p className="text-sm text-slate-600">
                      {new Date(r.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={cn('inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full', cfg.color)}>
                      <StatusIcon className="w-3 h-3" />
                      {cfg.label}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    {r.status === 'REWARDED' ? (
                      <span className="text-sm font-semibold text-green-700">+{r.rewardMonths} bulan</span>
                    ) : r.status === 'QUALIFIED' ? (
                      <span className="text-xs text-blue-600 font-medium">Segera dikreditkan</span>
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function ReferralPage() {
  const [data, setData]       = useState<ReferralData | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied]   = useState(false)
  const [email, setEmail]     = useState('')
  const [sending, setSending] = useState(false)
  const [inviteMsg, setInviteMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    fetch('/api/referral')
      .then(r => r.json())
      .then(d => { if (d.success) setData(d.data) })
      .finally(() => setLoading(false))
  }, [])

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleInvite = async () => {
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setInviteMsg({ type: 'error', text: 'Masukkan email yang valid' })
      return
    }
    setSending(true); setInviteMsg(null)
    try {
      const res  = await fetch('/api/referral/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      setInviteMsg({ type: 'success', text: `Undangan berhasil dikirim ke ${email}` })
      setEmail('')
      // Refresh data
      const r2 = await fetch('/api/referral')
      const d2 = await r2.json()
      if (d2.success) setData(d2.data)
    } catch (err: any) {
      setInviteMsg({ type: 'error', text: err.message || 'Gagal mengirim undangan' })
    } finally { setSending(false) }
  }

  const referralUrl = data ? `${typeof window !== 'undefined' ? window.location.origin : ''}/register?ref=${data.referralCode}` : ''

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-7 h-7 animate-spin text-brand-500" />
    </div>
  )

  if (!data) return (
    <div className="text-center py-20 text-slate-400">Gagal memuat data referral.</div>
  )

  return (
    <div className="max-w-5xl space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Program Referral</h1>
        <p className="text-slate-500 text-sm mt-1">Undang rekan bisnis dan dapatkan bulan gratis untuk setiap yang berhasil subscribe</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Undangan"     value={data.stats.total}             icon={Users}        color="bg-slate-100 text-slate-600" />
        <StatCard label="Berhasil Subscribe" value={data.stats.qualified}         icon={CheckCircle2} color="bg-blue-100 text-blue-600"   />
        <StatCard label="Reward Diterima"    value={data.stats.rewarded}          icon={Trophy}       color="bg-green-100 text-green-600" />
        <StatCard label="Kredit Aktif"       value={`${data.referralCredits} bln`} sub="bulan gratis tersisa" icon={Star} color="bg-amber-100 text-amber-600" />
      </div>

      {/* Referral code + invite */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Kode referral */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Gift className="w-4 h-4 text-brand-500" />
            <h3 className="text-sm font-bold text-slate-800">Kode Referral Kamu</h3>
          </div>

          {/* Code display */}
          <div className="flex items-center gap-3">
            <div className="flex-1 bg-brand-50 border-2 border-brand-200 border-dashed rounded-xl px-4 py-3 text-center">
              <p className="text-2xl font-bold tracking-[0.2em] text-brand-700">{data.referralCode}</p>
            </div>
            <button onClick={() => handleCopy(data.referralCode)}
              className={cn('w-11 h-11 rounded-xl border flex items-center justify-center transition-all shrink-0',
                copied ? 'bg-green-50 border-green-200 text-green-600' : 'bg-slate-50 border-slate-200 text-slate-500 hover:border-brand-300 hover:text-brand-600')}>
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>

          {/* URL */}
          <div className="space-y-1.5">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Link Referral</p>
            <div className="flex items-center gap-2">
              <p className="flex-1 text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 truncate font-mono">
                {referralUrl}
              </p>
              <button onClick={() => handleCopy(referralUrl)}
                className="px-3 py-2 text-xs font-semibold text-brand-600 hover:bg-brand-50 rounded-lg border border-brand-200 transition-colors whitespace-nowrap">
                Copy Link
              </button>
            </div>
          </div>
        </div>

        {/* Invite by email */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Send className="w-4 h-4 text-brand-500" />
            <h3 className="text-sm font-bold text-slate-800">Undang via Email</h3>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">
            Kirim undangan langsung ke email rekan bisnis. Mereka akan menerima instruksi cara mendaftar menggunakan kode referralmu.
          </p>
          <div className="space-y-2">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                <input
                  type="email"
                  placeholder="email@perusahaan.com"
                  value={email}
                  onChange={e => { setEmail(e.target.value); setInviteMsg(null) }}
                  onKeyDown={e => e.key === 'Enter' && handleInvite()}
                  className="w-full pl-9 pr-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400 focus:bg-white transition-all"
                />
              </div>
              <button onClick={handleInvite} disabled={sending || !email}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand-600 text-white rounded-xl text-sm font-semibold hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98] whitespace-nowrap">
                {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowRight className="w-3.5 h-3.5" />}
                Kirim
              </button>
            </div>

            {inviteMsg && (
              <div className={cn('flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium',
                inviteMsg.type === 'success' ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-600 border border-red-100')}>
                {inviteMsg.type === 'success'
                  ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  : <XCircle     className="w-3.5 h-3.5 shrink-0" />
                }
                {inviteMsg.text}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* How it works */}
      <HowItWorks />

      {/* History table */}
      <ReferralTable referrals={data.referrals} />

    </div>
  )
}
