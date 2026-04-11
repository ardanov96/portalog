'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { HsCodeSuggestor } from '@/components/shipments/HsCodeSuggestor'
import { DocumentScanner } from '@/components/shipments/DocumentScanner'
import {
  ChevronLeft, Save, Loader2, AlertCircle, Check,
  Ship, Plane, Truck, MapPin, Package, Calendar,
  Weight, Box, Hash, FileText, User, Info,
  CheckCircle2, RefreshCw, Scan,
} from 'lucide-react'

// ─── Schema ───────────────────────────────────────────────────────────────────

const schema = z.object({
  // Klien & Tipe (read-only di edit — jangan ubah setelah dibuat)
  type: z.enum(['EXPORT', 'IMPORT']),
  mode: z.enum(['SEA_FCL', 'SEA_LCL', 'AIR', 'LAND']),

  // Rute
  originCountry:      z.string().optional(),
  originPort:         z.string().optional(),
  destinationCountry: z.string().optional(),
  destinationPort:    z.string().optional(),

  // Kargo
  cargoDescription: z.string().optional(),
  grossWeight:      z.string().optional(),
  volume:           z.string().optional(),
  packageCount:     z.string().optional(),
  hsCode:           z.string().optional(),

  // Vessel & Jadwal
  vesselName:      z.string().optional(),
  voyageNo:        z.string().optional(),
  etd:             z.string().optional(),
  eta:             z.string().optional(),
  customsDeadline: z.string().optional(),

  // Bea cukai
  pibNo: z.string().optional(),
  pebNo: z.string().optional(),

  // Catatan
  notes:         z.string().optional(),
  internalNotes: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

// ─── Config ───────────────────────────────────────────────────────────────────

const COUNTRIES = [
  { code: 'ID', name: 'Indonesia' },
  { code: 'CN', name: 'China' },
  { code: 'SG', name: 'Singapore' },
  { code: 'MY', name: 'Malaysia' },
  { code: 'JP', name: 'Japan' },
  { code: 'KR', name: 'South Korea' },
  { code: 'US', name: 'United States' },
  { code: 'AU', name: 'Australia' },
  { code: 'DE', name: 'Germany' },
  { code: 'NL', name: 'Netherlands' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'IN', name: 'India' },
  { code: 'TH', name: 'Thailand' },
  { code: 'VN', name: 'Vietnam' },
  { code: 'PH', name: 'Philippines' },
  { code: 'HK', name: 'Hong Kong' },
  { code: 'TW', name: 'Taiwan' },
  { code: 'AE', name: 'United Arab Emirates' },
]

const MODE_LABEL: Record<string, string> = {
  SEA_FCL: 'Sea FCL', SEA_LCL: 'Sea LCL', AIR: 'Air Cargo', LAND: 'Land',
}

const TABS = [
  { id: 'route',    label: 'Rute',       icon: MapPin     },
  { id: 'cargo',    label: 'Kargo',      icon: Package    },
  { id: 'schedule', label: 'Jadwal',     icon: Calendar   },
  { id: 'customs',  label: 'Bea Cukai',  icon: Hash       },
  { id: 'notes',    label: 'Catatan',    icon: FileText   },
] as const

type TabId = typeof TABS[number]['id']

// ─── Field helper ─────────────────────────────────────────────────────────────

function Field({
  label, required, error, hint, children,
}: {
  label: string; required?: boolean; error?: string; hint?: string; children: React.ReactNode
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
        {label} {required && <span className="text-red-500 normal-case font-normal">*</span>}
      </label>
      {children}
      {hint && !error && <p className="text-[11px] text-slate-400 mt-1">{hint}</p>}
      {error && (
        <p className="flex items-center gap-1 text-xs text-red-500 mt-1">
          <AlertCircle className="w-3 h-3 shrink-0" /> {error}
        </p>
      )}
    </div>
  )
}

const inp = (err?: string) => cn(
  'w-full px-3.5 py-2.5 text-sm border rounded-xl bg-white focus:outline-none focus:ring-2 transition-all',
  err
    ? 'border-red-300 focus:ring-red-500/20 focus:border-red-400'
    : 'border-slate-200 focus:ring-brand-500/20 focus:border-brand-400'
)

function toDateInput(v?: string | null): string {
  if (!v) return ''
  try { return new Date(v).toISOString().split('T')[0] } catch { return '' }
}

// ─── Main component ───────────────────────────────────────────────────────────

interface ShipmentData {
  id: string; referenceNo: string; type: string; mode: string; status: string
  originCountry: string | null; originPort: string | null
  destinationCountry: string | null; destinationPort: string | null
  cargoDescription: string | null; grossWeight: number | null
  volume: number | null; packageCount: number | null; hsCode: string | null
  vesselName: string | null; voyageNo: string | null
  etd: string | null; eta: string | null; customsDeadline: string | null
  pibNo: string | null; pebNo: string | null
  notes: string | null; internalNotes: string | null
  client: { id: string; name: string; companyName: string | null }
}

interface Props {
  shipment: ShipmentData
  clients:  { id: string; name: string; companyName: string | null }[]
}

export function ShipmentEditClient({ shipment, clients }: Props) {
  const router               = useRouter()
  const [tab, setTab]        = useState<TabId>('route')
  const [saving, setSaving]  = useState(false)
  const [saved, setSaved]    = useState(false)
  const [error, setError]    = useState('')
  const [showScanner, setShowScanner] = useState(false)
  const [ocrApplied, setOcrApplied]   = useState(0)
  const [dirtyTabs, setDirtyTabs] = useState<Set<TabId>>(new Set())

  const {
    register, handleSubmit, watch, setValue,
    formState: { errors, isDirty },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      type:               shipment.type as any,
      mode:               shipment.mode as any,
      originCountry:      shipment.originCountry    ?? '',
      originPort:         shipment.originPort       ?? '',
      destinationCountry: shipment.destinationCountry ?? '',
      destinationPort:    shipment.destinationPort  ?? '',
      cargoDescription:   shipment.cargoDescription ?? '',
      grossWeight:        shipment.grossWeight?.toString()  ?? '',
      volume:             shipment.volume?.toString()       ?? '',
      packageCount:       shipment.packageCount?.toString() ?? '',
      hsCode:             shipment.hsCode           ?? '',
      vesselName:         shipment.vesselName       ?? '',
      voyageNo:           shipment.voyageNo         ?? '',
      etd:                toDateInput(shipment.etd),
      eta:                toDateInput(shipment.eta),
      customsDeadline:    toDateInput(shipment.customsDeadline),
      pibNo:              shipment.pibNo            ?? '',
      pebNo:              shipment.pebNo            ?? '',
      notes:              shipment.notes            ?? '',
      internalNotes:      shipment.internalNotes    ?? '',
    },
  })

  const watchType = watch('type')
  const watchMode = watch('mode')

  const onSubmit = async (values: FormValues) => {
    setSaving(true); setError(''); setSaved(false)
    try {
      const toISO = (d?: string) => {
        if (!d) return undefined
        const dt = new Date(d)
        return isNaN(dt.getTime()) ? undefined : dt.toISOString()
      }

      const payload: Record<string, any> = {
        originCountry:      values.originCountry      || undefined,
        originPort:         values.originPort         || undefined,
        destinationCountry: values.destinationCountry || undefined,
        destinationPort:    values.destinationPort    || undefined,
        cargoDescription:   values.cargoDescription   || undefined,
        hsCode:             values.hsCode             || undefined,
        vesselName:         values.vesselName         || undefined,
        voyageNo:           values.voyageNo           || undefined,
        pibNo:              values.pibNo              || undefined,
        pebNo:              values.pebNo              || undefined,
        notes:              values.notes              || undefined,
        internalNotes:      values.internalNotes      || undefined,
        etd:                toISO(values.etd),
        eta:                toISO(values.eta),
        customsDeadline:    toISO(values.customsDeadline),
      }

      if (values.grossWeight)  payload.grossWeight  = parseFloat(values.grossWeight)
      if (values.volume)       payload.volume       = parseFloat(values.volume)
      if (values.packageCount) payload.packageCount = parseInt(values.packageCount)

      const res  = await fetch(`/api/shipments/${shipment.id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)

      setSaved(true)
      setDirtyTabs(new Set())
      setTimeout(() => setSaved(false), 3000)
    } catch (e: any) {
      setError(e.message || 'Gagal menyimpan perubahan')
    } finally {
      setSaving(false)
    }
  }

  const applyOcr = (fields: Partial<Record<string, string>>) => {
    let count = 0
    Object.entries(fields).forEach(([k, v]) => {
      if (v) { setValue(k as any, v, { shouldDirty: true }); count++ }
    })
    setOcrApplied(count)
    setShowScanner(false)
    // Navigate to the most relevant tab
    if (fields.cargoDescription || fields.grossWeight || fields.hsCode) setTab('cargo')
    else if (fields.originPort || fields.destinationPort) setTab('route')
    else if (fields.vesselName || fields.etd || fields.eta) setTab('schedule')
  }

  const MODE_ICON = watchMode === 'AIR' ? Plane : watchMode === 'LAND' ? Truck : Ship

  return (
    <div className="max-w-3xl space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <Link href={`/shipments/${shipment.id}`}
            className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-brand-600 transition-colors mb-2">
            <ChevronLeft className="w-4 h-4" />
            {shipment.referenceNo}
          </Link>
          <h1 className="text-2xl font-bold text-slate-900">Edit Shipment</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Ubah detail pengiriman — atau scan dokumen untuk mengisi otomatis
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Scan button */}
          {!showScanner && (
            <button
              type="button"
              onClick={() => setShowScanner(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-brand-200 bg-brand-50 text-brand-700 text-sm font-semibold hover:bg-brand-100 transition-all"
            >
              <Scan className="w-4 h-4" /> Scan Dokumen
            </button>
          )}

          {/* Save button */}
          <button
            type="button"
            onClick={handleSubmit(onSubmit)}
            disabled={saving || !isDirty}
            className={cn(
              'inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all',
              saved
                ? 'bg-green-600 text-white'
                : isDirty
                ? 'bg-brand-600 text-white hover:bg-brand-700 active:scale-[0.98] shadow-sm shadow-brand-600/20'
                : 'bg-slate-100 text-slate-400 cursor-not-allowed'
            )}
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" />
             : saved  ? <CheckCircle2 className="w-4 h-4" />
             : <Save className="w-4 h-4" />}
            {saving ? 'Menyimpan...' : saved ? 'Tersimpan!' : 'Simpan Perubahan'}
          </button>
        </div>
      </div>

      {/* Scanner panel */}
      {showScanner && (
        <div className="mb-2">
          <DocumentScanner onApply={applyOcr} onDismiss={() => setShowScanner(false)} />
        </div>
      )}

      {/* OCR applied banner */}
      {ocrApplied > 0 && !showScanner && (
        <div className="flex items-center gap-2.5 bg-green-50 border border-green-200 rounded-xl px-4 py-2.5">
          <Check className="w-4 h-4 text-green-600 shrink-0" />
          <p className="text-sm text-green-700 font-medium">{ocrApplied} field diisi dari dokumen — jangan lupa simpan</p>
          <button type="button" onClick={() => { setOcrApplied(0); setShowScanner(true) }}
            className="ml-auto text-xs text-green-600 font-semibold hover:underline">Scan lagi</button>
        </div>
      )}

      {/* Info bar — read-only fields */}
      <div className="bg-white rounded-2xl border border-slate-200 px-5 py-4">
        <div className="flex items-center gap-5 flex-wrap">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center">
              <MODE_ICON className="w-4.5 h-4.5 text-slate-500" />
            </div>
            <div>
              <p className="text-xs text-slate-400">Referensi</p>
              <p className="text-sm font-bold text-slate-900 font-mono">{shipment.referenceNo}</p>
            </div>
          </div>
          <div>
            <p className="text-xs text-slate-400">Klien</p>
            <p className="text-sm font-semibold text-slate-800">
              {shipment.client.companyName || shipment.client.name}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Tipe</p>
            <p className="text-sm font-semibold text-slate-800">{watchType}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Moda</p>
            <p className="text-sm font-semibold text-slate-800">{MODE_LABEL[watchMode] ?? watchMode}</p>
          </div>
          <div className="ml-auto flex items-center gap-1.5 text-xs text-slate-400">
            <Info className="w-3.5 h-3.5" />
            Klien, tipe, dan moda tidak dapat diubah setelah dibuat
          </div>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
          <p className="text-sm text-red-700">{error}</p>
          <button onClick={() => setError('')} className="ml-auto text-red-400 hover:text-red-600">
            <span className="text-xs">✕</span>
          </button>
        </div>
      )}

      {/* Main form card */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">

        {/* Tab bar */}
        <div className="flex border-b border-slate-100 overflow-x-auto">
          {TABS.map(t => {
            const Icon = t.icon
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  'flex items-center gap-2 px-5 py-3.5 text-sm font-medium whitespace-nowrap border-b-2 transition-all',
                  tab === t.id
                    ? 'border-brand-500 text-brand-600 bg-brand-50/50'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                {t.label}
              </button>
            )
          })}
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6">

          {/* ── Tab: Rute ── */}
          {tab === 'route' && (
            <div className="space-y-6">
              <div className="bg-slate-50 rounded-2xl p-5 space-y-4">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-green-500" /> Asal (Origin)
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Negara Asal">
                    <select {...register('originCountry')} className={cn(inp(), 'appearance-none')}>
                      <option value="">— Pilih negara —</option>
                      {COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
                    </select>
                  </Field>
                  <Field label="Port / Bandara Asal">
                    <input {...register('originPort')} placeholder="cth: Shanghai, CGK" className={inp()} />
                  </Field>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-slate-200" />
                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
                  <ChevronLeft className="w-4 h-4 text-slate-400 rotate-180" />
                </div>
                <div className="flex-1 h-px bg-slate-200" />
              </div>

              <div className="bg-slate-50 rounded-2xl p-5 space-y-4">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-red-500" /> Tujuan (Destination)
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Negara Tujuan">
                    <select {...register('destinationCountry')} className={cn(inp(), 'appearance-none')}>
                      <option value="">— Pilih negara —</option>
                      {COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
                    </select>
                  </Field>
                  <Field label="Port / Bandara Tujuan">
                    <input {...register('destinationPort')} placeholder="cth: Tanjung Priok, MEL" className={inp()} />
                  </Field>
                </div>
              </div>
            </div>
          )}

          {/* ── Tab: Kargo ── */}
          {tab === 'cargo' && (
            <div className="space-y-5">
              <Field label="Deskripsi Kargo" hint="Jelaskan jenis barang secara singkat dan jelas">
                <div className="relative">
                  <Package className="absolute left-3 top-3 w-4 h-4 text-slate-400 pointer-events-none" />
                  <textarea
                    {...register('cargoDescription')}
                    rows={3}
                    placeholder="cth: Mesin tekstil dan spare parts, Kerajinan tangan rotan..."
                    className={cn(inp(), 'pl-9 resize-none')}
                  />
                </div>
              </Field>

              <div className="grid grid-cols-3 gap-4">
                <Field label="Berat Bruto (kg)">
                  <div className="relative">
                    <Weight className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    <input {...register('grossWeight')} type="number" step="0.01" min="0"
                      placeholder="0.00" className={cn(inp(), 'pl-9')} />
                  </div>
                </Field>
                <Field label="Volume (CBM)">
                  <div className="relative">
                    <Box className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    <input {...register('volume')} type="number" step="0.001" min="0"
                      placeholder="0.000" className={cn(inp(), 'pl-9')} />
                  </div>
                </Field>
                <Field label="Jumlah Koli">
                  <input {...register('packageCount')} type="number" min="1"
                    placeholder="0" className={inp()} />
                </Field>
              </div>

              <Field label="HS Code" hint="Harmonized System Code — 8 digit sesuai BTKI Indonesia">
                <div className="relative">
                  <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  <input {...register('hsCode')} placeholder="cth: 8445.11.00"
                    className={cn(inp(), 'pl-9')} />
                </div>
              </Field>

              {/* AI HS Code Suggestor */}
              <HsCodeSuggestor
                cargoDescription={watch('cargoDescription') ?? ''}
                shipmentType={watchType as 'IMPORT' | 'EXPORT'}
                currentHsCode={watch('hsCode')}
                onSelect={(code) => setValue('hsCode', code, { shouldDirty: true })}
              />
            </div>
          )}

          {/* ── Tab: Jadwal ── */}
          {tab === 'schedule' && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <Field label={watchMode === 'AIR' ? 'Nomor Penerbangan' : 'Nama Kapal / Vessel'}>
                  <div className="relative">
                    {watchMode === 'AIR'
                      ? <Plane className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                      : <Ship  className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    }
                    <input {...register('vesselName')}
                      placeholder={watchMode === 'AIR' ? 'cth: GA715' : 'cth: MSC DIANA'}
                      className={cn(inp(), 'pl-9')} />
                  </div>
                </Field>
                <Field label="Voyage / Flight No.">
                  <input {...register('voyageNo')} placeholder="cth: MD240301" className={inp()} />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Field label="ETD (Estimasi Keberangkatan)">
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    <input {...register('etd')} type="date" className={cn(inp(), 'pl-9')} />
                  </div>
                </Field>
                <Field label="ETA (Estimasi Kedatangan)">
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    <input {...register('eta')} type="date" className={cn(inp(), 'pl-9')} />
                  </div>
                </Field>
              </div>

              <Field label="Deadline Bea Cukai" hint="Batas waktu penyelesaian dokumen PIB/PEB">
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  <input {...register('customsDeadline')} type="date" className={cn(inp(), 'pl-9')} />
                </div>
              </Field>
            </div>
          )}

          {/* ── Tab: Bea Cukai ── */}
          {tab === 'customs' && (
            <div className="space-y-5">
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-2">
                <Info className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700 leading-relaxed">
                  Nomor PIB dan PEB diisi setelah dokumen bea cukai selesai diproses.
                  Pastikan nomor yang diisi sudah sesuai dengan dokumen resmi dari INSW/CEISA.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Field label="No. PIB" hint="Pemberitahuan Impor Barang">
                  <div className="relative">
                    <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    <input {...register('pibNo')} placeholder="Nomor PIB..." className={cn(inp(), 'pl-9 font-mono')} />
                  </div>
                </Field>
                <Field label="No. PEB" hint="Pemberitahuan Ekspor Barang">
                  <div className="relative">
                    <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    <input {...register('pebNo')} placeholder="Nomor PEB..." className={cn(inp(), 'pl-9 font-mono')} />
                  </div>
                </Field>
              </div>
            </div>
          )}

          {/* ── Tab: Catatan ── */}
          {tab === 'notes' && (
            <div className="space-y-5">
              <Field label="Catatan (terlihat oleh klien)"
                hint="Informasi yang bisa dilihat klien di portal tracking">
                <div className="relative">
                  <FileText className="absolute left-3 top-3 w-4 h-4 text-slate-400 pointer-events-none" />
                  <textarea
                    {...register('notes')}
                    rows={4}
                    placeholder="Instruksi khusus, informasi penting untuk klien..."
                    className={cn(inp(), 'pl-9 resize-none')}
                  />
                </div>
              </Field>

              <Field label="Catatan Internal (hanya tim FF)"
                hint="Catatan operasional — tidak terlihat oleh klien">
                <div className="relative">
                  <User className="absolute left-3 top-3 w-4 h-4 text-slate-400 pointer-events-none" />
                  <textarea
                    {...register('internalNotes')}
                    rows={4}
                    placeholder="Catatan untuk agen, instruksi internal, follow-up items..."
                    className={cn(inp(), 'pl-9 resize-none')}
                  />
                </div>
              </Field>
            </div>
          )}

        </form>

        {/* Bottom action bar */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-3">
          <Link
            href={`/shipments/${shipment.id}`}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-white hover:border-slate-300 transition-all"
          >
            <ChevronLeft className="w-4 h-4" /> Kembali ke Detail
          </Link>

          <div className="flex items-center gap-3">
            {isDirty && !saved && (
              <p className="text-xs text-amber-600 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" /> Ada perubahan yang belum disimpan
              </p>
            )}
            {saved && (
              <p className="text-xs text-green-600 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" /> Perubahan berhasil disimpan
              </p>
            )}
            <button
              type="button"
              onClick={handleSubmit(onSubmit)}
              disabled={saving || !isDirty}
              className={cn(
                'inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all',
                saved
                  ? 'bg-green-600 text-white'
                  : isDirty
                  ? 'bg-brand-600 text-white hover:bg-brand-700 active:scale-[0.98]'
                  : 'bg-slate-100 text-slate-400 cursor-not-allowed'
              )}
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" />
               : saved  ? <Check className="w-4 h-4" />
               : <Save className="w-4 h-4" />}
              {saving ? 'Menyimpan...' : saved ? 'Tersimpan!' : 'Simpan'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
