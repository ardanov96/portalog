'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import {
  Plus, Search, Filter, X, RefreshCw,
  ChevronLeft, ChevronRight, Ship, Plane, Truck,
  Package, AlertCircle, FileText, MapPin,
} from 'lucide-react'
import { formatDate, cn } from '@/lib/utils'
import type { ShipmentListItem } from '@/types'

const STATUS_CFG = {
  DRAFT:              { label: 'Draft',      bg: 'bg-slate-100', text: 'text-slate-600', dot: 'bg-slate-400' },
  BOOKING_CONFIRMED:  { label: 'Booking OK', bg: 'bg-blue-50',   text: 'text-blue-700',  dot: 'bg-blue-500'  },
  DOCS_IN_PROGRESS:   { label: 'Dokumen',    bg: 'bg-amber-50',  text: 'text-amber-700', dot: 'bg-amber-500' },
  CUSTOMS_PROCESSING: { label: 'Bea Cukai',  bg: 'bg-orange-50', text: 'text-orange-700',dot: 'bg-orange-500'},
  CARGO_RELEASED:     { label: 'Released',   bg: 'bg-teal-50',   text: 'text-teal-700',  dot: 'bg-teal-500'  },
  IN_TRANSIT:         { label: 'In Transit', bg: 'bg-indigo-50', text: 'text-indigo-700',dot: 'bg-indigo-500'},
  ARRIVED:            { label: 'Tiba',       bg: 'bg-purple-50', text: 'text-purple-700',dot: 'bg-purple-500'},
  DELIVERED:          { label: 'Dikirim',    bg: 'bg-green-50',  text: 'text-green-700', dot: 'bg-green-500' },
  COMPLETED:          { label: 'Selesai',    bg: 'bg-green-100', text: 'text-green-800', dot: 'bg-green-600' },
  CANCELLED:          { label: 'Batal',      bg: 'bg-red-50',    text: 'text-red-700',   dot: 'bg-red-500'   },
} as const

const STATUS_OPTIONS = [
  { value: '', label: 'Semua status' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'BOOKING_CONFIRMED', label: 'Booking OK' },
  { value: 'DOCS_IN_PROGRESS', label: 'Dokumen' },
  { value: 'CUSTOMS_PROCESSING', label: 'Bea Cukai' },
  { value: 'CARGO_RELEASED', label: 'Released' },
  { value: 'IN_TRANSIT', label: 'In Transit' },
  { value: 'ARRIVED', label: 'Tiba' },
  { value: 'COMPLETED', label: 'Selesai' },
  { value: 'CANCELLED', label: 'Batal' },
]

const ACTIVE = ['BOOKING_CONFIRMED','DOCS_IN_PROGRESS','CUSTOMS_PROCESSING','CARGO_RELEASED','IN_TRANSIT','ARRIVED']

function StatusBadge({ status }: { status: string }) {
  const c = STATUS_CFG[status as keyof typeof STATUS_CFG] ?? STATUS_CFG.DRAFT
  return (
    <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold', c.bg, c.text)}>
      <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', c.dot)} />
      {c.label}
    </span>
  )
}

function ModeIcon({ mode }: { mode: string }) {
  const cls = 'w-4 h-4 text-slate-400'
  if (mode === 'AIR')  return <Plane className={cls} />
  if (mode === 'LAND') return <Truck className={cls} />
  return <Ship className={cls} />
}

function TypeBadge({ type }: { type: string }) {
  if (type === 'EXPORT')
    return <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-100">EXP</span>
  return <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-sky-50 text-sky-700 border border-sky-100">IMP</span>
}

function SkeletonRow() {
  return (
    <tr className="border-b border-slate-50">
      {[55,80,65,45,40,25].map((w, i) => (
        <td key={i} className="px-4 py-3.5">
          <div className="h-4 bg-slate-100 rounded animate-pulse" style={{ width: `${w}%` }} />
          {i === 0 && <div className="h-3 bg-slate-100 rounded animate-pulse mt-1.5 w-16" />}
        </td>
      ))}
    </tr>
  )
}

