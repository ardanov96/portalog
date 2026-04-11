'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { cn, formatRupiah } from '@/lib/utils'
import {
  X, FileText, Download, Check, Loader2, AlertCircle,
  Receipt, CreditCard, Percent, Tag,
} from 'lucide-react'

// ─── Schema ───────────────────────────────────────────────────────────────────

const schema = z.object({
  freightCost:       z.string().optional(),
  localCharges:      z.string().optional(),
  customsDuty:       z.string().optional(),
  otherCharges:      z.string().optional(),
  otherChargesLabel: z.string().optional(),
  discount:          z.string().optional(),
  taxPercent:        z.string().optional(),
  notes:             z.string().optional(),
  dueDate:           z.string().optional(),
})
type FormValues = z.infer<typeof schema>

const toNum = (v?: string) => v ? parseFloat(v) || 0 : 0

// ─── Sub-components ───────────────────────────────────────────────────────────

const inp = 'w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400 transition-all'

function Field({
  label, prefix, suffix, placeholder, name, register, hint,
}: {
  label: string; prefix?: string; suffix?: string
  placeholder?: string; name: keyof FormValues; register: any; hint?: string
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">{label}</label>
      <div className="relative">
        {prefix && (
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-medium pointer-events-none">
            {prefix}
          </span>
        )}
        <input
          {...register(name)}
          type="number"
          step="any"
          min="0"
          placeholder={placeholder ?? '0'}
          className={cn(inp, prefix ? 'pl-10' : '', suffix ? 'pr-12' : '')}
        />
        {suffix && (
          <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">
            {suffix}
          </span>
        )}
      </div>
      {hint && <p className="text-[10px] text-slate-400 mt-1">{hint}</p>}
    </div>
  )
}

// ─── Main Modal ───────────────────────────────────────────────────────────────

interface InvoiceModalProps {
  shipmentId:  string
  referenceNo: string
  existingInvoice?: {
    invoiceNo:    string
    freightCost:  number | null
    localCharges: number | null
    customsDuty:  number | null
    totalCost:    number | null
    isPaid:       boolean
  } | null
  onClose:   () => void
  onSuccess: (data: any) => void
}

