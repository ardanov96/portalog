'use client'

import { useState, useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'
import {
  Download, Loader2, ChevronDown, FileSpreadsheet,
  Table2, Users, TrendingUp, LayoutGrid, Check,
} from 'lucide-react'

interface ExportOption {
  id:    string
  label: string
  desc:  string
  icon:  any
}

const OPTIONS: ExportOption[] = [
  {
    id:    'full',
    label: 'Laporan Lengkap',
    desc:  '4 sheet: Ringkasan + Shipment + Klien + Revenue Bulanan',
    icon:  LayoutGrid,
  },
  {
    id:    'shipments',
    label: 'Daftar Shipment',
    desc:  'Semua detail per shipment dalam satu tabel',
    icon:  Table2,
  },
  {
    id:    'revenue',
    label: 'Revenue Bulanan',
    desc:  'Breakdown revenue per bulan dengan total tahunan',
    icon:  TrendingUp,
  },
  {
    id:    'clients',
    label: 'Revenue per Klien',
    desc:  'Ranking klien berdasarkan revenue dan jumlah shipment',
    icon:  Users,
  },
]

interface ExportButtonProps {
  year: number
}

export function ExportButton({ year }: ExportButtonProps) {
  const [open, setOpen]       = useState(false)
  const [loading, setLoading] = useState<string | null>(null)
  const [done, setDone]       = useState<string | null>(null)
  const ref                   = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const download = async (optId: string) => {
    setLoading(optId)
    setDone(null)
    setOpen(false)

    try {
      const res = await fetch(`/api/export?year=${year}&type=${optId}`)
      if (!res.ok) throw new Error('Export gagal')

      // Ambil filename dari header
      const cd       = res.headers.get('Content-Disposition') ?? ''
      const match    = cd.match(/filename="([^"]+)"/)
      const filename = match?.[1] ?? `Portalog_${year}.xlsx`

      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      setDone(optId)
      setTimeout(() => setDone(null), 3000)
    } catch (e) {
      console.error('[EXPORT]', e)
      alert('Gagal mengekspor. Pastikan ada data untuk tahun yang dipilih.')
    } finally {
      setLoading(null)
    }
  }

  const isLoading = loading !== null

  return (
    <div className="relative" ref={ref}>
      {/* Trigger button */}
      <button
        onClick={() => !isLoading && setOpen(p => !p)}
        disabled={isLoading}
        className={cn(
          'inline-flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-semibold transition-all',
          done
            ? 'border-green-300 bg-green-50 text-green-700'
            : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50',
          isLoading && 'opacity-60 cursor-wait'
        )}
      >
        {isLoading
          ? <Loader2 className="w-4 h-4 animate-spin" />
          : done
          ? <Check className="w-4 h-4" />
          : <FileSpreadsheet className="w-4 h-4 text-green-600" />
        }
        {isLoading ? 'Memproses...' : done ? 'Berhasil!' : 'Export Excel'}
        {!isLoading && !done && <ChevronDown className={cn('w-3.5 h-3.5 text-slate-400 transition-transform', open && 'rotate-180')} />}
      </button>

      {/* Dropdown */}
      {open && !isLoading && (
        <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-2xl border border-slate-200 shadow-2xl z-50 overflow-hidden"
          style={{ boxShadow: '0 20px 60px rgba(0,0,0,.12)' }}>

          {/* Header */}
          <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
            <p className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Download className="w-3.5 h-3.5" />
              Export ke Excel — Tahun {year}
            </p>
          </div>

          {/* Options */}
          <div className="p-2">
            {OPTIONS.map(opt => {
              const Icon = opt.icon
              return (
                <button
                  key={opt.id}
                  onClick={() => download(opt.id)}
                  className="w-full flex items-start gap-3 px-3 py-3 rounded-xl hover:bg-slate-50 text-left transition-all group"
                >
                  <div className="w-9 h-9 rounded-lg bg-green-50 border border-green-100 flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-green-100 transition-colors">
                    <Icon className="w-4 h-4 text-green-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800">{opt.label}</p>
                    <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{opt.desc}</p>
                  </div>
                </button>
              )
            })}
          </div>

          {/* Footer */}
          <div className="px-4 py-2.5 border-t border-slate-100 bg-slate-50">
            <p className="text-[10px] text-slate-400">
              Format: .xlsx · Kompatibel dengan Excel, Google Sheets, Numbers
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
