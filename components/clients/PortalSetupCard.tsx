'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Globe, Check, X, Loader2, AlertCircle, Eye, EyeOff, ExternalLink, Trash2 } from 'lucide-react'

interface Props {
  clientId:     string
  portalEmail:  string | null
  onUpdate:     (email: string | null) => void
}

export function PortalSetupCard({ clientId, portalEmail, onUpdate }: Props) {
  const [mode, setMode]       = useState<'view' | 'setup'>('view')
  const [form, setForm]       = useState({ email: portalEmail ?? '', password: '' })
  const [showPwd, setShowPwd] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const [success, setSuccess] = useState('')

  const activate = async () => {
    if (!form.email || !form.password) { setError('Email dan password wajib diisi'); return }
    setLoading(true); setError(''); setSuccess('')
    try {
      const res  = await fetch(`/api/clients/${clientId}/portal`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ portalEmail: form.email, portalPassword: form.password }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)
      setSuccess('Akses portal berhasil diaktifkan!')
      onUpdate(form.email)
      setMode('view')
    } catch (e: any) { setError(e.message) }
    finally { setLoading(false) }
  }

  const revoke = async () => {
    if (!confirm('Nonaktifkan akses portal untuk klien ini?')) return
    setLoading(true); setError('')
    try {
      const res  = await fetch(`/api/clients/${clientId}/portal`, { method: 'DELETE' })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)
      onUpdate(null)
      setForm(p => ({ ...p, password: '' }))
    } catch (e: any) { setError(e.message) }
    finally { setLoading(false) }
  }

  const inp = 'w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400 transition-all'

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
          <Globe className="w-4 h-4 text-brand-500" /> Akses Client Portal
        </h3>
        {portalEmail && (
          <a href="/portal/login" target="_blank" rel="noopener noreferrer"
            className="text-xs text-brand-600 font-semibold hover:underline flex items-center gap-1">
            Buka Portal <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>

      <div className="p-5">
        {portalEmail ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
              <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                <Check className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-green-800">Portal Aktif</p>
                <p className="text-xs text-green-600">{portalEmail}</p>
              </div>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              Klien dapat login di <span className="font-mono text-brand-600">/portal/login</span> menggunakan email dan password yang sudah di-set untuk melihat status shipment dan mengunduh dokumen mereka.
            </p>

            {error && <p className="text-xs text-red-500 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{error}</p>}

            <div className="flex gap-2">
              <button onClick={() => { setMode('setup'); setForm({ email: portalEmail, password: '' }) }}
                className="flex-1 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-all">
                Ganti Password
              </button>
              <button onClick={revoke} disabled={loading}
                className="px-3 py-2 rounded-xl border border-red-200 text-xs font-semibold text-red-600 hover:bg-red-50 transition-all flex items-center gap-1 disabled:opacity-50">
                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                Nonaktifkan
              </button>
            </div>
          </div>
        ) : mode === 'view' ? (
          <div className="space-y-4">
            <div className="bg-slate-50 rounded-xl px-4 py-3 text-sm text-slate-500">
              Klien ini belum memiliki akses portal. Aktifkan agar klien bisa memantau shipment mereka sendiri.
            </div>
            <button onClick={() => setMode('setup')}
              className="w-full py-2.5 rounded-xl bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 transition-all flex items-center justify-center gap-2">
              <Globe className="w-4 h-4" /> Aktifkan Akses Portal
            </button>
          </div>
        ) : null}

        {mode === 'setup' && (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Email Login Portal</label>
              <input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                placeholder="email@klien.com" className={inp} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Password Portal</label>
              <div className="relative">
                <input type={showPwd ? 'text' : 'password'} value={form.password}
                  onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                  placeholder="Min. 6 karakter" className={cn(inp, 'pr-10')} />
                <button type="button" onClick={() => setShowPwd(p => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[10px] text-slate-400 mt-1">Bagikan email dan password ini ke klien Anda</p>
            </div>
            {error   && <p className="text-xs text-red-500 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{error}</p>}
            {success && <p className="text-xs text-green-600 flex items-center gap-1"><Check className="w-3 h-3" />{success}</p>}
            <div className="flex gap-2 pt-1">
              <button onClick={() => { setMode('view'); setError('') }}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-all">
                Batal
              </button>
              <button onClick={activate} disabled={loading}
                className="flex-1 py-2.5 rounded-xl bg-brand-600 text-white text-xs font-semibold hover:bg-brand-700 disabled:opacity-60 transition-all flex items-center justify-center gap-2">
                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                Simpan & Aktifkan
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
