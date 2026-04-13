'use client'

import {
  useState, useEffect, useRef, useCallback, useMemo, useTransition,
} from 'react'
import { useRouter } from 'next/navigation'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'
import type { SearchResult } from '@/app/api/search/route'
import {
  Search, X, Ship, Plane, Truck, Users, FileText,
  LayoutDashboard, ChevronRight, Loader2, Hash,
  ArrowRight, Package, Receipt, BarChart3,
  Settings, Rocket, CreditCard, Clock,
} from 'lucide-react'

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_COLOR: Record<string, string> = {
  DRAFT:              'bg-slate-100 text-slate-600',
  BOOKING_CONFIRMED:  'bg-blue-100 text-blue-700',
  DOCS_IN_PROGRESS:   'bg-amber-100 text-amber-700',
  CUSTOMS_PROCESSING: 'bg-orange-100 text-orange-700',
  CARGO_RELEASED:     'bg-teal-100 text-teal-700',
  IN_TRANSIT:         'bg-indigo-100 text-indigo-700',
  ARRIVED:            'bg-purple-100 text-purple-700',
  DELIVERED:          'bg-green-100 text-green-700',
  COMPLETED:          'bg-green-100 text-green-800',
  CANCELLED:          'bg-red-100 text-red-700',
}

const PAGE_ICONS: Record<string, any> = {
  '/dashboard':     LayoutDashboard,
  '/shipments':     Ship,
  '/shipments/new': Package,
  '/clients':       Users,
  '/documents':     FileText,
  '/invoices':      Receipt,
  '/laporan':       BarChart3,
  '/billing':       CreditCard,
  '/settings':      Settings,
  '/onboarding':    Rocket,
}

function ModeIcon({ mode, cls }: { mode?: string; cls?: string }) {
  const C = cn('w-3.5 h-3.5', cls)
  if (mode === 'AIR')  return <Plane className={C} />
  if (mode === 'LAND') return <Truck className={C} />
  return <Ship className={C} />
}

// ─── Recent items (localStorage) ──────────────────────────────────────────────

const RECENT_KEY = 'fos_cmd_recent'
const MAX_RECENT = 5

function getRecent(): SearchResult[] {
  if (typeof window === 'undefined') return []
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]') } catch { return [] }
}

function addRecent(item: SearchResult) {
  const prev    = getRecent().filter(r => r.id !== item.id)
  const updated = [item, ...prev].slice(0, MAX_RECENT)
  localStorage.setItem(RECENT_KEY, JSON.stringify(updated))
}

// ─── Result row ───────────────────────────────────────────────────────────────

function ResultRow({
  result, active, onSelect, query,
}: {
  result:   SearchResult
  active:   boolean
  onSelect: (r: SearchResult) => void
  query:    string
}) {
  const Icon = result.type === 'page'
    ? (PAGE_ICONS[result.href] ?? LayoutDashboard)
    : result.type === 'client'   ? Users
    : result.type === 'document' ? FileText
    : null

  // Highlight matching chars in title
  const highlighted = useMemo(() => {
    if (!query || result.type === 'page') return result.title
    const idx = result.title.toLowerCase().indexOf(query.toLowerCase())
    if (idx === -1) return result.title
    return (
      <>
        {result.title.slice(0, idx)}
        <mark className="bg-brand-100 text-brand-800 rounded-sm not-italic">{result.title.slice(idx, idx + query.length)}</mark>
        {result.title.slice(idx + query.length)}
      </>
    )
  }, [result.title, query, result.type])

  return (
    <button
      onClick={() => onSelect(result)}
      className={cn(
        'w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-left transition-all',
        active ? 'bg-brand-50 border border-brand-200' : 'hover:bg-slate-50 border border-transparent'
      )}
    >
      {/* Icon / type indicator */}
      <div className={cn(
        'w-8 h-8 rounded-lg flex items-center justify-center shrink-0',
        result.type === 'shipment'  ? (active ? 'bg-brand-100' : 'bg-slate-100') :
        result.type === 'client'    ? (active ? 'bg-violet-100' : 'bg-violet-50') :
        result.type === 'document'  ? (active ? 'bg-amber-100' : 'bg-amber-50')  :
        (active ? 'bg-brand-100' : 'bg-slate-100')
      )}>
        {result.type === 'shipment' ? (
          <ModeIcon mode={result.mode} cls={active ? 'text-brand-600' : 'text-slate-500'} />
        ) : Icon ? (
          <Icon className={cn('w-3.5 h-3.5',
            result.type === 'client'   ? (active ? 'text-violet-600' : 'text-violet-500') :
            result.type === 'document' ? (active ? 'text-amber-600'  : 'text-amber-500')  :
            (active ? 'text-brand-600' : 'text-slate-500')
          )} />
        ) : null}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className={cn('text-sm font-semibold truncate', active ? 'text-brand-700' : 'text-slate-800')}>
          {highlighted}
        </p>
        {result.subtitle && (
          <p className="text-xs text-slate-400 truncate mt-0.5">{result.subtitle}</p>
        )}
      </div>

      {/* Meta / status badge */}
      <div className="flex items-center gap-2 shrink-0">
        {result.status && (
          <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full', STATUS_COLOR[result.status] ?? 'bg-slate-100 text-slate-600')}>
            {result.meta}
          </span>
        )}
        {!result.status && result.meta && (
          <span className="text-[10px] font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
            {result.meta}
          </span>
        )}
        <ChevronRight className={cn('w-3.5 h-3.5', active ? 'text-brand-500' : 'text-slate-300')} />
      </div>
    </button>
  )
}

