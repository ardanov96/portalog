'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { cn, getInitials, formatDate } from '@/lib/utils'
import {
  ChevronLeft, Edit2, Save, X, Ship, Plane, Truck,
  Mail, Phone, MapPin, Building2, Hash, FileText,
  Loader2, AlertCircle, Check, Trash2, Package,
} from 'lucide-react'

const STATUS_CFG: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  DRAFT:              { label: 'Draft',      bg: 'bg-slate-100', text: 'text-slate-600', dot: 'bg-slate-400' },
  BOOKING_CONFIRMED:  { label: 'Booking',    bg: 'bg-blue-50',   text: 'text-blue-700',  dot: 'bg-blue-500'  },
  DOCS_IN_PROGRESS:   { label: 'Dokumen',    bg: 'bg-amber-50',  text: 'text-amber-700', dot: 'bg-amber-500' },
  CUSTOMS_PROCESSING: { label: 'Bea Cukai',  bg: 'bg-orange-50', text: 'text-orange-700',dot: 'bg-orange-500'},
  CARGO_RELEASED:     { label: 'Released',   bg: 'bg-teal-50',   text: 'text-teal-700',  dot: 'bg-teal-500'  },
  IN_TRANSIT:         { label: 'In Transit', bg: 'bg-indigo-50', text: 'text-indigo-700',dot: 'bg-indigo-500'},
  ARRIVED:            { label: 'Tiba',       bg: 'bg-purple-50', text: 'text-purple-700',dot: 'bg-purple-500'},
  DELIVERED:          { label: 'Dikirim',    bg: 'bg-green-50',  text: 'text-green-700', dot: 'bg-green-500' },
  COMPLETED:          { label: 'Selesai',    bg: 'bg-green-100', text: 'text-green-800', dot: 'bg-green-600' },
  CANCELLED:          { label: 'Batal',      bg: 'bg-red-50',    text: 'text-red-700',   dot: 'bg-red-500'   },
}

const editSchema = z.object({
  name:        z.string().min(2),
  companyName: z.string().optional(),
  npwp:        z.string().optional(),
  email:       z.string().email().optional().or(z.literal('')),
  phone:       z.string().optional(),
  address:     z.string().optional(),
  city:        z.string().optional(),
  notes:       z.string().optional(),
})
type EditForm = z.infer<typeof editSchema>

