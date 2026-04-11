'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  Ship, Plane, Truck, Package, User, MapPin,
  Calendar, Weight, Box, Hash, FileText,
  ChevronRight, Loader2, AlertCircle, Check,
  ArrowLeft, Info, Scan,
} from 'lucide-react'
import { HsCodeSuggestor } from '@/components/shipments/HsCodeSuggestor'
import { DocumentScanner } from '@/components/shipments/DocumentScanner'

// ─── Zod schema (mirror dari API) ────────────────────────────────────────────

const schema = z.object({
  clientId:           z.string().min(1, 'Klien wajib dipilih'),
  type:               z.enum(['EXPORT', 'IMPORT'], { required_error: 'Tipe wajib dipilih' }),
  mode:               z.enum(['SEA_FCL', 'SEA_LCL', 'AIR', 'LAND'], { required_error: 'Moda wajib dipilih' }),
  originCountry:      z.string().optional(),
  originPort:         z.string().optional(),
  destinationCountry: z.string().optional(),
  destinationPort:    z.string().optional(),
  cargoDescription:   z.string().optional(),
  grossWeight:        z.string().optional(),
  volume:             z.string().optional(),
  packageCount:       z.string().optional(),
  hsCode:             z.string().optional(),
  vesselName:         z.string().optional(),
  voyageNo:           z.string().optional(),
  etd:                z.string().optional(),
  eta:                z.string().optional(),
  customsDeadline:    z.string().optional(),
  notes:              z.string().optional(),
})

type FormValues = z.infer<typeof schema>

// ─── Options ──────────────────────────────────────────────────────────────────

const TYPE_OPTIONS = [
  { value: 'IMPORT', label: 'Import', desc: 'Barang masuk ke Indonesia', icon: '📥' },
  { value: 'EXPORT', label: 'Export', desc: 'Barang keluar dari Indonesia', icon: '📤' },
]

const MODE_OPTIONS = [
  { value: 'SEA_FCL', label: 'Sea FCL',  desc: 'Full Container Load',       Icon: Ship  },
  { value: 'SEA_LCL', label: 'Sea LCL',  desc: 'Less than Container Load',  Icon: Ship  },
  { value: 'AIR',     label: 'Air Cargo', desc: 'Pengiriman via udara',      Icon: Plane },
  { value: 'LAND',    label: 'Land',      desc: 'Pengiriman via darat',      Icon: Truck },
]

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

// ─── Step indicator ───────────────────────────────────────────────────────────

const STEPS = ['Klien & Tipe', 'Rute', 'Kargo', 'Jadwal', 'Catatan']

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-1.5 mb-8">
      {Array.from({ length: total }, (_, i) => (
        <div key={i} className="flex items-center gap-1.5">
          <div className={cn(
            'flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold transition-all',
            i < current  ? 'bg-brand-600 text-white' :
            i === current ? 'bg-brand-600 text-white ring-4 ring-brand-100' :
            'bg-slate-100 text-slate-400'
          )}>
            {i < current ? <Check className="w-3.5 h-3.5" /> : i + 1}
          </div>
          <span className={cn('text-xs font-medium hidden sm:block', i === current ? 'text-slate-800' : 'text-slate-400')}>
            {STEPS[i]}
          </span>
          {i < total - 1 && <div className={cn('w-8 h-0.5 mx-1', i < current ? 'bg-brand-400' : 'bg-slate-200')} />}
        </div>
      ))}
    </div>
  )
}

// ─── Field wrapper ────────────────────────────────────────────────────────────