// ─── Section header ───────────────────────────────────────────────────────────

function SectionLabel({ label, count }: { label: string; count?: number }) {
  return (
    <div className="flex items-center gap-2 px-3.5 py-1.5 mt-1">
      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</span>
      {count !== undefined && count > 0 && (
        <span className="text-[10px] text-slate-300">{count}</span>
      )}
    </div>
  )
}

// ─── Main CommandPalette ──────────────────────────────────────────────────────

interface GroupedResults {
  pages:     SearchResult[]
  shipments: SearchResult[]
  clients:   SearchResult[]
  documents: SearchResult[]
  total:     number
}

export function CommandPalette() {
  const [open, setOpen]         = useState(false)
  const [query, setQuery]       = useState('')
  const [results, setResults]   = useState<GroupedResults | null>(null)
  const [loading, setLoading]   = useState(false)
  const [activeIdx, setActive]  = useState(0)
  const [recent, setRecent]     = useState<SearchResult[]>([])
  const [mounted, setMounted]   = useState(false)

  const router    = useRef(useRouter())
  const inputRef  = useRef<HTMLInputElement>(null)
  const debounce  = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => { setMounted(true) }, [])

  // Keyboard shortcut: Cmd+K / Ctrl+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen(p => {
          if (!p) {
            setQuery('')
            setResults(null)
            setActive(0)
            setRecent(getRecent())
          }
          return !p
        })
      }
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  // Focus input when opened
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 60)
  }, [open])

  // Debounced search
  useEffect(() => {
    clearTimeout(debounce.current)
    if (query.length < 2) { setResults(null); setLoading(false); return }
    setLoading(true)
    debounce.current = setTimeout(async () => {
      try {
        const res  = await fetch(`/api/search?q=${encodeURIComponent(query)}`)
        const data = await res.json()
        if (data.success) { setResults(data.data); setActive(0) }
      } catch {} finally { setLoading(false) }
    }, 180)
    return () => clearTimeout(debounce.current)
  }, [query])

  // Flatten results for keyboard navigation
  const flat: SearchResult[] = useMemo(() => {
    if (!results) return recent
    return [
      ...results.pages,
      ...results.shipments,
      ...results.clients,
      ...results.documents,
    ]
  }, [results, recent])

  const navigate = useCallback((result: SearchResult) => {
    addRecent(result)
    setOpen(false)
    setQuery('')
    router.current.push(result.href)
  }, [])

  // Keyboard navigation inside palette
  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive(p => Math.min(p + 1, flat.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive(p => Math.max(p - 1, 0))
    } else if (e.key === 'Enter' && flat[activeIdx]) {
      navigate(flat[activeIdx])
    }
  }

  const showRecent  = !query && recent.length > 0
  const showResults = query.length >= 2 && results
  const showEmpty   = query.length >= 2 && !loading && results?.total === 0

  if (!mounted) return null

  const palette = (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[200] bg-black/40 backdrop-blur-sm"
        onClick={() => setOpen(false)}
        aria-hidden
      />

      {/* Panel */}
      <div
        className="fixed inset-x-0 top-[12vh] z-[201] mx-auto w-full max-w-xl px-4"
        role="dialog" aria-modal aria-label="Command palette"
      >
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200"
          style={{ boxShadow: '0 24px 64px rgba(0,0,0,0.18)' }}>

          {/* Search input */}
          <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-100">
            {loading
              ? <Loader2 className="w-4.5 h-4.5 text-brand-500 animate-spin shrink-0" />
              : <Search className="w-4.5 h-4.5 text-slate-400 shrink-0" />
            }
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => { setQuery(e.target.value); setActive(0) }}
              onKeyDown={handleKey}
              placeholder="Cari shipment, klien, dokumen..."
              className="flex-1 bg-transparent text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none"
              autoComplete="off"
            />
            <div className="flex items-center gap-2 shrink-0">
              {query && (
                <button onClick={() => { setQuery(''); inputRef.current?.focus() }}
                  className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
              <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-medium text-slate-400 bg-slate-100 rounded border border-slate-200">
                Esc
              </kbd>
            </div>
          </div>

          {/* Results area */}
          <div className="max-h-[60vh] overflow-y-auto p-2">

            {/* Recent items */}
            {showRecent && (
              <>
                <SectionLabel label="Terakhir Dikunjungi" />
                {recent.map((r, i) => (
                  <ResultRow key={r.id} result={r} active={activeIdx === i}
                    onSelect={navigate} query="" />
                ))}
              </>
            )}

            {/* Default quick links (empty query) */}
            {!query && recent.length === 0 && (
              <>
                <SectionLabel label="Akses Cepat" />
                {[
                  { id: 'q-new',      href: '/shipments/new', title: 'Buat Shipment Baru',  subtitle: 'Mulai pengiriman baru',         icon: Package },
                  { id: 'q-ships',    href: '/shipments',     title: 'Daftar Shipment',      subtitle: 'Lihat semua pengiriman',        icon: Ship    },
                  { id: 'q-clients',  href: '/clients',       title: 'Klien',                subtitle: 'Manajemen klien dan buyer',     icon: Users   },
                  { id: 'q-laporan',  href: '/laporan',       title: 'Laporan & Analytics',  subtitle: 'Grafik performa dan revenue',   icon: BarChart3 },
                ].map((item, i) => {
                  const Ico = item.icon
                  return (
                    <button key={item.id}
                      onClick={() => router.current.push(item.href) && setOpen(false)}
                      className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl hover:bg-slate-50 text-left transition-all">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                        <Ico className="w-3.5 h-3.5 text-slate-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-800">{item.title}</p>
                        <p className="text-xs text-slate-400">{item.subtitle}</p>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-300" />
                    </button>
                  )
                })}
              </>
            )}

            {/* Search results */}
            {showResults && (() => {
              let idx = 0
              return (
                <>
                  {results.pages.length > 0 && (
                    <>
                      <SectionLabel label="Halaman" count={results.pages.length} />
                      {results.pages.map(r => {
                        const cur = idx++
                        return <ResultRow key={r.id} result={r} active={activeIdx === cur} onSelect={navigate} query={query} />
                      })}
                    </>
                  )}
                  {results.shipments.length > 0 && (
                    <>
                      <SectionLabel label="Shipment" count={results.shipments.length} />
                      {results.shipments.map(r => {
                        const cur = idx++
                        return <ResultRow key={r.id} result={r} active={activeIdx === cur} onSelect={navigate} query={query} />
                      })}
                    </>
                  )}
                  {results.clients.length > 0 && (
                    <>
                      <SectionLabel label="Klien & Buyer" count={results.clients.length} />
                      {results.clients.map(r => {
                        const cur = idx++
                        return <ResultRow key={r.id} result={r} active={activeIdx === cur} onSelect={navigate} query={query} />
                      })}
                    </>
                  )}
                  {results.documents.length > 0 && (
                    <>
                      <SectionLabel label="Dokumen" count={results.documents.length} />
                      {results.documents.map(r => {
                        const cur = idx++
                        return <ResultRow key={r.id} result={r} active={activeIdx === cur} onSelect={navigate} query={query} />
                      })}
                    </>
                  )}
                </>
              )
            })()}

            {/* Empty state */}
            {showEmpty && (
              <div className="py-10 text-center">
                <Search className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-400">Tidak ditemukan</p>
                <p className="text-xs text-slate-300 mt-1">Coba kata kunci lain atau nomor referensi</p>
              </div>
            )}
          </div>

          {/* Footer hint */}
          <div className="px-4 py-2.5 border-t border-slate-100 bg-slate-50 flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
              <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[9px]">↑↓</kbd>
              navigasi
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
              <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[9px]">↵</kbd>
              buka
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
              <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[9px]">Esc</kbd>
              tutup
            </div>
            <span className="ml-auto text-[10px] text-slate-300">ForwarderOS Search</span>
          </div>
        </div>
      </div>
    </>
  )

  return (
    <>
      {open && createPortal(palette, document.body)}
    </>
  )
}
