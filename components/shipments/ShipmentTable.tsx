'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useShipments } from '@/hooks/useShipments'
import { formatDate, cn } from '@/lib/utils'
import type { ShipmentListItem } from '@/types'
import {
  Search, X, Filter, Ship, Plane, Truck, Package,
  ChevronLeft, ChevronRight, RefreshCw, ArrowUpDown,
  AlertCircle, FileText, Calendar, MapPin,
} from 'lucide-react'

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  DRAFT:               { label: 'Draft',        bg: 'bg-slate-100',   text: 'text-slate-600',  dot: 'bg-slate-400' },
  BOOKING_CONFIRMED:   { label: 'Booking OK',   bg: 'bg-blue-50',     text: 'text-blue-700',   dot: 'bg-blue-500' },
  DOCS_IN_PROGRESS:    { label: 'Dokumen',       bg: 'bg-amber-50',    text: 'text-amber-700',  dot: 'bg-amber-500' },
  CUSTOMS_PROCESSING:  { label: 'Bea Cukai',     bg: 'bg-orange-50',   text: 'text-orange-700', dot: 'bg-orange-500' },
  CARGO_RELEASED:      { label: 'Released',      bg: 'bg-teal-50',     text: 'text-teal-700',   dot: 'bg-teal-500' },
  IN_TRANSIT:          { label: 'In Transit',    bg: 'bg-indigo-50',   text: 'text-indigo-700', dot: 'bg-indigo-500' },
  ARRIVED:             { label: 'Tiba',          bg: 'bg-purple-50',   text: 'text-purple-700', dot: 'bg-purple-500' },
  DELIVERED:           { label: 'Dikirim',       bg: 'bg-green-50',    text: 'text-green-700',  dot: 'bg-green-500' },
  COMPLETED:           { label: 'Selesai',       bg: 'bg-green-100',   text: 'text-green-800',  dot: 'bg-green-600' },
  CANCELLED:           { label: 'Batal',         bg: 'bg-red-50',      text: 'text-red-700',    dot: 'bg-red-500' },
} as const

const STATUS_FILTER_OPTIONS = [
  { value: '',                   label: 'Semua status' },
  { value: 'DRAFT',              label: 'Draft' },
  { value: 'BOOKING_CONFIRMED',  label: 'Booking OK' },
  { value: 'DOCS_IN_PROGRESS',   label: 'Dokumen' },
  { value: 'CUSTOMS_PROCESSING', label: 'Bea Cukai' },
  { value: 'CARGO_RELEASED',     label: 'Released' },
  { value: 'IN_TRANSIT',         label: 'In Transit' },
  { value: 'ARRIVED',            label: 'Tiba' },
  { value: 'COMPLETED',          label: 'Selesai' },
  { value: 'CANCELLED',          label: 'Batal' },
]

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: keyof typeof STATUS_CONFIG }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.DRAFT
  return (
    <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold', cfg.bg, cfg.text)}>
      <span className={cn('w-1.5 h-1.5 rounded-full', cfg.dot)} />
      {cfg.label}
    </span>
  )
}

function ModeIcon({ mode }: { mode: string }) {
  const cls = 'w-4 h-4 text-slate-400'
  if (mode === 'AIR')  return <Plane  className={cls} />
  if (mode === 'LAND') return <Truck  className={cls} />
  return <Ship className={cls} />
}

function TypeBadge({ type }: { type: string }) {
  if (type === 'EXPORT') return <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-100">EXP</span>
  return <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-sky-50 text-sky-700 border border-sky-100">IMP</span>
}

function SkeletonRow() {
  return (
    <tr className="border-b border-slate-50">
      {[1,2,3,4,5,6].map((i) => (
        <td key={i} className="px-4 py-3.5">
          <div className="h-4 bg-slate-100 rounded animate-pulse" style={{ width: `${[60,80,50,70,40,30][i-1]}%` }} />
        </td>
      ))}
    </tr>
  )
}

// ─── Search input with debounce ───────────────────────────────────────────────

function SearchInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [local, setLocal] = useState(value)
  const timer = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => { setLocal(value) }, [value])

  const handleChange = (v: string) => {
    setLocal(v)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => onChange(v), 400)
  }

  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
      <input
        type="text"
        value={local}
        onChange={(e) => handleChange(e.target.value)}
        placeholder="Cari ref, kargo, klien..."
        className="w-full pl-9 pr-8 py-2.5 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400 transition-all"
      />
      {local && (
        <button onClick={() => handleChange('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

interface ShipmentTableProps {
  onNewShipment?: () => void
}

export function ShipmentTable({ onNewShipment }: ShipmentTableProps) {
  const { shipments, meta, filters, loading, error, updateFilter, refresh } = useShipments()
  const [showFilters, setShowFilters] = useState(false)

  const hasActiveFilter = !!filters.search || !!filters.status

  if (error) {
    return (
      <div className="bg-white rounded-xl border border-red-100 p-8 text-center">
        <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-2" />
        <p className="text-slate-700 font-medium">{error}</p>
        <button onClick={refresh} className="mt-4 text-sm text-brand-600 font-semibold hover:underline">
          Coba lagi
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-3">

      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex-1 min-w-[200px] max-w-sm">
          <SearchInput value={filters.search} onChange={(v) => updateFilter({ search: v })} />
        </div>

        <button
          onClick={() => setShowFilters((p) => !p)}
          className={cn(
            'inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl border text-sm font-medium transition-all',
            showFilters || filters.status
              ? 'bg-brand-50 border-brand-200 text-brand-700'
              : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
          )}
        >
          <Filter className="w-4 h-4" />
          Filter
          {filters.status && (
            <span className="w-2 h-2 bg-brand-500 rounded-full" />
          )}
        </button>

        <button
          onClick={refresh}
          disabled={loading}
          className="p-2.5 rounded-xl border border-slate-200 bg-white text-slate-500 hover:text-slate-700 hover:border-slate-300 transition-all disabled:opacity-40"
          title="Refresh"
        >
          <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
        </button>

        <div className="text-xs text-slate-400 ml-auto">
          {!loading && `${meta.total} shipment`}
        </div>
      </div>

      {/* Filter panel */}
      {showFilters && (
        <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-4 flex-wrap">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Status</label>
            <div className="flex gap-2 flex-wrap">
              {STATUS_FILTER_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => updateFilter({ status: opt.value })}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all',
                    filters.status === opt.value
                      ? 'bg-brand-600 text-white border-brand-600'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {hasActiveFilter && (
            <button
              onClick={() => updateFilter({ search: '', status: '' })}
              className="ml-auto text-xs text-slate-400 hover:text-red-500 font-medium flex items-center gap-1"
            >
              <X className="w-3.5 h-3.5" /> Reset filter
            </button>
          )}
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                  <span className="flex items-center gap-1">Referensi <ArrowUpDown className="w-3 h-3" /></span>
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Klien</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Rute</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                  <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> ETA</span>
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Dokumen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading && [...Array(6)].map((_, i) => <SkeletonRow key={i} />)}

              {!loading && shipments.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-16 text-center">
                    <Package className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                    <p className="text-slate-400 text-sm font-medium">
                      {hasActiveFilter ? 'Tidak ada shipment yang cocok dengan filter ini' : 'Belum ada shipment'}
                    </p>
                    {hasActiveFilter && (
                      <button onClick={() => updateFilter({ search: '', status: '' })} className="mt-2 text-xs text-brand-600 font-semibold hover:underline">
                        Reset filter
                      </button>
                    )}
                  </td>
                </tr>
              )}

              {!loading && shipments.map((s) => (
                <ShipmentRow key={s.id} shipment={s} />
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {meta.totalPages > 1 && (
          <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between">
            <p className="text-xs text-slate-400">
              Halaman {meta.page} dari {meta.totalPages} &middot; {meta.total} total
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => updateFilter({ page: meta.page - 1 })}
                disabled={meta.page <= 1}
                className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {/* Page numbers */}
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, meta.totalPages) }, (_, i) => {
                  let page = i + 1
                  if (meta.totalPages > 5) {
                    if (meta.page <= 3) page = i + 1
                    else if (meta.page >= meta.totalPages - 2) page = meta.totalPages - 4 + i
                    else page = meta.page - 2 + i
                  }
                  return (
                    <button
                      key={page}
                      onClick={() => updateFilter({ page })}
                      className={cn(
                        'w-7 h-7 rounded-lg text-xs font-semibold transition-all',
                        meta.page === page
                          ? 'bg-brand-600 text-white'
                          : 'text-slate-500 hover:bg-slate-100'
                      )}
                    >
                      {page}
                    </button>
                  )
                })}
              </div>

              <button
                onClick={() => updateFilter({ page: meta.page + 1 })}
                disabled={meta.page >= meta.totalPages}
                className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Single row ───────────────────────────────────────────────────────────────

function ShipmentRow({ shipment: s }: { shipment: ShipmentListItem }) {
  const isLate = s.eta && new Date(s.eta) < new Date() && !['COMPLETED','DELIVERED','CANCELLED'].includes(s.status)

  return (
    <tr className="hover:bg-slate-50/60 transition-colors group">

      {/* Referensi */}
      <td className="px-4 py-3.5 whitespace-nowrap">
        <Link href={`/shipments/${s.id}`} className="block">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 group-hover:bg-slate-200 transition-colors">
              <ModeIcon mode={s.mode} />
            </div>
            <div>
              <p className="font-semibold text-slate-800 group-hover:text-brand-600 transition-colors text-xs">
                {s.referenceNo}
              </p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <TypeBadge type={s.type} />
                <span className="text-[10px] text-slate-400">{s.mode.replace('_', ' ')}</span>
              </div>
            </div>
          </div>
        </Link>
      </td>

      {/* Klien */}
      <td className="px-4 py-3.5">
        <Link href={`/shipments/${s.id}`} className="block">
          <p className="text-sm font-medium text-slate-800 truncate max-w-[150px]">
            {s.client.companyName || s.client.name}
          </p>
          {s.client.companyName && (
            <p className="text-xs text-slate-400 truncate max-w-[150px]">{s.client.name}</p>
          )}
        </Link>
      </td>

      {/* Rute */}
      <td className="px-4 py-3.5 whitespace-nowrap">
        <Link href={`/shipments/${s.id}`} className="block">
          {(s.originPort || s.destinationPort) ? (
            <div className="flex items-center gap-1.5 text-xs text-slate-600">
              <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
              <span className="truncate max-w-[80px]">{s.originPort || '—'}</span>
              <span className="text-slate-300">→</span>
              <span className="truncate max-w-[80px]">{s.destinationPort || '—'}</span>
            </div>
          ) : (
            <span className="text-xs text-slate-300">—</span>
          )}
          {s.cargoDescription && (
            <p className="text-[10px] text-slate-400 mt-0.5 truncate max-w-[160px]">{s.cargoDescription}</p>
          )}
        </Link>
      </td>

      {/* Status */}
      <td className="px-4 py-3.5 whitespace-nowrap">
        <Link href={`/shipments/${s.id}`} className="block">
          <StatusBadge status={s.status as keyof typeof STATUS_CONFIG} />
          {/* Delay risk badge jika tersedia */}
          {(s as any).delayRiskLevel && !['COMPLETED','DELIVERED','CANCELLED'].includes(s.status) && (() => {
            const level = (s as any).delayRiskLevel as string
            const score = (s as any).delayRiskScore as number
            const cfg = {
              low:      'bg-green-50 text-green-700',
              medium:   'bg-amber-50 text-amber-700',
              high:     'bg-orange-50 text-orange-700',
              critical: 'bg-red-50 text-red-700',
            }[level] ?? 'bg-slate-100 text-slate-600'
            return (
              <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold mt-1', cfg)}>
                ⚡ {score}
              </span>
            )
          })()}
        </Link>
      </td>

      {/* ETA */}
      <td className="px-4 py-3.5 whitespace-nowrap">
        <Link href={`/shipments/${s.id}`} className="block">
          {s.eta ? (
            <span className={cn('text-xs font-medium', isLate ? 'text-red-600' : 'text-slate-600')}>
              {isLate && '⚠ '}{formatDate(s.eta)}
            </span>
          ) : (
            <span className="text-xs text-slate-300">—</span>
          )}
          {s.etd && (
            <p className="text-[10px] text-slate-400 mt-0.5">ETD {formatDate(s.etd)}</p>
          )}
        </Link>
      </td>

      {/* Dokumen */}
      <td className="px-4 py-3.5 whitespace-nowrap">
        <Link href={`/shipments/${s.id}`} className="block">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <FileText className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-medium">{s._count.documents}</span>
            <span className="text-slate-300">dok</span>
          </div>
        </Link>
      </td>

    </tr>
  )
}
