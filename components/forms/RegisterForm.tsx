'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Loader2, Gift, CheckCircle2, XCircle } from 'lucide-react'

export function RegisterForm() {
  const router       = useRouter()
  const searchParams = useSearchParams()

  const [form, setForm] = useState({
    name:             '',
    email:            '',
    password:         '',
    organizationName: '',
    referralCode:     '',
  })
  const [error, setError]           = useState('')
  const [loading, setLoading]       = useState(false)
  const [codeStatus, setCodeStatus] = useState<'idle' | 'valid' | 'invalid'>('idle')
  const [codeChecking, setCodeChecking] = useState(false)

  // Auto-fill referral code dari URL ?ref=XXXXX
  useEffect(() => {
    const ref = searchParams.get('ref')
    if (ref) {
      setForm(p => ({ ...p, referralCode: ref.toUpperCase() }))
      verifyCode(ref.toUpperCase())
    }
  }, [searchParams])

  const update = (field: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setForm(p => ({ ...p, [field]: e.target.value }))
      if (field === 'referralCode') setCodeStatus('idle')
    }

  // Verifikasi kode ke API
  const verifyCode = async (code: string) => {
    if (!code || code.length < 4) return
    setCodeChecking(true)
    try {
      const res  = await fetch(`/api/referral/verify?code=${encodeURIComponent(code)}`)
      const data = await res.json()
      setCodeStatus(data.valid ? 'valid' : 'invalid')
    } catch {
      setCodeStatus('idle')
    } finally {
      setCodeChecking(false)
    }
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res  = await fetch('/api/auth/register', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(form),
      })
      const data = await res.json()
      if (!data.success) { setError(data.error || 'Registrasi gagal'); return }
      router.push('/dashboard')
      router.refresh()
    } catch {
      setError('Terjadi kesalahan koneksi.')
    } finally {
      setLoading(false)
    }
  }

  const field = (label: string, key: keyof typeof form, type = 'text', placeholder = '') => (
    <div>
      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">{label}</label>
      <input type={type} required value={form[key]} onChange={update(key)} placeholder={placeholder}
        className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-sm transition-all" />
    </div>
  )

  return (
    <form onSubmit={submit} className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
          {error}
        </div>
      )}

      {field('Nama Lengkap',         'name',             'text',     'Budi Santoso')}
      {field('Nama Perusahaan / FF', 'organizationName', 'text',     'PT Maju Bersama Logistik')}
      {field('Email',                'email',            'email',    'email@perusahaan.com')}
      {field('Password',             'password',         'password', 'Minimal 8 karakter')}

      {/* Referral code field */}
      <div>
        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
          Kode Referral <span className="text-slate-400 font-normal normal-case">(opsional)</span>
        </label>
        <div className="relative">
          <Gift className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={form.referralCode}
            onChange={update('referralCode')}
            onBlur={() => verifyCode(form.referralCode)}
            placeholder="Masukkan kode referral"
            maxLength={12}
            className={`w-full pl-10 pr-10 py-3 rounded-xl border bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 text-sm transition-all font-mono tracking-widest uppercase
              ${codeStatus === 'valid'   ? 'border-green-400 focus:ring-green-500/20 bg-green-50'  : ''}
              ${codeStatus === 'invalid' ? 'border-red-300   focus:ring-red-500/20   bg-red-50'    : ''}
              ${codeStatus === 'idle'    ? 'border-slate-200 focus:ring-brand-500/20 focus:border-brand-500' : ''}
            `}
          />
          {/* Status icon */}
          <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
            {codeChecking && <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />}
            {!codeChecking && codeStatus === 'valid'   && <CheckCircle2 className="w-4 h-4 text-green-500" />}
            {!codeChecking && codeStatus === 'invalid' && <XCircle      className="w-4 h-4 text-red-400"   />}
          </div>
        </div>

        {/* Feedback message */}
        {codeStatus === 'valid' && (
          <p className="text-xs text-green-600 font-medium mt-1.5 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Kode valid! Anda dan referrer akan mendapat bonus.
          </p>
        )}
        {codeStatus === 'invalid' && (
          <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1">
            <XCircle className="w-3 h-3" /> Kode tidak ditemukan atau sudah kadaluarsa.
          </p>
        )}
      </div>

      <button type="submit" disabled={loading}
        className="w-full py-3 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-xl text-sm transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
        {loading ? 'Membuat akun...' : 'Buat Akun Gratis'}
      </button>
      <p className="text-center text-xs text-slate-400">
        Dengan mendaftar, Anda menyetujui syarat dan ketentuan layanan.
      </p>
    </form>
  )
}
