'use client'

import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import {
  Key, Plus, Copy, Check, Trash2, RefreshCw, Power,
  ShieldCheck, Clock, BarChart3, AlertTriangle, Code,
  ChevronDown, ChevronUp, Loader2, Eye, EyeOff,
  ExternalLink, Terminal, Zap, Globe,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ApiKey {
  id: string; name: string; description?: string | null
  keyPrefix: string; scopes: string[]; isActive: boolean
  lastUsedAt?: string | null; lastUsedIp?: string | null
  expiresAt?: string | null; requestCount: number
  monthlyCount: number; monthlyLimit: number; createdAt: string
}

const SCOPE_INFO: Record<string, { label: string; desc: string; color: string }> = {
  SHIPMENTS_READ:  { label: 'Shipments Read',  desc: 'GET /v1/shipments', color: 'bg-blue-100 text-blue-800' },
  SHIPMENTS_WRITE: { label: 'Shipments Write', desc: 'POST/PATCH/DELETE shipments', color: 'bg-indigo-100 text-indigo-800' },
  CLIENTS_READ:    { label: 'Clients Read',    desc: 'GET /v1/clients', color: 'bg-teal-100 text-teal-800' },
  CLIENTS_WRITE:   { label: 'Clients Write',   desc: 'POST /v1/clients', color: 'bg-cyan-100 text-cyan-800' },
  DOCUMENTS_READ:  { label: 'Documents Read',  desc: 'GET /v1/documents', color: 'bg-violet-100 text-violet-800' },
  DOCUMENTS_WRITE: { label: 'Documents Write', desc: 'POST /v1/documents', color: 'bg-purple-100 text-purple-800' },
  ALL_READ:        { label: 'All Read (*))',   desc: 'Semua endpoint GET', color: 'bg-green-100 text-green-800' },
  ALL_WRITE:       { label: 'All Write (*)',   desc: 'Semua endpoint POST/PATCH/DELETE', color: 'bg-amber-100 text-amber-800' },
}

// ─── Copy button ──────────────────────────────────────────────────────────────

function CopyBtn({ text, size = 'sm' }: { text: string; size?: 'sm' | 'xs' }) {
  const [ok, setOk] = useState(false)
  const copy = async () => { await navigator.clipboard.writeText(text); setOk(true); setTimeout(() => setOk(false), 2000) }
  return (
    <button onClick={copy} className="p-1 rounded text-slate-400 hover:text-slate-600 transition-all">
      {ok ? <Check className={cn(size === 'xs' ? 'w-3 h-3' : 'w-3.5 h-3.5', 'text-green-500')} />
          : <Copy className={size === 'xs' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />}
    </button>
  )
}

// ─── Code snippet ─────────────────────────────────────────────────────────────

function CodeSnippet({ lang, code }: { lang: string; code: string }) {
  return (
    <div className="relative bg-slate-900 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b border-slate-700">
        <span className="text-xs text-slate-400 font-mono">{lang}</span>
        <CopyBtn text={code} size="xs" />
      </div>
      <pre className="p-4 text-xs text-slate-300 font-mono overflow-x-auto leading-relaxed whitespace-pre-wrap">{code}</pre>
    </div>
  )
}

// ─── Create key modal ─────────────────────────────────────────────────────────

const SCOPE_GROUPS = [
  { label: 'Shipments', items: ['SHIPMENTS_READ', 'SHIPMENTS_WRITE'] },
  { label: 'Clients',   items: ['CLIENTS_READ',   'CLIENTS_WRITE']   },
  { label: 'Documents', items: ['DOCUMENTS_READ', 'DOCUMENTS_WRITE'] },
  { label: 'Full Access', items: ['ALL_READ', 'ALL_WRITE'] },
]

function CreateModal({ onCreated, onClose }: { onCreated: (key: ApiKey & { key: string }) => void; onClose: () => void }) {
  const [form, setForm] = useState({ name: '', description: '', scopes: [] as string[], monthlyLimit: 10000, expiresAt: '' })
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')

  const toggleScope = (s: string) => setForm(p => ({ ...p, scopes: p.scopes.includes(s) ? p.scopes.filter(x => x !== s) : [...p.scopes, s] }))

  const submit = async () => {
    if (!form.name) { setErr('Nama key wajib diisi'); return }
    if (!form.scopes.length) { setErr('Pilih minimal satu scope'); return }
    setLoading(true); setErr('')
    try {
      const res  = await fetch('/api/api-keys', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, expiresAt: form.expiresAt || null }),
      })
      const data = await res.json()
      if (!data.success) { setErr(data.error); return }
      onCreated(data.data)
    } finally { setLoading(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-base font-semibold text-slate-800 flex items-center gap-2"><Key className="w-4 h-4 text-brand-500" /> Buat API Key Baru</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-lg">×</button>
        </div>
        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          {err && <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">{err}</div>}

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Nama Key *</label>
            <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="SAP Integration, ERP Sync, dll"
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20" />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Deskripsi</label>
            <input value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Digunakan untuk sinkronisasi data ke SAP ERP"
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20" />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Scopes (Izin Akses) *</label>
            <div className="space-y-2">
              {SCOPE_GROUPS.map(g => (
                <div key={g.label}>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{g.label}</p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {g.items.map(s => (
                      <button key={s} type="button" onClick={() => toggleScope(s)}
                        className={cn('flex items-center gap-2 px-2.5 py-2 rounded-lg border text-left transition-all',
                          form.scopes.includes(s) ? 'border-brand-400 bg-brand-50' : 'border-slate-200 hover:border-slate-300')}>
                        <div className={cn('w-3.5 h-3.5 rounded flex items-center justify-center border shrink-0',
                          form.scopes.includes(s) ? 'bg-brand-600 border-brand-600' : 'border-slate-300')}>
                          {form.scopes.includes(s) && <Check className="w-2.5 h-2.5 text-white" />}
                        </div>
                        <span className="text-[11px] font-medium text-slate-700">{SCOPE_INFO[s]?.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Limit Bulanan</label>
              <input type="number" value={form.monthlyLimit} onChange={e => setForm(p => ({ ...p, monthlyLimit: parseInt(e.target.value) || 10000 }))}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Kadaluarsa</label>
              <input type="date" value={form.expiresAt} onChange={e => setForm(p => ({ ...p, expiresAt: e.target.value }))}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20" />
              <p className="text-[10px] text-slate-400 mt-1">Kosongkan = tidak kadaluarsa</p>
            </div>
          </div>
        </div>
        <div className="px-6 pb-5 flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50">Batal</button>
          <button onClick={submit} disabled={loading}
            className="flex-1 py-2.5 rounded-xl bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 disabled:opacity-60 flex items-center justify-center gap-2">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Key className="w-4 h-4" />}
            Buat API Key
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── New key reveal modal ─────────────────────────────────────────────────────

function NewKeyModal({ apiKey, keyString, onClose }: { apiKey: ApiKey; keyString: string; onClose: () => void }) {
  const [shown, setShown] = useState(false)
  const [copied, setCopied] = useState(false)

  const copy = async () => { await navigator.clipboard.writeText(keyString); setCopied(true); setTimeout(() => setCopied(false), 2000) }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="p-6">
          <div className="w-12 h-12 rounded-2xl bg-green-100 flex items-center justify-center mx-auto mb-4">
            <ShieldCheck className="w-6 h-6 text-green-600" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 text-center mb-1">API Key Berhasil Dibuat</h3>
          <p className="text-sm text-slate-500 text-center mb-5">Salin key ini sekarang. <strong className="text-red-600">Tidak akan ditampilkan lagi setelah jendela ini ditutup.</strong></p>

          <div className="bg-slate-900 rounded-xl p-4 flex items-center gap-3 mb-4">
            <code className="flex-1 text-sm text-green-400 font-mono break-all">
              {shown ? keyString : keyString.slice(0, 12) + '•'.repeat(30)}
            </code>
            <div className="flex items-center gap-1 shrink-0">
              <button onClick={() => setShown(p => !p)} className="p-1.5 text-slate-400 hover:text-white">
                {shown ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
              <button onClick={copy} className={cn('p-1.5 rounded transition-all', copied ? 'text-green-400' : 'text-slate-400 hover:text-white')}>
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-2 mb-5">
            <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
            <p className="text-xs text-amber-700">Simpan key ini di secret manager atau environment variable. Jangan simpan di code repository.</p>
          </div>

          <button onClick={copy} className="w-full py-3 bg-brand-600 text-white rounded-xl font-semibold hover:bg-brand-700 flex items-center justify-center gap-2 mb-3">
            <Copy className="w-4 h-4" /> {copied ? 'Tersalin!' : 'Salin API Key'}
          </button>
          <button onClick={onClose} className="w-full py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50">
            Sudah Disimpan, Tutup
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Key row ──────────────────────────────────────────────────────────────────

function KeyRow({ apiKey, onUpdated, onDeleted }: { apiKey: ApiKey; onUpdated: (k: ApiKey) => void; onDeleted: (id: string) => void }) {
  const [open, setOpen] = useState(false)
  const [rotating, setRotating] = useState(false)
  const [newKey, setNewKey] = useState<string | null>(null)
  const usePct = apiKey.monthlyLimit > 0 ? Math.round(apiKey.monthlyCount / apiKey.monthlyLimit * 100) : 0

  const toggle = async () => {
    const res  = await fetch(`/api/api-keys/${apiKey.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ isActive: !apiKey.isActive }) })
    const data = await res.json()
    if (data.success) onUpdated({ ...apiKey, ...data.data })
  }

  const rotate = async () => {
    if (!confirm('Rotate API key? Key lama akan langsung tidak berlaku.')) return
    setRotating(true)
    const res  = await fetch(`/api/api-keys/${apiKey.id}/rotate`, { method: 'POST' })
    const data = await res.json()
    if (data.success) { setNewKey(data.data.key); onUpdated({ ...apiKey, keyPrefix: data.data.keyPrefix }) }
    setRotating(false)
  }

  const del = async () => {
    if (!confirm(`Hapus API key "${apiKey.name}"? Tidak bisa dibatalkan.`)) return
    await fetch(`/api/api-keys/${apiKey.id}`, { method: 'DELETE' })
    onDeleted(apiKey.id)
  }

  return (
    <>
      {newKey && <NewKeyModal apiKey={apiKey} keyString={newKey} onClose={() => setNewKey(null)} />}
      <div className={cn('bg-white rounded-2xl border overflow-hidden transition-all', apiKey.isActive ? 'border-slate-200' : 'border-slate-200 opacity-60')}>
        <div className="p-4 flex items-center gap-4 cursor-pointer" onClick={() => setOpen(p => !p)}>
          <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0', apiKey.isActive ? 'bg-green-100' : 'bg-slate-100')}>
            <Key className={cn('w-4 h-4', apiKey.isActive ? 'text-green-600' : 'text-slate-400')} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-semibold text-slate-800">{apiKey.name}</p>
              {!apiKey.isActive && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-600">Nonaktif</span>}
              {apiKey.expiresAt && new Date(apiKey.expiresAt) < new Date() && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-600">Kadaluarsa</span>}
            </div>
            <div className="flex items-center gap-3 mt-0.5 flex-wrap">
              <code className="text-xs text-slate-400 font-mono">{apiKey.keyPrefix}</code>
              <span className="text-[10px] text-slate-400">{apiKey.monthlyCount.toLocaleString()} / {apiKey.monthlyLimit.toLocaleString()} req bulan ini</span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <div className="hidden sm:block">
              <div className="flex flex-wrap gap-1">
                {apiKey.scopes.slice(0, 2).map(s => (
                  <span key={s} className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded-full', SCOPE_INFO[s]?.color ?? 'bg-slate-100 text-slate-600')}>{SCOPE_INFO[s]?.label ?? s}</span>
                ))}
                {apiKey.scopes.length > 2 && <span className="text-[10px] text-slate-400">+{apiKey.scopes.length - 2}</span>}
              </div>
            </div>
            {open ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </div>
        </div>

        {open && (
          <div className="px-4 pb-4 pt-0 border-t border-slate-100 space-y-4">
            {apiKey.description && <p className="text-xs text-slate-500 mt-3">{apiKey.description}</p>}

            {/* Usage bar */}
            <div>
              <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1.5">
                <span>Penggunaan bulan ini</span>
                <span>{usePct}% ({apiKey.monthlyCount.toLocaleString()} / {apiKey.monthlyLimit.toLocaleString()})</span>
              </div>
              <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div className={cn('h-full rounded-full', usePct > 90 ? 'bg-red-500' : usePct > 70 ? 'bg-amber-400' : 'bg-brand-500')}
                  style={{ width: `${Math.min(100, usePct)}%` }} />
              </div>
            </div>

            {/* All scopes */}
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Scopes</p>
              <div className="flex flex-wrap gap-1.5">
                {apiKey.scopes.map(s => (
                  <span key={s} className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full', SCOPE_INFO[s]?.color ?? 'bg-slate-100 text-slate-600')}>
                    {SCOPE_INFO[s]?.label ?? s} · {SCOPE_INFO[s]?.desc}
                  </span>
                ))}
              </div>
            </div>

            {/* Meta */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              {[
                { label: 'Dibuat', val: new Date(apiKey.createdAt).toLocaleDateString('id-ID') },
                { label: 'Terakhir dipakai', val: apiKey.lastUsedAt ? new Date(apiKey.lastUsedAt).toLocaleDateString('id-ID') : '—' },
                { label: 'Total request', val: Number(apiKey.requestCount).toLocaleString() },
                { label: 'Kadaluarsa', val: apiKey.expiresAt ? new Date(apiKey.expiresAt).toLocaleDateString('id-ID') : 'Tidak' },
              ].map(r => (
                <div key={r.label} className="bg-slate-50 rounded-lg p-2.5">
                  <p className="text-slate-400 mb-0.5">{r.label}</p>
                  <p className="font-semibold text-slate-700">{r.val}</p>
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="flex gap-2 flex-wrap">
              <button onClick={toggle} className={cn('inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all',
                apiKey.isActive ? 'border-slate-200 text-slate-600 hover:bg-slate-50' : 'border-green-200 text-green-700 hover:bg-green-50')}>
                <Power className="w-3 h-3" /> {apiKey.isActive ? 'Nonaktifkan' : 'Aktifkan'}
              </button>
              <button onClick={rotate} disabled={rotating} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border border-amber-200 text-amber-700 hover:bg-amber-50 disabled:opacity-50 transition-all">
                {rotating ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />} Rotate Key
              </button>
              <button onClick={del} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border border-red-200 text-red-700 hover:bg-red-50 transition-all ml-auto">
                <Trash2 className="w-3 h-3" /> Hapus
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

const BASE = process.env.NEXT_PUBLIC_APP_URL ?? 'https://Portalog.id'

const ENDPOINTS = [
  { method: 'GET',    path: '/api/v1/shipments',    scope: 'shipments:read',  desc: 'List semua shipment (mendukung filter & paginasi)' },
  { method: 'POST',   path: '/api/v1/shipments',    scope: 'shipments:write', desc: 'Buat shipment baru' },
  { method: 'GET',    path: '/api/v1/shipments/:id',scope: 'shipments:read',  desc: 'Detail satu shipment beserta dokumen & timeline' },
  { method: 'PATCH',  path: '/api/v1/shipments/:id',scope: 'shipments:write', desc: 'Update status, ETA, biaya, nomor PIB/PEB' },
  { method: 'DELETE', path: '/api/v1/shipments/:id',scope: 'shipments:write', desc: 'Hapus shipment (hanya status DRAFT)' },
  { method: 'GET',    path: '/api/v1/clients',      scope: 'clients:read',    desc: 'List klien / buyer' },
  { method: 'POST',   path: '/api/v1/clients',      scope: 'clients:write',   desc: 'Tambah klien baru' },
  { method: 'GET',    path: '/api/v1/analytics',    scope: 'analytics:read',  desc: 'Ringkasan analytics per tahun' },
]

const METHOD_COLOR: Record<string, string> = {
  GET:    'bg-blue-100 text-blue-800',
  POST:   'bg-green-100 text-green-800',
  PATCH:  'bg-amber-100 text-amber-800',
  DELETE: 'bg-red-100 text-red-800',
}

export default function ApiKeysPage() {
  const [keys, setKeys]         = useState<ApiKey[]>([])
  const [loading, setLoading]   = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [newKey, setNewKey]     = useState<(ApiKey & { key: string }) | null>(null)
  const [tab, setTab]           = useState<'keys' | 'docs'>('keys')

  const load = async () => {
    setLoading(true)
    const res  = await fetch('/api/api-keys')
    const data = await res.json()
    if (data.success) setKeys(data.data)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  return (
    <div className="max-w-5xl space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Key className="w-6 h-6 text-brand-500" /> API Keys
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">Integrasi Portalog dengan ERP, WMS, atau sistem internal Anda</p>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 transition-all">
          <Plus className="w-4 h-4" /> Buat API Key
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        {([{ key: 'keys', label: 'API Keys', icon: Key }, { key: 'docs', label: 'Dokumentasi', icon: Terminal }] as const).map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={cn('inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all',
              tab === t.key ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700')}>
            <t.icon className="w-3.5 h-3.5" /> {t.label}
          </button>
        ))}
      </div>

      {/* Keys tab */}
      {tab === 'keys' && (
        <>
          {loading ? (
            <div className="flex items-center justify-center h-32 gap-2 text-slate-400">
              <Loader2 className="w-5 h-5 animate-spin" /> Memuat API keys...
            </div>
          ) : keys.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
              <Key className="w-10 h-10 text-slate-200 mx-auto mb-3" />
              <p className="text-sm font-semibold text-slate-500 mb-1">Belum ada API key</p>
              <p className="text-xs text-slate-400 mb-4">Buat API key untuk mengintegrasikan Portalog dengan sistem ERP atau WMS Anda</p>
              <button onClick={() => setShowCreate(true)} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700">
                <Plus className="w-4 h-4" /> Buat API Key Pertama
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {keys.map(k => (
                <KeyRow key={k.id} apiKey={k}
                  onUpdated={upd => setKeys(prev => prev.map(x => x.id === upd.id ? upd : x))}
                  onDeleted={id  => setKeys(prev => prev.filter(x => x.id !== id))} />
              ))}
            </div>
          )}
        </>
      )}

      {/* Docs tab */}
      {tab === 'docs' && (
        <div className="space-y-5">
          {/* Base info */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
            <h2 className="text-sm font-semibold text-slate-800 flex items-center gap-2"><Globe className="w-4 h-4 text-brand-500" /> Base URL & Autentikasi</h2>
            <CodeSnippet lang="bash" code={`# Base URL
${BASE}/api/v1

# Autentikasi — Bearer Token di header setiap request
Authorization: Bearer fos_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Contoh request dengan curl
curl -H "Authorization: Bearer YOUR_API_KEY" \\
     -H "Content-Type: application/json" \\
     "${BASE}/api/v1/shipments"`} />
          </div>

          {/* Endpoints */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
            <h2 className="text-sm font-semibold text-slate-800 flex items-center gap-2"><Zap className="w-4 h-4 text-brand-500" /> Endpoint Tersedia</h2>
            <div className="divide-y divide-slate-100">
              {ENDPOINTS.map(ep => (
                <div key={`${ep.method}-${ep.path}`} className="flex items-start gap-3 py-3">
                  <span className={cn('text-[10px] font-bold px-2 py-1 rounded font-mono shrink-0 mt-0.5', METHOD_COLOR[ep.method])}>{ep.method}</span>
                  <div className="flex-1 min-w-0">
                    <code className="text-xs text-slate-800 font-mono">{ep.path}</code>
                    <p className="text-xs text-slate-500 mt-0.5">{ep.desc}</p>
                  </div>
                  <span className="text-[10px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded font-mono shrink-0">{ep.scope}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Code examples */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
            <h2 className="text-sm font-semibold text-slate-800 flex items-center gap-2"><Code className="w-4 h-4 text-brand-500" /> Contoh Request</h2>

            <div>
              <p className="text-xs font-semibold text-slate-600 mb-2">List Shipment (dengan filter)</p>
              <CodeSnippet lang="bash" code={`curl "${BASE}/api/v1/shipments?status=IN_TRANSIT&limit=10&page=1" \\
  -H "Authorization: Bearer fos_live_xxx"

# Filter yang tersedia:
# ?status=IN_TRANSIT   — filter by status
# ?type=EXPORT         — EXPORT atau IMPORT
# ?mode=SEA_FCL        — moda pengiriman
# ?client_id=xxx       — filter by client ID
# ?q=ABC123            — search referensi / kargo
# ?since=2025-01-01T00:00:00Z
# ?until=2025-12-31T23:59:59Z
# ?page=1&limit=20     — paginasi (max 100)`} />
            </div>

            <div>
              <p className="text-xs font-semibold text-slate-600 mb-2">Buat Shipment Baru</p>
              <CodeSnippet lang="bash" code={`curl -X POST "${BASE}/api/v1/shipments" \\
  -H "Authorization: Bearer fos_live_xxx" \\
  -H "Content-Type: application/json" \\
  -d '{
    "clientId": "clm1234567890",
    "type": "EXPORT",
    "mode": "SEA_FCL",
    "originCountry": "ID",
    "originPort": "Tanjung Priok",
    "destinationCountry": "US",
    "destinationPort": "Los Angeles",
    "cargoDescription": "Handmade Furniture",
    "grossWeight": 1200.5,
    "packageCount": 45,
    "hsCode": "9403.60.00",
    "etd": "2025-03-15T00:00:00Z",
    "eta": "2025-04-20T00:00:00Z"
  }'`} />
            </div>

            <div>
              <p className="text-xs font-semibold text-slate-600 mb-2">Update Status Shipment</p>
              <CodeSnippet lang="bash" code={`curl -X PATCH "${BASE}/api/v1/shipments/clm1234567890" \\
  -H "Authorization: Bearer fos_live_xxx" \\
  -H "Content-Type: application/json" \\
  -d '{
    "status": "IN_TRANSIT",
    "statusNote": "Kapal berangkat dari Tanjung Priok",
    "eta": "2025-04-22T00:00:00Z",
    "invoiceNo": "INV-2025-001",
    "totalCost": 15000000
  }'`} />
            </div>

            <div>
              <p className="text-xs font-semibold text-slate-600 mb-2">Format Respons</p>
              <CodeSnippet lang="json" code={`// Sukses
{
  "success": true,
  "data": { ... },
  "meta": { "total": 42, "page": 1, "limit": 20, "totalPages": 3 }
}

// Error
{
  "success": false,
  "error": { "code": "VALIDATION_ERROR", "message": "...", "details": [...] },
  "docs": "https://Portalog.id/docs/api"
}

// Status codes:
// 200 OK, 201 Created, 400 Bad Request,
// 401 Unauthorized, 403 Forbidden, 404 Not Found,
// 422 Unprocessable Entity, 429 Too Many Requests`} />
            </div>
          </div>

          {/* Rate limits */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <h2 className="text-sm font-semibold text-slate-800 flex items-center gap-2 mb-3"><BarChart3 className="w-4 h-4 text-brand-500" /> Rate Limits per Paket</h2>
            <div className="divide-y divide-slate-100">
              {[
                { plan: 'STARTER',    perMin: 30,  perMonth: '10.000' },
                { plan: 'GROWTH',     perMin: 60,  perMonth: '50.000' },
                { plan: 'ENTERPRISE', perMin: 300, perMonth: '500.000' },
              ].map(r => (
                <div key={r.plan} className="flex items-center justify-between py-2.5 text-sm">
                  <span className="font-semibold text-slate-700">{r.plan}</span>
                  <div className="flex items-center gap-4 text-slate-500 text-xs">
                    <span>{r.perMin} req/menit</span>
                    <span>{r.perMonth} req/bulan</span>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-slate-400 mt-3">Rate limit error mengembalikan HTTP 429. Header <code className="bg-slate-100 px-1 rounded">Retry-After</code> berisi detik menunggu.</p>
          </div>
        </div>
      )}

      {/* Modals */}
      {showCreate && (
        <CreateModal
          onClose={() => setShowCreate(false)}
          onCreated={k => { setShowCreate(false); setNewKey(k); setKeys(prev => [k, ...prev]) }}
        />
      )}
      {newKey && <NewKeyModal apiKey={newKey} keyString={newKey.key} onClose={() => setNewKey(null)} />}
    </div>
  )
}
