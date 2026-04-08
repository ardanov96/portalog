'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'

export function RegisterForm() {
  const router = useRouter()
  const [form, setForm]     = useState({ name: '', email: '', password: '', organizationName: '' })
  const [error, setError]   = useState('')
  const [loading, setLoading] = useState(false)

  const update = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((p) => ({ ...p, [field]: e.target.value }))

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res  = await fetch('/api/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
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
      {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">{error}</div>}
      {field('Nama Lengkap',        'name',             'text',     'Budi Santoso')}
      {field('Nama Perusahaan / FF','organizationName', 'text',     'PT Maju Bersama Logistik')}
      {field('Email',               'email',            'email',    'email@perusahaan.com')}
      {field('Password',            'password',         'password', 'Minimal 8 karakter')}
      <button type="submit" disabled={loading}
        className="w-full py-3 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-xl text-sm transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
        {loading ? 'Membuat akun...' : 'Buat Akun Gratis'}
      </button>
      <p className="text-center text-xs text-slate-400">Dengan mendaftar, Anda menyetujui syarat dan ketentuan layanan.</p>
    </form>
  )
}
