'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { cn, getInitials, formatDate } from '@/lib/utils'
import {
  Plus, Search, X, Users, Building2, Mail,
  Phone, MapPin, Ship, Loader2, AlertCircle, Check,
} from 'lucide-react'

type Client = {
  id: string; name: string; companyName: string | null
  email: string | null; phone: string | null; city: string | null
  country: string; isActive: boolean; createdAt: string
  _count: { shipments: number }
}

const schema = z.object({
  name:        z.string().min(2, 'Nama minimal 2 karakter'),
  companyName: z.string().optional(),
  npwp:        z.string().optional(),
  email:       z.string().email('Format email tidak valid').optional().or(z.literal('')),
  phone:       z.string().optional(),
  address:     z.string().optional(),
  city:        z.string().optional(),
  country:     z.string().default('ID'),
  notes:       z.string().optional(),
})
type FormValues = z.infer<typeof schema>

function AddClientModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: (c: Client) => void }) {
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { country: 'ID' },
  })

  const onSubmit = async (values: FormValues) => {
    setLoading(true); setError('')
    try {
      const res  = await fetch('/api/clients', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(values) })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)
      onSuccess(data.data)
    } catch (e: any) { setError(e.message || 'Gagal menyimpan') }
    finally { setLoading(false) }
  }

  const inp = (err?: string) => cn(
    'w-full px-3.5 py-2.5 text-sm border rounded-xl bg-white focus:outline-none focus:ring-2 transition-all',
    err ? 'border-red-300 focus:ring-red-500/20' : 'border-slate-200 focus:ring-brand-500/20 focus:border-brand-400'
  )
  const Field = ({ label, err, children }: { label: string; err?: string; children: React.ReactNode }) => (
    <div>
      <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">{label}</label>
      {children}
      {err && <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{err}</p>}
    </div>
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.45)' }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-base font-bold text-slate-900">Tambah Klien Baru</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Nama PIC *" err={errors.name?.message}>
              <input {...register('name')} placeholder="Ahmad Wijaya" className={inp(errors.name?.message)} />
            </Field>
            <Field label="Nama Perusahaan" err={errors.companyName?.message}>
              <input {...register('companyName')} placeholder="CV Wijaya Import" className={inp()} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Email" err={errors.email?.message}>
              <input {...register('email')} type="email" placeholder="email@perusahaan.com" className={inp(errors.email?.message)} />
            </Field>
            <Field label="Telepon" err={errors.phone?.message}>
              <input {...register('phone')} placeholder="+62812..." className={inp()} />
            </Field>
          </div>
          <Field label="NPWP" err={errors.npwp?.message}>
            <input {...register('npwp')} placeholder="12.345.678.9-012.000" className={inp()} />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Kota" err={errors.city?.message}>
              <input {...register('city')} placeholder="Surabaya" className={inp()} />
            </Field>
            <Field label="Negara" err={errors.country?.message}>
              <select {...register('country')} className={cn(inp(), 'appearance-none')}>
                <option value="ID">Indonesia</option>
                <option value="SG">Singapore</option>
                <option value="MY">Malaysia</option>
                <option value="AU">Australia</option>
                <option value="CN">China</option>
                <option value="JP">Japan</option>
                <option value="US">United States</option>
              </select>
            </Field>
          </div>
          <Field label="Alamat" err={errors.address?.message}>
            <textarea {...register('address')} rows={2} placeholder="Jl. Contoh No. 1..." className={cn(inp(), 'resize-none')} />
          </Field>
          <Field label="Catatan" err={errors.notes?.message}>
            <textarea {...register('notes')} rows={2} placeholder="Informasi tambahan..." className={cn(inp(), 'resize-none')} />
          </Field>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-all">Batal</button>
            <button type="submit" disabled={loading} className="flex-1 py-2.5 rounded-xl bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 disabled:opacity-60 transition-all flex items-center justify-center gap-2">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              Simpan Klien
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export function ClientsPageClient() {
  const [clients, setClients]       = useState<Client[]>([])
  const [loading, setLoading]       = useState(true)
  const [search, setSearch]         = useState('')
  const [localSearch, setLocalSearch] = useState('')
  const [showModal, setShowModal]   = useState(false)
  const searchTimer = useRef<ReturnType<typeof setTimeout>>()

  const fetchClients = useCallback(async (q: string) => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (q) params.set('search', q)
      const res  = await fetch(`/api/clients?${params}`)
      const data = await res.json()
      if (data.success) setClients(data.data)
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchClients(search) }, [search, fetchClients])

  const handleSearch = (v: string) => {
    setLocalSearch(v)
    clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => setSearch(v), 400)
  }

  const handleAdded = (client: Client) => {
    setClients(prev => [{ ...client, _count: { shipments: 0 } }, ...prev])
    setShowModal(false)
  }

  return (
    <div className="max-w-7xl space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Klien</h1>
          <p className="text-slate-500 text-sm">Manajemen importir &amp; eksportir</p>
        </div>
        <button onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand-600 text-white rounded-xl text-sm font-semibold hover:bg-brand-700 active:scale-[0.98] transition-all">
          <Plus className="w-4 h-4" /> Tambah Klien
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {[
          { label: 'Total Klien',   value: clients.length, icon: Users,    col: 'text-slate-700', bg: 'bg-slate-50',  bd: 'border-slate-200' },
          { label: 'Total Shipment', value: clients.reduce((s,c) => s + c._count.shipments, 0), icon: Ship, col: 'text-brand-700', bg: 'bg-brand-50', bd: 'border-brand-100' },
          { label: 'Klien Aktif',  value: clients.filter(c => c.isActive).length, icon: Check, col: 'text-green-700', bg: 'bg-green-50', bd: 'border-green-100' },
        ].map(s => (
          <div key={s.label} className={cn('px-4 py-3 rounded-xl border', s.bg, s.bd)}>
            <p className={cn('text-2xl font-bold', s.col)}>{s.value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        <input type="text" value={localSearch} onChange={e => handleSearch(e.target.value)}
          placeholder="Cari nama, perusahaan, email..."
          className="w-full pl-9 pr-8 py-2.5 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400 transition-all" />
        {localSearch && (
          <button onClick={() => handleSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"><X className="w-3.5 h-3.5" /></button>
        )}
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-slate-200 p-5 animate-pulse">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-11 h-11 rounded-xl bg-slate-100" />
                <div className="flex-1"><div className="h-4 bg-slate-100 rounded w-3/4 mb-1.5" /><div className="h-3 bg-slate-100 rounded w-1/2" /></div>
              </div>
              <div className="space-y-2">{[...Array(3)].map((_, j) => <div key={j} className="h-3 bg-slate-100 rounded" />)}</div>
            </div>
          ))}
        </div>
      ) : clients.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center">
          <Users className="w-10 h-10 text-slate-200 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">{search ? 'Tidak ada klien yang cocok' : 'Belum ada klien'}</p>
          {!search && (
            <button onClick={() => setShowModal(true)} className="mt-4 text-sm text-brand-600 font-semibold hover:underline">
              + Tambah klien pertama
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {clients.map(c => (
            <Link key={c.id} href={`/clients/${c.id}`}
              className="bg-white rounded-2xl border border-slate-200 p-5 hover:border-brand-200 hover:shadow-sm transition-all group block">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-11 h-11 rounded-xl bg-brand-50 flex items-center justify-center text-brand-700 text-sm font-bold shrink-0 group-hover:bg-brand-100 transition-colors">
                  {getInitials(c.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-800 truncate group-hover:text-brand-600 transition-colors">
                    {c.companyName || c.name}
                  </p>
                  {c.companyName && <p className="text-xs text-slate-400 truncate">{c.name}</p>}
                </div>
                <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0',
                  c.isActive ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-500')}>
                  {c.isActive ? 'Aktif' : 'Nonaktif'}
                </span>
              </div>
              <div className="space-y-1.5">
                {c.email && (
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{c.email}</span>
                  </div>
                )}
                {c.phone && (
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{c.phone}</span>
                  </div>
                )}
                {c.city && (
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{c.city}, {c.country}</span>
                  </div>
                )}
              </div>
              <div className="mt-4 pt-3 border-t border-slate-50 flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <Ship className="w-3.5 h-3.5 text-slate-400" />
                  <span><span className="font-semibold text-slate-700">{c._count.shipments}</span> shipment</span>
                </div>
                <span className="text-[10px] text-slate-400">{formatDate(c.createdAt)}</span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {showModal && <AddClientModal onClose={() => setShowModal(false)} onSuccess={handleAdded} />}
    </div>
  )
}