export function InvoiceModal({
  shipmentId, referenceNo, existingInvoice, onClose, onSuccess,
}: InvoiceModalProps) {
  const [saving, setSaving]   = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [error, setError]     = useState('')
  const [createdId, setCreatedId] = useState<string | null>(
    existingInvoice ? shipmentId : null
  )

  const { register, watch, handleSubmit } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      freightCost:  existingInvoice?.freightCost?.toString()  ?? '',
      localCharges: existingInvoice?.localCharges?.toString() ?? '',
      customsDuty:  existingInvoice?.customsDuty?.toString()  ?? '',
    },
  })

  const v = watch()

  // Live calculation
  const freight   = toNum(v.freightCost)
  const local     = toNum(v.localCharges)
  const customs   = toNum(v.customsDuty)
  const other     = toNum(v.otherCharges)
  const subtotal  = freight + local + customs + other
  const discount  = toNum(v.discount)
  const afterDisc = subtotal - discount
  const taxPct    = toNum(v.taxPercent)
  const taxAmt    = afterDisc * (taxPct / 100)
  const total     = afterDisc + taxAmt

  const onSubmit = async (values: FormValues) => {
    setSaving(true); setError('')
    try {
      const payload = {
        shipmentId,
        freightCost:       toNum(values.freightCost)  || undefined,
        localCharges:      toNum(values.localCharges) || undefined,
        customsDuty:       toNum(values.customsDuty)  || undefined,
        otherCharges:      toNum(values.otherCharges) || undefined,
        otherChargesLabel: values.otherChargesLabel   || undefined,
        discount:          toNum(values.discount)     || undefined,
        taxPercent:        toNum(values.taxPercent)   || undefined,
        notes:             values.notes               || undefined,
        dueDate:           values.dueDate             || undefined,
      }
      const res  = await fetch('/api/invoices', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)
      setCreatedId(data.data.id)
      onSuccess(data.data)
    } catch (e: any) { setError(e.message || 'Gagal membuat invoice') }
    finally { setSaving(false) }
  }

  const downloadPdf = async () => {
    const id = createdId || shipmentId
    setDownloading(true)
    try {
      const res = await fetch(`/api/invoices/${id}/pdf`)
      if (!res.ok) throw new Error('Gagal generate PDF')
      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = `${existingInvoice?.invoiceNo ?? 'invoice'}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e: any) { setError(e.message) }
    finally { setDownloading(false) }
  }

  const markPaid = async () => {
    const id = createdId || shipmentId
    await fetch(`/api/invoices/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isPaid: true }),
    })
    onSuccess({ isPaid: true })
    onClose()
  }

  const hasInvoice = !!existingInvoice || !!createdId

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-brand-50 flex items-center justify-center">
              <Receipt className="w-4 h-4 text-brand-600" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                {hasInvoice ? `Invoice ${existingInvoice?.invoiceNo ?? ''}` : 'Buat Invoice'}
              </h2>
              <p className="text-xs text-slate-400">{referenceNo}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-5">
          <form id="invoice-form" onSubmit={handleSubmit(onSubmit)}>
            <div className="space-y-5">

              {/* Rincian biaya */}
              <div>
                <p className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-brand-500" /> Rincian Biaya
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Ocean/Air Freight" prefix="Rp" name="freightCost" register={register} />
                  <Field label="Local Charges & Handling" prefix="Rp" name="localCharges" register={register} />
                  <Field label="Bea Masuk & PDRI" prefix="Rp" name="customsDuty" register={register} />
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider">Biaya Lainnya</label>
                    <input {...register('otherChargesLabel')} placeholder="Label biaya lainnya..."
                      className={cn(inp, 'text-xs py-1.5')} />
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-medium pointer-events-none">Rp</span>
                      <input {...register('otherCharges')} type="number" step="any" min="0" placeholder="0"
                        className={cn(inp, 'pl-10')} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Diskon & pajak */}
              <div>
                <p className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Percent className="w-3.5 h-3.5 text-brand-500" /> Diskon & Pajak
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Diskon" prefix="Rp" name="discount" register={register} />
                  <Field label="PPN (%)" suffix="%" name="taxPercent" register={register}
                    hint="Misal: 11 untuk PPN 11%" />
                </div>
              </div>

              {/* Live summary */}
              <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
                <p className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-3">Ringkasan</p>
                <div className="space-y-1.5">
                  {freight > 0 && <div className="flex justify-between text-xs text-slate-600"><span>Freight</span><span>{formatRupiah(freight)}</span></div>}
                  {local   > 0 && <div className="flex justify-between text-xs text-slate-600"><span>Local Charges</span><span>{formatRupiah(local)}</span></div>}
                  {customs > 0 && <div className="flex justify-between text-xs text-slate-600"><span>Bea Masuk</span><span>{formatRupiah(customs)}</span></div>}
                  {other   > 0 && <div className="flex justify-between text-xs text-slate-600"><span>{v.otherChargesLabel || 'Biaya Lainnya'}</span><span>{formatRupiah(other)}</span></div>}
                  {subtotal > 0 && <div className="flex justify-between text-xs font-semibold text-slate-700 border-t border-slate-200 pt-1.5"><span>Subtotal</span><span>{formatRupiah(subtotal)}</span></div>}
                  {discount > 0 && <div className="flex justify-between text-xs text-green-600"><span>Diskon</span><span>- {formatRupiah(discount)}</span></div>}
                  {taxPct   > 0 && <div className="flex justify-between text-xs text-slate-600"><span>PPN {taxPct}%</span><span>{formatRupiah(taxAmt)}</span></div>}
                  <div className="flex justify-between text-sm font-bold text-slate-900 border-t border-slate-300 pt-2 mt-1">
                    <span>Total</span>
                    <span className="text-brand-700">{formatRupiah(total)}</span>
                  </div>
                </div>
              </div>

              {/* Info tambahan */}
              <div>
                <p className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-brand-500" /> Info Tambahan
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Jatuh Tempo</label>
                    <input {...register('dueDate')} type="date" className={inp} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Catatan Invoice</label>
                    <input {...register('notes')} placeholder="Instruksi pembayaran, dll..." className={inp} />
                  </div>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

            </div>
          </form>
        </div>

        {/* Footer actions */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 shrink-0">
          {hasInvoice ? (
            <div className="flex items-center gap-3">
              {!existingInvoice?.isPaid && (
                <button onClick={markPaid}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-green-200 bg-green-50 text-green-700 text-sm font-semibold hover:bg-green-100 transition-colors">
                  <Check className="w-4 h-4" /> Tandai Lunas
                </button>
              )}
              <button onClick={downloadPdf} disabled={downloading}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 disabled:opacity-60 transition-colors ml-auto">
                {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                {downloading ? 'Generating PDF...' : 'Download PDF'}
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <button onClick={onClose} className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors">
                Batal
              </button>
              <button type="submit" form="invoice-form" disabled={saving || total === 0}
                className="ml-auto inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 disabled:opacity-50 transition-colors">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                {saving ? 'Menyimpan...' : 'Buat Invoice'}
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
