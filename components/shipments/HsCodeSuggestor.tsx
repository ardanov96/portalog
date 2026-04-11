'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import {
  Sparkles, Loader2, ChevronDown, ChevronUp,
  Check, AlertTriangle, Info, Hash, TrendingUp,
  Copy, ExternalLink, RefreshCw, X,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface HsSuggestion {
  code:        string
  description: string
  confidence:  'high' | 'medium' | 'low'
  tariff_rate: string
  notes:       string
  category:    string
}

interface SuggestionResult {
  suggestions: HsSuggestion[]
  summary:     string
  warning:     string | null
}

// ─── Confidence badge ──────────────────────────────────────────────────────────

const CONFIDENCE_CFG = {
  high:   { label: 'Yakin',       bg: 'bg-green-50', text: 'text-green-700', dot: 'bg-green-500' },
  medium: { label: 'Cukup yakin', bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
  low:    { label: 'Perlu cek',   bg: 'bg-red-50',   text: 'text-red-600',   dot: 'bg-red-400'   },
} as const

function ConfidenceBadge({ level }: { level: 'high' | 'medium' | 'low' }) {
  const c = CONFIDENCE_CFG[level]
  return (
    <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold', c.bg, c.text)}>
      <span className={cn('w-1.5 h-1.5 rounded-full', c.dot)} />
      {c.label}
    </span>
  )
}

// ─── Single suggestion card ───────────────────────────────────────────────────

function SuggestionCard({
  item, onSelect, selected,
}: {
  item:     HsSuggestion
  onSelect: (code: string) => void
  selected: boolean
}) {
  const [expanded, setExpanded] = useState(false)
  const [copied, setCopied]     = useState(false)

  const copyCode = async (e: React.MouseEvent) => {
    e.stopPropagation()
    await navigator.clipboard.writeText(item.code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className={cn(
      'border rounded-xl overflow-hidden transition-all cursor-pointer',
      selected
        ? 'border-brand-400 bg-brand-50 ring-2 ring-brand-100'
        : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'
    )}>
      {/* Main row */}
      <div className="flex items-center gap-3 px-3.5 py-3" onClick={() => onSelect(item.code)}>
        {/* Code + select indicator */}
        <div className={cn(
          'w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-all',
          selected ? 'bg-brand-500' : 'bg-slate-100'
        )}>
          {selected
            ? <Check className="w-4 h-4 text-white" />
            : <Hash className="w-4 h-4 text-slate-400" />
          }
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={cn(
              'font-mono text-sm font-bold',
              selected ? 'text-brand-700' : 'text-slate-900'
            )}>
              {item.code}
            </span>
            <ConfidenceBadge level={item.confidence} />
            {item.tariff_rate && item.tariff_rate !== 'varies' && (
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                BM {item.tariff_rate}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-600 mt-0.5 truncate">{item.description}</p>
          {item.category && (
            <p className="text-[10px] text-slate-400 mt-0.5">{item.category}</p>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {/* Copy button */}
          <button
            onClick={copyCode}
            className="p-1.5 rounded-lg text-slate-400 hover:text-brand-600 hover:bg-brand-50 transition-all"
            title="Copy HS Code"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
          {/* Expand notes */}
          {item.notes && (
            <button
              onClick={(e) => { e.stopPropagation(); setExpanded(p => !p) }}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all"
            >
              {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>
      </div>

      {/* Notes expansion */}
      {expanded && item.notes && (
        <div className="px-3.5 pb-3 pt-0">
          <div className="ml-11 bg-slate-50 rounded-lg px-3 py-2 border border-slate-100">
            <p className="text-xs text-slate-600 leading-relaxed">{item.notes}</p>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Main component ────────────────────────────────────────────────────────────

interface HsCodeSuggestorProps {
  cargoDescription: string
  shipmentType:     'IMPORT' | 'EXPORT'
  currentHsCode?:   string
  onSelect:         (code: string) => void
}

export function HsCodeSuggestor({
  cargoDescription, shipmentType, currentHsCode, onSelect,
}: HsCodeSuggestorProps) {
  const [result, setResult]     = useState<SuggestionResult | null>(null)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [selected, setSelected] = useState(currentHsCode ?? '')
  const [open, setOpen]         = useState(false)

  const suggest = async () => {
    if (!cargoDescription || cargoDescription.trim().length < 5) {
      setError('Isi deskripsi kargo terlebih dahulu (minimal 5 karakter)')
      return
    }
    setLoading(true); setError(''); setOpen(true)
    try {
      const res  = await fetch('/api/hs-suggest', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ description: cargoDescription, shipmentType }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)
      setResult(data.data)
    } catch (e: any) {
      setError(e.message || 'Gagal mendapatkan saran HS Code')
    } finally {
      setLoading(false)
    }
  }

  const handleSelect = (code: string) => {
    setSelected(code)
    onSelect(code)
  }

  return (
    <div className="space-y-3">
      {/* Trigger button */}
      <button
        type="button"
        onClick={suggest}
        disabled={loading || !cargoDescription || cargoDescription.trim().length < 5}
        className={cn(
          'w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border-2 border-dashed text-sm font-semibold transition-all',
          loading
            ? 'border-brand-200 bg-brand-50 text-brand-500 cursor-wait'
            : !cargoDescription || cargoDescription.trim().length < 5
            ? 'border-slate-200 text-slate-300 cursor-not-allowed'
            : 'border-brand-300 text-brand-600 hover:bg-brand-50 hover:border-brand-400 active:scale-[0.99]'
        )}
      >
        {loading
          ? <><Loader2 className="w-4 h-4 animate-spin" /> Menganalisis kargo dengan AI...</>
          : <><Sparkles className="w-4 h-4" /> Suggest HS Code dengan AI</>
        }
      </button>

      {/* Error */}
      {error && !loading && (
        <div className="flex items-center gap-2 px-3.5 py-2.5 bg-red-50 border border-red-200 rounded-xl">
          <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
          <p className="text-xs text-red-700">{error}</p>
          <button onClick={() => setError('')} className="ml-auto text-red-400 hover:text-red-600">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Results panel */}
      {open && result && !loading && (
        <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
          {/* Panel header */}
          <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-brand-50 to-indigo-50 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-brand-100 flex items-center justify-center">
                <Sparkles className="w-3.5 h-3.5 text-brand-600" />
              </div>
              <span className="text-xs font-bold text-brand-700">
                {result.suggestions.length} saran HS Code ditemukan
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <button onClick={suggest} className="p-1.5 rounded-lg text-brand-500 hover:bg-brand-100 transition-all" title="Cari ulang">
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 transition-all">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Summary */}
          {result.summary && (
            <div className="px-4 py-3 border-b border-slate-100 flex items-start gap-2">
              <Info className="w-3.5 h-3.5 text-brand-400 shrink-0 mt-0.5" />
              <p className="text-xs text-slate-600 leading-relaxed">{result.summary}</p>
            </div>
          )}

          {/* Warning */}
          {result.warning && (
            <div className="px-4 py-2.5 border-b border-amber-100 bg-amber-50 flex items-start gap-2">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700 leading-relaxed">{result.warning}</p>
            </div>
          )}

          {/* Suggestions list */}
          <div className="p-3 space-y-2">
            {result.suggestions.map((item) => (
              <SuggestionCard
                key={item.code}
                item={item}
                selected={selected === item.code}
                onSelect={handleSelect}
              />
            ))}
          </div>

          {/* Footer */}
          <div className="px-4 py-2.5 border-t border-slate-100 bg-slate-50 flex items-center gap-2">
            <Info className="w-3 h-3 text-slate-400 shrink-0" />
            <p className="text-[10px] text-slate-400 leading-relaxed">
              Saran ini dihasilkan oleh AI berdasarkan BTKI. Selalu verifikasi dengan petugas bea cukai atau konsultan kepabeanan untuk kepastian hukum.
            </p>
            <a
              href="https://btki.kemenkeu.go.id"
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 text-[10px] text-brand-500 hover:underline flex items-center gap-0.5"
            >
              BTKI <ExternalLink className="w-2.5 h-2.5" />
            </a>
          </div>
        </div>
      )}

      {/* Selected code indicator */}
      {selected && selected !== currentHsCode && (
        <div className="flex items-center gap-2 px-3.5 py-2 bg-green-50 border border-green-200 rounded-xl">
          <Check className="w-4 h-4 text-green-600 shrink-0" />
          <p className="text-xs text-green-700">
            HS Code <span className="font-mono font-bold">{selected}</span> sudah diterapkan ke form
          </p>
        </div>
      )}
    </div>
  )
}
