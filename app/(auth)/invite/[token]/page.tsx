'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Ship, Loader2, AlertCircle, Check, Eye, EyeOff,
  Building2, UserPlus, Clock,
} from 'lucide-react'

interface InviteData {
  email:       string
  name:        string | null
  role:        string
  expiresAt:   string
  organization: { id: string; name: string; logoUrl: string | null }
}

export default function AcceptInvitePage() {
  const { token }            = useParams<{ token: string }>()
  const router               = useRouter()
  const [invite, setInvite]  = useState<InviteData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]    = useState('')
  const [form, setForm]      = useState({ name: '', password: '', confirmPassword: '' })
  const [showPwd, setShowPwd] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone]      = useState(false)

  useEffect(() => {
    fetch(`/api/invite/${token}`)
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          setInvite(d.data)
          setForm(f => ({ ...f, name: d.data.name ?? '' }))
        } else {
          setError(d.error)
        }
      })
      .catch(() => setError('Gagal memvalidasi undangan'))
      .finally(() => setLoading(false))
  }, [token])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) { setError('Nama wajib diisi'); return }
    if (form.password.length < 8) { setError('Password minimal 8 karakter'); return }
    if (form.password !== form.confirmPassword) { setError('Konfirmasi password tidak cocok'); return }

    setSubmitting(true); setError('')
    try {
      const res  = await fetch(`/api/invite/${token}`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ name: form.name, password: form.password }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)
      setDone(true)
      setTimeout(() => router.push('/dashboard'), 2000)
    } catch (e: any) {
      setError(e.message || 'Gagal memproses undangan')
    } finally {
      setSubmitting(false)
    }
  }

  const inp = 'w-full px-4 py-3 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all'

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="w-6 h-6 text-brand-500 animate-spin" />
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-brand-600 text-white mb-4">
            <Ship className="w-7 h-7" />
          </div>
          <p className="text-sm text-slate-500 font-medium">ForwarderOS</p>
        </div>

        {/* Invalid/expired state */}
        {error && !invite && (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm text-center">
            <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-6 h-6 text-red-500" />
            </div>
            <h2 className="text-base font-bold text-slate-900 mb-2">Undangan Tidak Valid</h2>
            <p className="text-sm text-slate-500 leading-relaxed">{error}</p>
            <Link href="/login" className="mt-6 block text-sm text-brand-600 font-semibold hover:underline">
              Kembali ke Login
            </Link>
          </div>
        )}

        {/* Success state */}
        {done && (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm text-center">
            <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
              <Check className="w-7 h-7 text-green-600" />
            </div>
            <h2 className="text-base font-bold text-slate-900 mb-2">Selamat Bergabung! 🎉</h2>
            <p className="text-sm text-slate-500">
              Akun Anda berhasil dibuat. Mengalihkan ke dashboard...
            </p>
          </div>
        )}

        {/* Main invite card */}
        {invite && !done && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">

            {/* Invite header */}
            <div className="bg-gradient-to-br from-brand-600 to-indigo-600 px-6 py-5 text-white">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-sm font-bold">{invite.organization.name}</p>
                  <p className="text-xs text-white/70">mengundang Anda bergabung</p>
                </div>
              </div>
              <div className="bg-white/10 rounded-xl px-3 py-2 flex items-center gap-2">
                <UserPlus className="w-3.5 h-3.5 text-white/80 shrink-0" />
                <p className="text-xs text-white/90">
                  Email: <span className="font-semibold">{invite.email}</span>
                  <span className="mx-1.5 text-white/40">·</span>
                  Peran: <span className="font-semibold">{invite.role === 'OWNER' ? 'Owner' : 'Staff'}</span>
                </p>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <h2 className="text-sm font-bold text-slate-900 mb-0.5">Buat Akun Anda</h2>
                <div className="flex items-center gap-1.5 text-[10px] text-amber-600">
                  <Clock className="w-3 h-3" />
                  <span>
                    Berlaku hingga {new Date(invite.expiresAt).toLocaleDateString('id-ID', {
                      day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit',
                    })}
                  </span>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                  <p className="text-xs text-red-700">{error}</p>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Nama Lengkap</label>
                <input
                  type="text" required
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Nama lengkap Anda"
                  className={inp}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Email</label>
                <input
                  type="email" value={invite.email} disabled
                  className="w-full px-4 py-3 text-sm border border-slate-200 rounded-xl bg-slate-100 text-slate-500 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Password</label>
                <div className="relative">
                  <input
                    type={showPwd ? 'text' : 'password'} required
                    value={form.password}
                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                    placeholder="Minimal 8 karakter"
                    className={inp + ' pr-11'}
                  />
                  <button type="button" onClick={() => setShowPwd(p => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Konfirmasi Password</label>
                <input
                  type={showPwd ? 'text' : 'password'} required
                  value={form.confirmPassword}
                  onChange={e => setForm(f => ({ ...f, confirmPassword: e.target.value }))}
                  placeholder="Ulangi password"
                  className={inp}
                />
              </div>

              <button
                type="submit" disabled={submitting}
                className="w-full py-3 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl text-sm transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {submitting
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Memproses...</>
                  : <><Check className="w-4 h-4" /> Terima Undangan & Buat Akun</>
                }
              </button>
            </form>

            <div className="px-6 pb-5 text-center">
              <p className="text-xs text-slate-400">
                Sudah punya akun?{' '}
                <Link href="/login" className="text-brand-600 font-semibold hover:underline">Login di sini</Link>
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