export default function ClientDetailPage() {
  const { id }   = useParams<{ id: string }>()
  const router   = useRouter()
  const [client, setClient]   = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving]   = useState(false)
  const [saveErr, setSaveErr] = useState('')

  const { register, handleSubmit, reset, formState: { errors } } = useForm<EditForm>({ resolver: zodResolver(editSchema) })

  useEffect(() => {
    fetch(`/api/clients/${id}`).then(r => r.json()).then(d => {
      if (d.success) { setClient(d.data); reset(d.data) }
    }).finally(() => setLoading(false))
  }, [id, reset])

  const onSave = async (values: EditForm) => {
    setSaving(true); setSaveErr('')
    try {
      const res  = await fetch(`/api/clients/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(values) })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)
      setClient((prev: any) => ({ ...prev, ...data.data }))
      setEditing(false)
    } catch (e: any) { setSaveErr(e.message) }
    finally { setSaving(false) }
  }

  const inp = (err?: string) => cn(
    'w-full px-3 py-2 text-sm border rounded-xl focus:outline-none focus:ring-2 transition-all',
    err ? 'border-red-300 focus:ring-red-500/20' : 'border-slate-200 focus:ring-brand-500/20 focus:border-brand-400'
  )

  if (loading) return (
    <div className="max-w-4xl animate-pulse space-y-4">
      <div className="h-8 bg-slate-100 rounded w-48" />
      <div className="h-40 bg-slate-100 rounded-2xl" />
      <div className="h-64 bg-slate-100 rounded-2xl" />
    </div>
  )

  if (!client) return (
    <div className="text-center py-20">
      <p className="text-slate-500">Klien tidak ditemukan</p>
      <Link href="/clients" className="text-brand-600 text-sm font-semibold mt-2 hover:underline">← Kembali</Link>
    </div>
  )

  return (
    <div className="max-w-4xl space-y-5">
      {/* Breadcrumb */}
      <div className="flex items-center justify-between">
        <Link href="/clients" className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-brand-600 transition-colors">
          <ChevronLeft className="w-4 h-4" /> Klien
        </Link>
        <div className="flex items-center gap-2">
          {editing ? (
            <>
              <button onClick={() => { setEditing(false); reset(client) }} className="px-3 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 flex items-center gap-1.5">
                <X className="w-4 h-4" /> Batal
              </button>
              <button onClick={handleSubmit(onSave)} disabled={saving}
                className="px-4 py-2 rounded-xl bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 disabled:opacity-60 flex items-center gap-1.5">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Simpan
              </button>
            </>
          ) : (
            <button onClick={() => setEditing(true)}
              className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 flex items-center gap-1.5">
              <Edit2 className="w-4 h-4" /> Edit
            </button>
          )}
        </div>
      </div>

      {/* Header card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-xl bg-brand-50 flex items-center justify-center text-brand-700 text-lg font-bold shrink-0">
            {getInitials(client.name)}
          </div>
          <div className="flex-1 min-w-0">
            {editing ? (
              <div className="space-y-3">
                {saveErr && <p className="text-xs text-red-500 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{saveErr}</p>}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Nama PIC *</label>
                    <input {...register('name')} className={inp(errors.name?.message)} />
                    {errors.name && <p className="text-xs text-red-500 mt-0.5">{errors.name.message}</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Nama Perusahaan</label>
                    <input {...register('companyName')} className={inp()} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Email</label>
                    <input {...register('email')} type="email" className={inp(errors.email?.message)} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Telepon</label>
                    <input {...register('phone')} className={inp()} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">NPWP</label>
                    <input {...register('npwp')} className={inp()} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Kota</label>
                    <input {...register('city')} className={inp()} />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Alamat</label>
                  <textarea {...register('address')} rows={2} className={cn(inp(), 'resize-none')} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Catatan</label>
                  <textarea {...register('notes')} rows={2} className={cn(inp(), 'resize-none')} />
                </div>
              </div>
            ) : (
              <>
                <h1 className="text-xl font-bold text-slate-900">{client.companyName || client.name}</h1>
                {client.companyName && <p className="text-slate-500 text-sm">{client.name}</p>}
                <div className="flex flex-wrap gap-4 mt-3">
                  {client.email && <a href={`mailto:${client.email}`} className="flex items-center gap-1.5 text-xs text-brand-600 hover:underline"><Mail className="w-3.5 h-3.5" />{client.email}</a>}
                  {client.phone && <span className="flex items-center gap-1.5 text-xs text-slate-500"><Phone className="w-3.5 h-3.5 text-slate-400" />{client.phone}</span>}
                  {client.city && <span className="flex items-center gap-1.5 text-xs text-slate-500"><MapPin className="w-3.5 h-3.5 text-slate-400" />{client.city}, {client.country}</span>}
                  {client.npwp && <span className="flex items-center gap-1.5 text-xs text-slate-500 font-mono"><Hash className="w-3.5 h-3.5 text-slate-400" />{client.npwp}</span>}
                </div>
                {client.notes && <p className="text-xs text-slate-500 mt-3 italic bg-slate-50 rounded-lg px-3 py-2 border border-slate-100">{client.notes}</p>}
              </>
            )}
          </div>
          <div className="shrink-0 text-right">
            <div className="text-2xl font-bold text-slate-900">{client._count.shipments}</div>
            <div className="text-xs text-slate-400">Total shipment</div>
          </div>
        </div>
      </div>

      {/* Shipment history */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
            <Ship className="w-4 h-4 text-brand-500" /> Riwayat Shipment
          </h3>
        </div>
        {client.shipments?.length === 0 ? (
          <div className="p-10 text-center">
            <Package className="w-8 h-8 text-slate-200 mx-auto mb-2" />
            <p className="text-slate-400 text-sm">Belum ada shipment untuk klien ini</p>
            <Link href={`/shipments/new`} className="mt-2 text-xs text-brand-600 font-semibold hover:underline block">
              + Buat shipment baru
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {client.shipments?.map((s: any) => {
              const cfg = STATUS_CFG[s.status] ?? STATUS_CFG.DRAFT
              return (
                <Link key={s.id} href={`/shipments/${s.id}`}
                  className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50/60 transition-colors group">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                    {s.mode === 'AIR' ? <Plane className="w-4 h-4 text-slate-500" /> : <Ship className="w-4 h-4 text-slate-500" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 group-hover:text-brand-600 transition-colors">{s.referenceNo}</p>
                    <p className="text-xs text-slate-400">{formatDate(s.createdAt)}</p>
                  </div>
                  <span className={cn('text-xs font-semibold px-2.5 py-1 rounded-full', cfg.bg, cfg.text)}>
                    {cfg.label}
                  </span>
                  {s.eta && <span className="text-xs text-slate-400 whitespace-nowrap">ETA {formatDate(s.eta)}</span>}
                  <span className="text-xs text-slate-400">{s._count.documents} dok</span>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
