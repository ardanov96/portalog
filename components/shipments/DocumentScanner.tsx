'use client'

import { useState, useCallback, useRef } from 'react'
import { useDropzone } from 'react-dropzone'
import { cn } from '@/lib/utils'
import type { ExtractedData } from '@/app/api/ocr/route'
import {
  Scan, Upload, Loader2, Check, AlertTriangle, X,
  FileText, Image, ChevronDown, Sparkles, RefreshCw,
  Eye, EyeOff, Info,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface OcrResult extends ExtractedData {
  fileName: string
  fileSize: number
}

interface FieldPreviewItem {
  label:  string
  value:  string | undefined
  formKey: string
  apply:  boolean
}

// ─── Config ───────────────────────────────────────────────────────────────────

const DOC_TYPE_OPTIONS = [
  { value: 'auto',              label: 'Deteksi otomatis' },
  { value: 'BILL_OF_LADING',   label: 'Bill of Lading (B/L)' },
  { value: 'AIRWAY_BILL',      label: 'Airway Bill (AWB)' },
  { value: 'COMMERCIAL_INVOICE', label: 'Commercial Invoice' },
  { value: 'PACKING_LIST',     label: 'Packing List' },
  { value: 'PIB',              label: 'PIB (Pemberitahuan Impor)' },
  { value: 'PEB',              label: 'PEB (Pemberitahuan Ekspor)' },
]

const CONFIDENCE_CFG = {
  high:   { label: 'Akurasi tinggi',   bg: 'bg-green-50',  text: 'text-green-700',  dot: 'bg-green-500'  },
  medium: { label: 'Akurasi sedang',   bg: 'bg-amber-50',  text: 'text-amber-700',  dot: 'bg-amber-500'  },
  low:    { label: 'Perlu verifikasi', bg: 'bg-red-50',    text: 'text-red-600',    dot: 'bg-red-400'    },
}

// Fields yang bisa di-apply ke form
const FIELD_MAP: { key: keyof ExtractedData; label: string; formKey: string }[] = [
  { key: 'cargoDescription',   label: 'Deskripsi Kargo',        formKey: 'cargoDescription'   },
  { key: 'grossWeight',        label: 'Berat Bruto (kg)',        formKey: 'grossWeight'        },
  { key: 'packageCount',       label: 'Jumlah Koli',            formKey: 'packageCount'       },
  { key: 'hsCode',             label: 'HS Code',                formKey: 'hsCode'             },
  { key: 'originPort',         label: 'Port Asal',              formKey: 'originPort'         },
  { key: 'originCountry',      label: 'Negara Asal',            formKey: 'originCountry'      },
  { key: 'destinationPort',    label: 'Port Tujuan',            formKey: 'destinationPort'    },
  { key: 'destinationCountry', label: 'Negara Tujuan',          formKey: 'destinationCountry' },
  { key: 'vesselName',         label: 'Vessel / Penerbangan',   formKey: 'vesselName'         },
  { key: 'voyageNo',           label: 'Voyage / Flight No.',    formKey: 'voyageNo'           },
  { key: 'etd',                label: 'ETD',                    formKey: 'etd'                },
  { key: 'eta',                label: 'ETA',                    formKey: 'eta'                },
]

// ─── Sub-components ───────────────────────────────────────────────────────────

function FilePreview({ file, onRemove }: { file: File; onRemove: () => void }) {
  const isImage = file.type.startsWith('image/')
  const [objUrl] = useState(() => URL.createObjectURL(file))

  return (
    <div className="relative border border-slate-200 rounded-xl overflow-hidden bg-slate-50">
      {isImage ? (
        <img src={objUrl} alt="Preview" className="w-full max-h-48 object-contain" />
      ) : (
        <div className="flex items-center gap-3 p-4">
          <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
            <FileText className="w-5 h-5 text-red-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-800 truncate">{file.name}</p>
            <p className="text-xs text-slate-400">{(file.size / 1024).toFixed(0)} KB</p>
          </div>
        </div>
      )}
      <button
        onClick={onRemove}
        className="absolute top-2 right-2 w-6 h-6 rounded-full bg-slate-800/60 text-white flex items-center justify-center hover:bg-slate-800 transition-colors"
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  )
}

function ConfidenceBadge({ level }: { level: 'high' | 'medium' | 'low' }) {
  const c = CONFIDENCE_CFG[level]
  return (
    <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold', c.bg, c.text)}>
      <span className={cn('w-1.5 h-1.5 rounded-full', c.dot)} />
      {c.label}
    </span>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

interface DocumentScannerProps {
  onApply:   (fields: Partial<Record<string, string>>) => void
  onDismiss: () => void
}

export function DocumentScanner({ onApply, onDismiss }: DocumentScannerProps) {
  const [file, setFile]           = useState<File | null>(null)
  const [docType, setDocType]     = useState('auto')
  const [scanning, setScanning]   = useState(false)
  const [result, setResult]       = useState<OcrResult | null>(null)
  const [error, setError]         = useState('')
  const [showAll, setShowAll]     = useState(false)
  // Per-field apply checkboxes
  const [selected, setSelected]   = useState<Set<string>>(new Set())

  const onDrop = useCallback((accepted: File[]) => {
    if (accepted[0]) {
      setFile(accepted[0])
      setResult(null)
      setError('')
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxFiles: 1,
    maxSize:  10 * 1024 * 1024,
    accept: {
      'image/jpeg': [], 'image/png': [], 'image/webp': [],
      'application/pdf': [],
    },
  })

  const scan = async () => {
    if (!file) return
    setScanning(true); setError('')

    try {
      const fd = new FormData()
      fd.append('file',    file)
      fd.append('docType', docType)

      const res  = await fetch('/api/ocr', { method: 'POST', body: fd })
      const data = await res.json()

      if (!data.success) throw new Error(data.error)

      const ocr: OcrResult = { ...data.data, fileName: file.name, fileSize: file.size }
      setResult(ocr)

      // Auto-select fields yang ada nilai
      const autoSelected = new Set<string>()
      FIELD_MAP.forEach(({ key, formKey }) => {
        if (ocr[key] && ocr[key] !== 'null') autoSelected.add(formKey)
      })
      setSelected(autoSelected)
    } catch (e: any) {
      setError(e.message || 'Gagal memproses dokumen')
    } finally {
      setScanning(false)
    }
  }

  const toggleField = (formKey: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(formKey)) next.delete(formKey)
      else next.add(formKey)
      return next
    })
  }

  const applySelected = () => {
    if (!result) return
    const fields: Partial<Record<string, string>> = {}
    FIELD_MAP.forEach(({ key, formKey }) => {
      if (selected.has(formKey) && result[key]) {
        fields[formKey] = String(result[key])
      }
    })
    onApply(fields)
  }

  const filledFields = result
    ? FIELD_MAP.filter(({ key }) => result[key] && result[key] !== 'null')
    : []

  const visibleFields = showAll ? filledFields : filledFields.slice(0, 6)

  return (
    <div className="bg-white border border-brand-200 rounded-2xl overflow-hidden shadow-sm">

      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 bg-gradient-to-r from-brand-50 to-indigo-50 border-b border-brand-100">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-brand-100 flex items-center justify-center">
            <Scan className="w-3.5 h-3.5 text-brand-600" />
          </div>
          <div>
            <p className="text-sm font-bold text-brand-800">Scan Dokumen dengan AI</p>
            <p className="text-[10px] text-brand-500">Upload scan BL, AWB, atau Invoice untuk mengisi form otomatis</p>
          </div>
        </div>
        <button onClick={onDismiss} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-white/60 transition-all">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-5 space-y-4">

        {/* Step 1: Upload */}
        {!result && (
          <>
            {!file ? (
              <div
                {...getRootProps()}
                className={cn(
                  'border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all',
                  isDragActive
                    ? 'border-brand-400 bg-brand-50'
                    : 'border-slate-200 hover:border-brand-300 hover:bg-slate-50'
                )}
              >
                <input {...getInputProps()} />
                <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3">
                  <Upload className={cn('w-6 h-6', isDragActive ? 'text-brand-500' : 'text-slate-400')} />
                </div>
                <p className="text-sm font-semibold text-slate-700">
                  {isDragActive ? 'Lepas file di sini...' : 'Drag & drop atau klik untuk upload'}
                </p>
                <p className="text-xs text-slate-400 mt-1.5">
                  JPG, PNG, WebP, PDF · Maks 10 MB
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Cocok untuk: Bill of Lading, Airway Bill, Commercial Invoice, Packing List
                </p>
              </div>
            ) : (
              <FilePreview file={file} onRemove={() => setFile(null)} />
            )}

            {/* Doc type selector */}
            {file && (
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                  Jenis Dokumen
                </label>
                <div className="relative">
                  <select
                    value={docType}
                    onChange={e => setDocType(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl appearance-none focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400"
                  >
                    {DOC_TYPE_OPTIONS.map(o => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <p className="text-xs text-red-700 leading-relaxed">{error}</p>
              </div>
            )}

            {/* Scan button */}
            <button
              type="button"
              onClick={scan}
              disabled={!file || scanning}
              className={cn(
                'w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all',
                file && !scanning
                  ? 'bg-brand-600 text-white hover:bg-brand-700 active:scale-[0.99]'
                  : 'bg-slate-100 text-slate-400 cursor-not-allowed'
              )}
            >
              {scanning
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Menganalisis dokumen dengan AI...</>
                : <><Sparkles className="w-4 h-4" /> Scan &amp; Ekstrak Data</>
              }
            </button>
          </>
        )}

        {/* Step 2: Result */}
        {result && (
          <>
            {/* Doc type + confidence */}
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
                  <Check className="w-4 h-4 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800">{result.docType.replace(/_/g, ' ')}</p>
                  <p className="text-xs text-slate-400">{result.fileName}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <ConfidenceBadge level={result.confidence} />
                <button
                  type="button"
                  onClick={() => { setResult(null); setFile(null); setError('') }}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all"
                  title="Scan ulang"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Warnings */}
            {result.warnings && result.warnings.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 space-y-1">
                <p className="text-xs font-semibold text-amber-700 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" /> Perlu diverifikasi
                </p>
                {result.warnings.map((w, i) => (
                  <p key={i} className="text-xs text-amber-600 leading-relaxed">• {w}</p>
                ))}
              </div>
            )}

            {/* Shipper / consignee hint */}
            {(result.shipperName || result.consigneeName) && (
              <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
                <p className="text-xs font-semibold text-blue-700 mb-1 flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5" /> Info Pihak
                </p>
                {result.shipperName   && <p className="text-xs text-blue-600">Shipper: <span className="font-semibold">{result.shipperName}</span></p>}
                {result.consigneeName && <p className="text-xs text-blue-600">Consignee: <span className="font-semibold">{result.consigneeName}</span></p>}
              </div>
            )}

            {/* Field checkboxes */}
            {filledFields.length > 0 ? (
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <p className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Data Ditemukan ({filledFields.length} field)
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setSelected(new Set(filledFields.map(f => f.formKey)))}
                      className="text-xs text-brand-600 font-semibold hover:underline"
                    >
                      Pilih semua
                    </button>
                    <span className="text-slate-300">·</span>
                    <button
                      type="button"
                      onClick={() => setSelected(new Set())}
                      className="text-xs text-slate-400 hover:underline"
                    >
                      Batalkan
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  {visibleFields.map(({ key, label, formKey }) => {
                    const val = result[key]
                    if (!val || val === 'null') return null
                    const isChecked = selected.has(formKey)

                    return (
                      <button
                        key={formKey}
                        type="button"
                        onClick={() => toggleField(formKey)}
                        className={cn(
                          'w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl border text-left transition-all',
                          isChecked
                            ? 'border-brand-300 bg-brand-50'
                            : 'border-slate-200 bg-white hover:border-slate-300'
                        )}
                      >
                        <div className={cn(
                          'w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-all',
                          isChecked ? 'bg-brand-600 border-brand-600' : 'border-slate-300'
                        )}>
                          {isChecked && <Check className="w-2.5 h-2.5 text-white" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">{label}</p>
                          <p className={cn('text-sm font-medium truncate', isChecked ? 'text-brand-700' : 'text-slate-800')}>
                            {String(val)}
                          </p>
                        </div>
                      </button>
                    )
                  })}
                </div>

                {filledFields.length > 6 && (
                  <button
                    type="button"
                    onClick={() => setShowAll(p => !p)}
                    className="w-full mt-2 text-xs text-slate-500 hover:text-brand-600 font-semibold transition-colors"
                  >
                    {showAll ? '↑ Tampilkan lebih sedikit' : `↓ Tampilkan ${filledFields.length - 6} field lainnya`}
                  </button>
                )}
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-sm text-slate-400">Tidak ada data yang bisa diekstrak dari dokumen ini.</p>
                <p className="text-xs text-slate-400 mt-1">Pastikan gambar jelas dan tidak terpotong.</p>
              </div>
            )}

            {/* AI notes */}
            {result.notes && (
              <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
                <p className="text-xs font-semibold text-slate-500 mb-1">Catatan AI</p>
                <p className="text-xs text-slate-600 leading-relaxed">{result.notes}</p>
              </div>
            )}

            {/* Apply button */}
            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={onDismiss}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-all"
              >
                Lewati
              </button>
              <button
                type="button"
                onClick={applySelected}
                disabled={selected.size === 0}
                className="flex-1 py-2.5 rounded-xl bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
              >
                <Check className="w-4 h-4" />
                Isi Form ({selected.size} field)
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