function Field({
  label, required, error, children, hint,
}: {
  label: string; required?: boolean; error?: string; children: React.ReactNode; hint?: string
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
        {label} {required && <span className="text-red-500 normal-case">*</span>}
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

const inputCls = (err?: string) => cn(
  'w-full px-3.5 py-2.5 text-sm border rounded-xl bg-white focus:outline-none focus:ring-2 transition-all',
  err
    ? 'border-red-300 focus:ring-red-500/20 focus:border-red-400'
    : 'border-slate-200 focus:ring-brand-500/20 focus:border-brand-400'
)

// ─── Main component ───────────────────────────────────────────────────────────

export function ShipmentForm() {
  const router = useRouter()
  const [step, setStep]         = useState(0)
  const [clients, setClients]   = useState<{ id: string; name: string; companyName: string | null }[]>([])
  const [loadingClients, setLoadingClients] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [showScanner, setShowScanner] = useState(false)
  const [ocrApplied, setOcrApplied]   = useState(0) // count applied fields

  const {
    register, handleSubmit, watch, setValue, trigger,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { type: 'IMPORT', mode: 'SEA_FCL' },
  })

  const watchType = watch('type')
  const watchMode = watch('mode')

  // Fetch clients for dropdown
  useEffect(() => {
    fetch('/api/clients')
      .then(r => r.json())
      .then(d => { if (d.success) setClients(d.data) })
      .finally(() => setLoadingClients(false))
  }, [])

  // Step validation fields
  const STEP_FIELDS: (keyof FormValues)[][] = [
    ['clientId', 'type', 'mode'],
    ['originCountry', 'originPort', 'destinationCountry', 'destinationPort'],
    ['cargoDescription', 'grossWeight', 'volume', 'packageCount', 'hsCode'],
    ['etd', 'eta', 'vesselName', 'voyageNo', 'customsDeadline'],
    ['notes'],
  ]

  const nextStep = async () => {
    const valid = await trigger(STEP_FIELDS[step] as any)
    if (valid) setStep(s => Math.min(s + 1, STEPS.length - 1))
  }
  const prevStep = () => setStep(s => Math.max(s - 1, 0))

  const onSubmit = async (values: FormValues) => {
    setSubmitting(true)
    setSubmitError('')
    try {
      const payload: any = {
        clientId: values.clientId,
        type:     values.type,
        mode:     values.mode,
      }

      // Optional string fields
      const strFields = ['originCountry','originPort','destinationCountry','destinationPort','cargoDescription','hsCode','vesselName','voyageNo','notes']
      strFields.forEach(f => { if (values[f as keyof FormValues]) payload[f] = values[f as keyof FormValues] })

      // Number fields
      if (values.grossWeight)  payload.grossWeight  = parseFloat(values.grossWeight)
      if (values.volume)       payload.volume       = parseFloat(values.volume)
      if (values.packageCount) payload.packageCount = parseInt(values.packageCount)

      // Datetime fields — convert date input to ISO
      const toISO = (d?: string) => d ? new Date(d).toISOString() : undefined
      if (values.etd)             payload.etd             = toISO(values.etd)
      if (values.eta)             payload.eta             = toISO(values.eta)
      if (values.customsDeadline) payload.customsDeadline = toISO(values.customsDeadline)

      const res  = await fetch('/api/shipments', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
      })
      const data = await res.json()

      if (!data.success) throw new Error(data.error)
      router.push(`/shipments/${data.data.id}`)
      router.refresh()
    } catch (e: any) {
      setSubmitError(e.message || 'Gagal membuat shipment')
      setSubmitting(false)
    }
  }

  const applyOcr = (fields: Partial<Record<string, string>>) => {
    let count = 0
    Object.entries(fields).forEach(([key, value]) => {
      if (value) { setValue(key as any, value, { shouldDirty: true }); count++ }
    })
    setOcrApplied(count)
    setShowScanner(false)
    // Auto-advance ke step yang relevan
    if (fields.cargoDescription || fields.grossWeight || fields.hsCode) setStep(2)
    else if (fields.originPort || fields.destinationPort) setStep(1)
  }

  return (
    <div className="max-w-2xl mx-auto">
      <StepIndicator current={step} total={STEPS.length} />

      {/* OCR Scanner Panel */}
      {showScanner && (
        <div className="mb-6">
          <DocumentScanner onApply={applyOcr} onDismiss={() => setShowScanner(false)} />
        </div>
      )}

      {/* OCR success banner */}
      {ocrApplied > 0 && !showScanner && (
        <div className="mb-4 flex items-center gap-2.5 bg-green-50 border border-green-200 rounded-xl px-4 py-2.5">
          <Check className="w-4 h-4 text-green-600 shrink-0" />
          <p className="text-sm text-green-700 font-medium">
            {ocrApplied} field berhasil diisi dari dokumen
          </p>
          <button
            type="button"
            onClick={() => { setOcrApplied(0); setShowScanner(true) }}
            className="ml-auto text-xs text-green-600 font-semibold hover:underline"
          >
            Scan lagi
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)}>

        {/* ── Step 0: Klien & Tipe ── */}
        {step === 0 && (
          <div className="space-y-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-slate-900 mb-1">Klien &amp; Tipe Pengiriman</h2>
                <p className="text-slate-500 text-sm">Pilih klien dan jenis pengiriman</p>
              </div>
              {/* Scan button */}
              {!showScanner && ocrApplied === 0 && (
                <button
                  type="button"
                  onClick={() => setShowScanner(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-brand-200 bg-brand-50 text-brand-700 text-xs font-semibold hover:bg-brand-100 transition-all shrink-0"
                >
                  <Scan className="w-3.5 h-3.5" /> Scan Dokumen
                </button>
              )}
            </div>

            {/* Client select */}
            <Field label="Klien" required error={errors.clientId?.message}>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <select {...register('clientId')} className={cn(inputCls(errors.clientId?.message), 'pl-9 appearance-none')}>
                  <option value="">
                    {loadingClients ? 'Memuat klien...' : '— Pilih klien —'}
                  </option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.companyName || c.name}{c.companyName ? ` (${c.name})` : ''}
                    </option>
                  ))}
                </select>
                <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none rotate-90" />
              </div>
              {clients.length === 0 && !loadingClients && (
                <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                  <Info className="w-3 h-3" /> Belum ada klien. Tambahkan klien terlebih dahulu di menu Klien.
                </p>
              )}
            </Field>

            {/* Type */}
            <Field label="Tipe" required error={errors.type?.message}>
              <div className="grid grid-cols-2 gap-3">
                {TYPE_OPTIONS.map(opt => (
                  <button
                    key={opt.value} type="button"
                    onClick={() => setValue('type', opt.value as any, { shouldValidate: true })}
                    className={cn(
                      'flex items-center gap-3 p-4 rounded-xl border-2 text-left transition-all',
                      watchType === opt.value
                        ? 'border-brand-500 bg-brand-50'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    )}
                  >
                    <span className="text-2xl">{opt.icon}</span>
                    <div>
                      <p className={cn('text-sm font-bold', watchType === opt.value ? 'text-brand-700' : 'text-slate-800')}>
                        {opt.label}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">{opt.desc}</p>
                    </div>
                    {watchType === opt.value && (
                      <div className="ml-auto w-5 h-5 rounded-full bg-brand-500 flex items-center justify-center shrink-0">
                        <Check className="w-3 h-3 text-white" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </Field>

            {/* Mode */}
            <Field label="Moda Pengiriman" required error={errors.mode?.message}>
              <div className="grid grid-cols-2 gap-3">
                {MODE_OPTIONS.map(opt => {
                  const Icon = opt.Icon
                  return (
                    <button
                      key={opt.value} type="button"
                      onClick={() => setValue('mode', opt.value as any, { shouldValidate: true })}
                      className={cn(
                        'flex items-center gap-3 p-3.5 rounded-xl border-2 text-left transition-all',
                        watchMode === opt.value
                          ? 'border-brand-500 bg-brand-50'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      )}
                    >
                      <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center shrink-0',
                        watchMode === opt.value ? 'bg-brand-100' : 'bg-slate-100')}>
                        <Icon className={cn('w-5 h-5', watchMode === opt.value ? 'text-brand-600' : 'text-slate-500')} />
                      </div>
                      <div>
                        <p className={cn('text-sm font-bold', watchMode === opt.value ? 'text-brand-700' : 'text-slate-800')}>
                          {opt.label}
                        </p>
                        <p className="text-[11px] text-slate-400">{opt.desc}</p>
                      </div>
                    </button>
                  )
                })}
              </div>
            </Field>
          </div>
        )}

        {/* ── Step 1: Rute ── */}
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900 mb-1">Rute Pengiriman</h2>
              <p className="text-slate-500 text-sm">Asal dan tujuan kargo</p>
            </div>

            <div className="bg-slate-50 rounded-2xl p-5 space-y-4">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-green-500" /> Asal (Origin)
              </p>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Negara Asal" error={errors.originCountry?.message}>
                  <select {...register('originCountry')} className={cn(inputCls(), 'appearance-none')}>
                    <option value="">— Pilih negara —</option>
                    {COUNTRIES.map(c => (
                      <option key={c.code} value={c.code}>{c.name}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Port / Bandara Asal" error={errors.originPort?.message}>
                  <input {...register('originPort')} placeholder="cth: Shanghai, CGK"
                    className={inputCls(errors.originPort?.message)} />
                </Field>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-slate-200" />
              <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </div>
              <div className="flex-1 h-px bg-slate-200" />
            </div>

            <div className="bg-slate-50 rounded-2xl p-5 space-y-4">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-red-500" /> Tujuan (Destination)
              </p>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Negara Tujuan" error={errors.destinationCountry?.message}>
                  <select {...register('destinationCountry')} className={cn(inputCls(), 'appearance-none')}>
                    <option value="">— Pilih negara —</option>
                    {COUNTRIES.map(c => (
                      <option key={c.code} value={c.code}>{c.name}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Port / Bandara Tujuan" error={errors.destinationPort?.message}>
                  <input {...register('destinationPort')} placeholder="cth: Tanjung Priok, MEL"
                    className={inputCls(errors.destinationPort?.message)} />
                </Field>
              </div>
            </div>
          </div>
        )}

        {/* ── Step 2: Kargo ── */}
        {step === 2 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900 mb-1">Detail Kargo</h2>
              <p className="text-slate-500 text-sm">Informasi barang yang dikirim</p>
            </div>

            <Field label="Deskripsi Kargo" error={errors.cargoDescription?.message}
              hint="Jelaskan jenis barang secara singkat">
              <div className="relative">
                <Package className="absolute left-3 top-3 w-4 h-4 text-slate-400 pointer-events-none" />
                <textarea
                  {...register('cargoDescription')}
                  rows={3}
                  placeholder="cth: Mesin tekstil dan spare parts, Kerajinan tangan rotan..."
                  className={cn(inputCls(errors.cargoDescription?.message), 'pl-9 resize-none')}
                />
              </div>
            </Field>

            <div className="grid grid-cols-3 gap-4">
              <Field label="Berat Bruto (kg)" error={errors.grossWeight?.message}>
                <div className="relative">
                  <Weight className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  <input
                    {...register('grossWeight')}
                    type="number" step="0.01" min="0"
                    placeholder="0.00"
                    className={cn(inputCls(errors.grossWeight?.message), 'pl-9')}
                  />
                </div>
              </Field>
              <Field label="Volume (CBM)" error={errors.volume?.message}>
                <div className="relative">
                  <Box className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  <input
                    {...register('volume')}
                    type="number" step="0.001" min="0"
                    placeholder="0.000"
                    className={cn(inputCls(errors.volume?.message), 'pl-9')}
                  />
                </div>
              </Field>
              <Field label="Jumlah Koli" error={errors.packageCount?.message}>
                <input
                  {...register('packageCount')}
                  type="number" min="1"
                  placeholder="0"
                  className={inputCls(errors.packageCount?.message)}
                />
              </Field>
            </div>

            <Field label="HS Code" error={errors.hsCode?.message}
              hint="Harmonized System Code untuk klasifikasi bea cukai">
              <div className="relative">
                <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <input
                  {...register('hsCode')}
                  placeholder="cth: 8445.11.00"
                  className={cn(inputCls(errors.hsCode?.message), 'pl-9')}
                />
              </div>
            </Field>

            {/* AI HS Code Suggester */}
            <HsCodeSuggestor
              cargoDescription={watch('cargoDescription') ?? ''}
              shipmentType={watch('type') as 'IMPORT' | 'EXPORT'}
              currentHsCode={watch('hsCode')}
              onSelect={(code) => setValue('hsCode', code, { shouldValidate: true })}
            />
          </div>
        )}

        {/* ── Step 3: Jadwal ── */}
        {step === 3 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900 mb-1">Jadwal &amp; Vessel</h2>
              <p className="text-slate-500 text-sm">Informasi kapal/pesawat dan tanggal keberangkatan</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Field label={watchMode === 'AIR' ? 'Nomor Penerbangan' : 'Nama Kapal / Vessel'}
                error={errors.vesselName?.message}>
                <div className="relative">
                  {watchMode === 'AIR'
                    ? <Plane className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    : <Ship  className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  }
                  <input
                    {...register('vesselName')}
                    placeholder={watchMode === 'AIR' ? 'cth: GA715' : 'cth: MSC DIANA'}
                    className={cn(inputCls(errors.vesselName?.message), 'pl-9')}
                  />
                </div>
              </Field>
              <Field label="Voyage / Flight No." error={errors.voyageNo?.message}>
                <input {...register('voyageNo')} placeholder="cth: MD240301"
                  className={inputCls(errors.voyageNo?.message)} />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Field label="ETD (Est. Keberangkatan)" error={errors.etd?.message}>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  <input {...register('etd')} type="date"
                    className={cn(inputCls(errors.etd?.message), 'pl-9')} />
                </div>
              </Field>
              <Field label="ETA (Est. Kedatangan)" error={errors.eta?.message}>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  <input {...register('eta')} type="date"
                    className={cn(inputCls(errors.eta?.message), 'pl-9')} />
                </div>
              </Field>
            </div>

            <Field label="Deadline Bea Cukai" error={errors.customsDeadline?.message}
              hint="Batas waktu penyelesaian dokumen PIB/PEB">
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <input {...register('customsDeadline')} type="date"
                  className={cn(inputCls(errors.customsDeadline?.message), 'pl-9')} />
              </div>
            </Field>
          </div>
        )}

        {/* ── Step 4: Catatan ── */}
        {step === 4 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900 mb-1">Catatan Tambahan</h2>
              <p className="text-slate-500 text-sm">Informasi tambahan untuk tim operasional</p>
            </div>

            <Field label="Catatan" error={errors.notes?.message}
              hint="Instruksi khusus, informasi penting, atau hal yang perlu diperhatikan">
              <div className="relative">
                <FileText className="absolute left-3 top-3 w-4 h-4 text-slate-400 pointer-events-none" />
                <textarea
                  {...register('notes')}
                  rows={5}
                  placeholder="cth: Barang fragile, perlu handling khusus. Hubungi agen di Shanghai sebelum loading..."
                  className={cn(inputCls(errors.notes?.message), 'pl-9 resize-none')}
                />
              </div>
            </Field>

            {/* Summary preview */}
            <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 space-y-3">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Ringkasan Shipment</p>
              <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                <div><span className="text-slate-400">Klien:</span> <span className="font-medium text-slate-800 ml-1">
                  {clients.find(c => c.id === watch('clientId'))?.companyName ||
                   clients.find(c => c.id === watch('clientId'))?.name || '—'}
                </span></div>
                <div><span className="text-slate-400">Tipe:</span> <span className="font-medium text-slate-800 ml-1">{watch('type')}</span></div>
                <div><span className="text-slate-400">Moda:</span> <span className="font-medium text-slate-800 ml-1">{watch('mode')?.replace('_', ' ')}</span></div>
                <div><span className="text-slate-400">Rute:</span> <span className="font-medium text-slate-800 ml-1">
                  {watch('originPort') || watch('originCountry') || '—'} → {watch('destinationPort') || watch('destinationCountry') || '—'}
                </span></div>
                {watch('eta') && <div><span className="text-slate-400">ETA:</span> <span className="font-medium text-slate-800 ml-1">{watch('eta')}</span></div>}
                {watch('grossWeight') && <div><span className="text-slate-400">Berat:</span> <span className="font-medium text-slate-800 ml-1">{watch('grossWeight')} kg</span></div>}
              </div>
            </div>

            {submitError && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                <p className="text-red-700 text-sm">{submitError}</p>
              </div>
            )}
          </div>
        )}

        {/* ── Navigation buttons ── */}
        <div className="flex items-center justify-between mt-8 pt-6 border-t border-slate-100">
          <button
            type="button"
            onClick={step === 0 ? () => window.history.back() : prevStep}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            {step === 0 ? 'Batal' : 'Sebelumnya'}
          </button>

          {step < STEPS.length - 1 ? (
            <button
              type="button"
              onClick={nextStep}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-brand-600 text-white rounded-xl text-sm font-semibold hover:bg-brand-700 active:scale-[0.98] transition-all"
            >
              Selanjutnya <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-brand-600 text-white rounded-xl text-sm font-semibold hover:bg-brand-700 active:scale-[0.98] transition-all disabled:opacity-60"
            >
              {submitting
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Menyimpan...</>
                : <><Check className="w-4 h-4" /> Buat Shipment</>
              }
            </button>
          )}
        </div>

      </form>
    </div>
  )
}