export function ShipmentsPageClient() {
  const [shipments, setShipments]     = useState<ShipmentListItem[]>([])
  const [meta, setMeta]               = useState({ total: 0, page: 1, limit: 20, totalPages: 0 })
  const [search, setSearch]           = useState('')
  const [localSearch, setLocalSearch] = useState('')
  const [status, setStatus]           = useState('')
  const [page, setPage]               = useState(1)
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState<string | null>(null)
  const [showFilter, setShowFilter]   = useState(false)
  const [statCounts, setStatCounts]   = useState<{ status: string; count: number }[]>([])
  const abortRef    = useRef<AbortController | null>(null)
  const searchTimer = useRef<ReturnType<typeof setTimeout>>()

  const fetchShipments = useCallback(async (s: string, st: string, pg: number) => {
    abortRef.current?.abort()
    abortRef.current = new AbortController()
    setLoading(true); setError(null)
    try {
      const p = new URLSearchParams({ page: String(pg), limit: '20' })
      if (s)  p.set('search', s)
      if (st) p.set('status', st)
      const res  = await fetch(`/api/shipments?${p}`, { signal: abortRef.current.signal })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)
      setShipments(data.data)
      setMeta(data.meta)
    } catch (e: any) {
      if (e.name === 'AbortError') return
      setError(e.message || 'Gagal memuat data')
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchShipments(search, status, page) }, [search, status, page, fetchShipments])

  useEffect(() => {
    fetch('/api/dashboard').then(r => r.json()).then(d => {
      if (d.success) setStatCounts(d.data.shipmentsByStatus)
    })
  }, [])

  const handleSearch = (v: string) => {
    setLocalSearch(v)
    clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => { setSearch(v); setPage(1) }, 400)
  }

  const handleStatus = (v: string) => { setStatus(v); setPage(1); setShowFilter(false) }
  const resetFilter  = () => { setStatus(''); setSearch(''); setLocalSearch(''); setPage(1) }
  const hasFilter    = !!search || !!status

  const totalAll   = statCounts.reduce((s, c) => s + c.count, 0)
  const totalActive= statCounts.filter(c => ACTIVE.includes(c.status)).reduce((s, c) => s + c.count, 0)
  const totalDone  = statCounts.find(c => c.status === 'COMPLETED')?.count ?? 0
  const totalDraft = statCounts.find(c => c.status === 'DRAFT')?.count ?? 0

  const summaryCards = [
    { label: 'Total',   value: totalAll,    fv: '',           col: 'text-slate-700', bg: 'bg-slate-50',  bd: 'border-slate-200' },
    { label: 'Aktif',   value: totalActive, fv: 'IN_TRANSIT', col: 'text-blue-700',  bg: 'bg-blue-50',   bd: 'border-blue-100' },
    { label: 'Draft',   value: totalDraft,  fv: 'DRAFT',      col: 'text-amber-700', bg: 'bg-amber-50',  bd: 'border-amber-100' },
    { label: 'Selesai', value: totalDone,   fv: 'COMPLETED',  col: 'text-green-700', bg: 'bg-green-50',  bd: 'border-green-100' },
  ]

  return (
    <div className="max-w-7xl space-y-5">

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Shipments</h1>
          <p className="text-slate-500 text-sm">Kelola semua pengiriman ekspor &amp; impor</p>
        </div>
        <Link href="/shipments/new"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand-600 text-white rounded-xl text-sm font-semibold hover:bg-brand-700 active:scale-[0.98] transition-all shadow-sm shadow-brand-600/20">
          <Plus className="w-4 h-4" /> Shipment Baru
        </Link>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {summaryCards.map(c => (
          <button key={c.label} onClick={() => handleStatus(c.fv)}
            className={cn('text-left px-4 py-3 rounded-xl border transition-all hover:shadow-sm active:scale-[0.98]',
              c.bg, c.bd, status === c.fv && 'ring-2 ring-brand-400 ring-offset-1')}>
            <p className={cn('text-2xl font-bold', c.col)}>{c.value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{c.label}</p>
          </button>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <input type="text" value={localSearch} onChange={e => handleSearch(e.target.value)}
            placeholder="Cari referensi, kargo, klien..."
            className="w-full pl-9 pr-8 py-2.5 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400 transition-all" />
          {localSearch && (
            <button onClick={() => handleSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <button onClick={() => setShowFilter(p => !p)}
          className={cn('inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl border text-sm font-medium transition-all',
            showFilter || status ? 'bg-brand-50 border-brand-200 text-brand-700' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300')}>
          <Filter className="w-4 h-4" /> Filter {status && <span className="w-2 h-2 bg-brand-500 rounded-full" />}
        </button>

        <button onClick={() => fetchShipments(search, status, page)} disabled={loading}
          className="p-2.5 rounded-xl border border-slate-200 bg-white text-slate-500 hover:text-slate-700 hover:border-slate-300 transition-all disabled:opacity-40" title="Refresh">
          <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
        </button>

        <span className="text-xs text-slate-400 ml-auto">{!loading && `${meta.total} shipment`}</span>
      </div>

      {/* Filter panel */}
      {showFilter && (
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Filter Status</p>
          <div className="flex gap-2 flex-wrap">
            {STATUS_OPTIONS.map(opt => (
              <button key={opt.value} onClick={() => handleStatus(opt.value)}
                className={cn('px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all',
                  status === opt.value ? 'bg-brand-600 text-white border-brand-600' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300')}>
                {opt.label}
              </button>
            ))}
          </div>
          {hasFilter && (
            <button onClick={resetFilter} className="mt-3 text-xs text-red-500 font-medium flex items-center gap-1">
              <X className="w-3.5 h-3.5" /> Reset semua filter
            </button>
          )}
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {error ? (
          <div className="p-12 text-center">
            <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-2" />
            <p className="text-slate-600 font-medium text-sm">{error}</p>
            <button onClick={() => fetchShipments(search, status, page)}
              className="mt-3 text-sm text-brand-600 font-semibold hover:underline">Coba lagi</button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  {['Referensi','Klien','Rute','Status','ETA','Dok'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loading && [...Array(5)].map((_, i) => <SkeletonRow key={i} />)}

                {!loading && shipments.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-16 text-center">
                      <Package className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                      <p className="text-slate-400 font-medium text-sm">
                        {hasFilter ? 'Tidak ada shipment yang cocok dengan filter ini' : 'Belum ada shipment'}
                      </p>
                      {hasFilter && (
                        <button onClick={resetFilter} className="mt-2 text-xs text-brand-600 font-semibold hover:underline">Reset filter</button>
                      )}
                    </td>
                  </tr>
                )}

                {!loading && shipments.map(s => {
                  const isLate = s.eta && new Date(s.eta) < new Date() && !['COMPLETED','DELIVERED','CANCELLED'].includes(s.status)
                  return (
                    <tr key={s.id} className="hover:bg-slate-50/60 transition-colors group">
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <Link href={`/shipments/${s.id}`} className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 group-hover:bg-slate-200 transition-colors">
                            <ModeIcon mode={s.mode} />
                          </div>
                          <div>
                            <p className="font-semibold text-xs text-slate-800 group-hover:text-brand-600 transition-colors">{s.referenceNo}</p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <TypeBadge type={s.type} />
                              <span className="text-[10px] text-slate-400">{s.mode.replace('_',' ')}</span>
                            </div>
                          </div>
                        </Link>
                      </td>

                      <td className="px-4 py-3.5">
                        <Link href={`/shipments/${s.id}`} className="block">
                          <p className="text-sm font-medium text-slate-800 truncate max-w-[160px]">{s.client.companyName || s.client.name}</p>
                          {s.client.companyName && <p className="text-xs text-slate-400 truncate max-w-[160px]">{s.client.name}</p>}
                        </Link>
                      </td>

                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <Link href={`/shipments/${s.id}`} className="block">
                          {(s.originPort || s.destinationPort) ? (
                            <div className="flex items-center gap-1 text-xs text-slate-600">
                              <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                              <span className="truncate max-w-[70px]">{s.originPort || '—'}</span>
                              <span className="text-slate-300">→</span>
                              <span className="truncate max-w-[70px]">{s.destinationPort || '—'}</span>
                            </div>
                          ) : <span className="text-xs text-slate-300">—</span>}
                          {s.cargoDescription && <p className="text-[10px] text-slate-400 mt-0.5 truncate max-w-[160px]">{s.cargoDescription}</p>}
                        </Link>
                      </td>

                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <Link href={`/shipments/${s.id}`}><StatusBadge status={s.status} /></Link>
                      </td>

                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <Link href={`/shipments/${s.id}`} className="block">
                          {s.eta
                            ? <span className={cn('text-xs font-medium', isLate ? 'text-red-600' : 'text-slate-600')}>{isLate && '⚠ '}{formatDate(s.eta)}</span>
                            : <span className="text-xs text-slate-300">—</span>}
                          {s.etd && <p className="text-[10px] text-slate-400 mt-0.5">ETD {formatDate(s.etd)}</p>}
                        </Link>
                      </td>

                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <Link href={`/shipments/${s.id}`} className="flex items-center gap-1.5 text-xs text-slate-500">
                          <FileText className="w-3.5 h-3.5 text-slate-400" />
                          <span className="font-medium">{s._count.documents}</span>
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {meta.totalPages > 1 && (
          <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between">
            <p className="text-xs text-slate-400">Hal {meta.page} dari {meta.totalPages} · {meta.total} total</p>
            <div className="flex items-center gap-1.5">
              <button onClick={() => setPage(p => p - 1)} disabled={page <= 1}
                className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed">
                <ChevronLeft className="w-4 h-4" />
              </button>
              {Array.from({ length: Math.min(5, meta.totalPages) }, (_, i) => {
                let pg = i + 1
                if (meta.totalPages > 5) {
                  if (page <= 3) pg = i + 1
                  else if (page >= meta.totalPages - 2) pg = meta.totalPages - 4 + i
                  else pg = page - 2 + i
                }
                return (
                  <button key={pg} onClick={() => setPage(pg)}
                    className={cn('w-7 h-7 rounded-lg text-xs font-semibold transition-all',
                      page === pg ? 'bg-brand-600 text-white' : 'text-slate-500 hover:bg-slate-100')}>
                    {pg}
                  </button>
                )
              })}
              <button onClick={() => setPage(p => p + 1)} disabled={page >= meta.totalPages}
                className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
