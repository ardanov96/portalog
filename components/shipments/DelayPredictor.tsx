'use client'

import { useState, useCallback } from 'react'
import { cn } from '@/lib/utils'
import {
  Zap, Loader2, RefreshCw, AlertTriangle, CheckCircle2,
  AlertCircle, XCircle, ChevronDown, ChevronUp,
  TrendingUp, FileText, Ship, Clock, Map, Package, Info,
  ArrowRight,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface RiskFactor {
  category:   string
  label:      string
  detail:     string
  impact:     'high' | 'medium' | 'low'
  actionable: boolean
  action:     string | null
}

interface PredictionData {
  score:            number
  level:            'low' | 'medium' | 'high' | 'critical'
  factors:          RiskFactor[]
  summary:          string
  historicalContext?: string
  recommendation?:  string
  predictedAt:      string
  cached:           boolean
  cacheAgeMin?:     number
  meta?: {
    totalHistorical:  number
    delayRate:        number
    similarShipments: number
  }
}

// ─── Config ───────────────────────────────────────────────────────────────────

const LEVEL_CFG = {
  low:      { label: 'Risiko Rendah',    bg: 'bg-green-50',  border: 'border-green-200',  text: 'text-green-700',  bar: 'bg-green-500',  icon: CheckCircle2,   ring: 'ring-green-200' },
  medium:   { label: 'Risiko Sedang',    bg: 'bg-amber-50',  border: 'border-amber-200',  text: 'text-amber-700',  bar: 'bg-amber-400',  icon: AlertTriangle,  ring: 'ring-amber-200' },
  high:     { label: 'Risiko Tinggi',    bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700', bar: 'bg-orange-500', icon: AlertCircle,    ring: 'ring-orange-200' },
  critical: { label: 'Risiko Kritis',    bg: 'bg-red-50',    border: 'border-red-200',    text: 'text-red-700',    bar: 'bg-red-500',    icon: XCircle,        ring: 'ring-red-200' },
}

const IMPACT_CFG = {
  high:   { label: 'Dampak Tinggi',  badge: 'bg-red-100 text-red-800'    },
  medium: { label: 'Dampak Sedang',  badge: 'bg-amber-100 text-amber-800' },
  low:    { label: 'Dampak Rendah',  badge: 'bg-slate-100 text-slate-700' },
}

const CATEGORY_ICON: Record<string, any> = {
  dokumen:        FileText,
  vessel:         Ship,
  bea_cukai:      Map,
  rute:           TrendingUp,
  pola_historis:  Clock,
  waktu:          Clock,
  kargo:          Package,
}

// ─── Risk meter (SVG arc) ─────────────────────────────────────────────────────

function RiskMeter({ score, level }: { score: number; level: string }) {
  const cfg = LEVEL_CFG[level as keyof typeof LEVEL_CFG] ?? LEVEL_CFG.low

  // Arc from -180deg to 0deg (semicircle)
  const r      = 48
  const cx     = 60
  const cy     = 60
  const start  = { x: cx - r, y: cy }  // left
  const end    = { x: cx + r, y: cy }  // right

  // Calculate arc endpoint for score
  const angle  = (-180 + (score / 100) * 180) * (Math.PI / 180)
  const arcX   = cx + r * Math.cos(angle)
  const arcY   = cy + r * Math.sin(angle)
  const large  = score > 50 ? 1 : 0

  const trackPath  = `M ${start.x} ${cy} A ${r} ${r} 0 0 1 ${end.x} ${cy}`
  const scorePath  = score > 0
    ? `M ${start.x} ${cy} A ${r} ${r} 0 ${large} 1 ${arcX} ${arcY}`
    : ''

  const barColor = score <= 30 ? '#22c55e' : score <= 60 ? '#f59e0b' : score <= 80 ? '#f97316' : '#ef4444'

  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 20 120 60" style={{ width: 120, height: 64, overflow: 'visible' }}>
        {/* Track */}
        <path d={trackPath} fill="none" stroke="#e2e8f0" strokeWidth="10" strokeLinecap="round" />
        {/* Score arc */}
        {scorePath && (
          <path d={scorePath} fill="none" stroke={barColor} strokeWidth="10" strokeLinecap="round" />
        )}
        {/* Needle dot at score position */}
        {score > 0 && (
          <circle cx={arcX} cy={arcY} r="6" fill={barColor} />
        )}
        {/* Center label */}
        <text x={cx} y={cy + 2} textAnchor="middle" style={{ fontSize: 20, fontWeight: 700, fill: barColor, fontFamily: 'sans-serif' }}>
          {score}
        </text>
        <text x={cx} y={cy + 14} textAnchor="middle" style={{ fontSize: 8, fill: '#94a3b8', fontFamily: 'sans-serif' }}>
          / 100
        </text>
      </svg>
      <span className={cn('text-xs font-bold px-2.5 py-1 rounded-full mt-1', cfg.bg, cfg.text)}>
        {cfg.label}
      </span>
    </div>
  )
}

// ─── Factor row ───────────────────────────────────────────────────────────────

function FactorRow({ factor, defaultOpen }: { factor: RiskFactor; defaultOpen?: boolean }) {
  const [open, setOpen]  = useState(defaultOpen ?? factor.impact === 'high')
  const Icon             = CATEGORY_ICON[factor.category] ?? AlertCircle
  const impactCfg        = IMPACT_CFG[factor.impact]

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(p => !p)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 transition-all"
      >
        <div className={cn(
          'w-7 h-7 rounded-lg flex items-center justify-center shrink-0',
          factor.impact === 'high' ? 'bg-red-100' : factor.impact === 'medium' ? 'bg-amber-100' : 'bg-slate-100'
        )}>
          <Icon className={cn('w-3.5 h-3.5',
            factor.impact === 'high' ? 'text-red-600' : factor.impact === 'medium' ? 'text-amber-600' : 'text-slate-500'
          )} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-800">{factor.label}</p>
        </div>
        <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0', impactCfg.badge)}>
          {impactCfg.label}
        </span>
        {open ? <ChevronUp className="w-3.5 h-3.5 text-slate-400 shrink-0" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />}
      </button>

      {open && (
        <div className="px-4 pb-3 pt-0 bg-slate-50 border-t border-slate-100">
          <p className="text-xs text-slate-600 leading-relaxed mt-2">{factor.detail}</p>
          {factor.actionable && factor.action && (
            <div className="mt-2.5 flex items-start gap-2 bg-brand-50 border border-brand-200 rounded-lg px-3 py-2">
              <ArrowRight className="w-3.5 h-3.5 text-brand-500 mt-0.5 shrink-0" />
              <p className="text-xs font-semibold text-brand-700">{factor.action}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

interface DelayPredictorProps {
  shipmentId: string
  status:     string
  // Cached values from shipment data (preloaded)
  cachedScore?:   number | null
  cachedLevel?:   string | null
  cachedSummary?: string | null
  cachedAt?:      string | null
}

export function DelayPredictor({
  shipmentId, status,
  cachedScore, cachedLevel, cachedSummary, cachedAt,
}: DelayPredictorProps) {
  const isCompleted = ['COMPLETED', 'DELIVERED', 'CANCELLED'].includes(status)

  // Initialise from DB cache if available
  const [data, setData] = useState<PredictionData | null>(() => {
    if (cachedScore !== null && cachedScore !== undefined && cachedLevel && cachedAt) {
      return {
        score:       cachedScore,
        level:       cachedLevel as PredictionData['level'],
        factors:     [],
        summary:     cachedSummary ?? '',
        predictedAt: cachedAt,
        cached:      true,
      }
    }
    return null
  })

  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [expanded, setExpanded] = useState(false)

  const analyze = useCallback(async (force = false) => {
    setLoading(true); setError('')
    try {
      const url = `/api/shipments/${shipmentId}/predict-delay${force ? '?force=1' : ''}`
      const res  = await fetch(url)
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      setData(json.data)
      setExpanded(true)
    } catch (e: any) {
      setError(e.message || 'Gagal menganalisis risiko')
    } finally {
      setLoading(false) }
  }, [shipmentId])

  if (isCompleted) return null

  const cfg = data ? (LEVEL_CFG[data.level] ?? LEVEL_CFG.low) : null
  const LevelIcon = cfg?.icon ?? AlertCircle

  return (
    <div className={cn(
      'rounded-2xl border overflow-hidden transition-all',
      cfg ? `${cfg.border}` : 'border-slate-200',
      'bg-white'
    )}>
      {/* Header */}
      <div className={cn(
        'px-5 py-3.5 flex items-center justify-between',
        cfg ? `${cfg.bg}` : 'bg-slate-50',
        'border-b',
        cfg ? cfg.border : 'border-slate-200'
      )}>
        <div className="flex items-center gap-2">
          <Zap className={cn('w-4 h-4', cfg?.text ?? 'text-slate-500')} />
          <h3 className={cn('text-sm font-semibold', cfg?.text ?? 'text-slate-700')}>
            Prediksi Risiko Delay
          </h3>
          {data?.cached && (
            <span className="text-[10px] text-slate-400 bg-white/60 px-1.5 py-0.5 rounded-full border border-slate-200">
              {data.cacheAgeMin ? `${data.cacheAgeMin}m lalu` : 'Cache'}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {data && (
            <button onClick={() => setExpanded(p => !p)}
              className={cn('p-1.5 rounded-lg transition-all', cfg ? `hover:${cfg.bg}/80` : 'hover:bg-slate-100')}>
              {expanded
                ? <ChevronUp className={cn('w-3.5 h-3.5', cfg?.text ?? 'text-slate-400')} />
                : <ChevronDown className={cn('w-3.5 h-3.5', cfg?.text ?? 'text-slate-400')} />}
            </button>
          )}
          {data && (
            <button onClick={() => analyze(true)} disabled={loading}
              className={cn('p-1.5 rounded-lg transition-all', cfg ? `hover:${cfg.bg}/80` : 'hover:bg-slate-100', 'disabled:opacity-40')}>
              <RefreshCw className={cn('w-3.5 h-3.5', cfg?.text ?? 'text-slate-400', loading && 'animate-spin')} />
            </button>
          )}
        </div>
      </div>

      <div className="p-5">

        {/* Error state */}
        {error && !loading && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
            <p className="text-xs text-red-700">{error}</p>
          </div>
        )}

        {/* Initial state — not yet analyzed */}
        {!data && !loading && (
          <div className="text-center py-4">
            <div className="w-12 h-12 rounded-2xl bg-brand-50 border border-brand-100 flex items-center justify-center mx-auto mb-3">
              <Zap className="w-6 h-6 text-brand-500" />
            </div>
            <p className="text-sm font-semibold text-slate-700 mb-1">Analisis AI belum dijalankan</p>
            <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed mb-4">
              Claude akan menganalisis pola historis 100 shipment terakhir dan kondisi shipment ini untuk memprediksi risiko keterlambatan.
            </p>
            <button onClick={() => analyze(false)}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-600 text-white text-sm font-semibold rounded-xl hover:bg-brand-700 transition-all">
              <Zap className="w-4 h-4" />
              Analisis Risiko Sekarang
            </button>
            <p className="text-[10px] text-slate-400 mt-2">Powered by Claude AI · ~10 detik</p>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="py-8 text-center space-y-3">
            <div className="flex justify-center">
              <div className="relative">
                <div className="w-12 h-12 rounded-full border-4 border-brand-100 border-t-brand-500 animate-spin" />
                <Zap className="w-5 h-5 text-brand-600 absolute inset-0 m-auto" />
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-slate-700">Claude sedang menganalisis...</p>
              <p className="text-xs text-slate-400">Memeriksa pola historis dan faktor risiko</p>
            </div>
          </div>
        )}

        {/* Result — collapsed (summary only) */}
        {data && !loading && !expanded && (
          <button onClick={() => setExpanded(true)} className="w-full text-left">
            <div className="flex items-center gap-4">
              <RiskMeter score={data.score} level={data.level} />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-slate-700 leading-relaxed">{data.summary}</p>
                {data.factors.length > 0 && (
                  <p className="text-xs text-slate-400 mt-1.5">
                    {data.factors.length} faktor risiko teridentifikasi · Klik untuk detail
                  </p>
                )}
              </div>
            </div>
          </button>
        )}

        {/* Result — expanded */}
        {data && !loading && expanded && (
          <div className="space-y-4">

            {/* Meter + summary */}
            <div className="flex items-start gap-4">
              <RiskMeter score={data.score} level={data.level} />
              <div className="flex-1">
                <p className="text-sm text-slate-700 leading-relaxed">{data.summary}</p>
                {data.recommendation && (
                  <div className="mt-2.5 flex items-start gap-2 bg-brand-50 border border-brand-200 rounded-lg px-3 py-2">
                    <ArrowRight className="w-3.5 h-3.5 text-brand-500 mt-0.5 shrink-0" />
                    <p className="text-xs font-semibold text-brand-700">{data.recommendation}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Faktor risiko */}
            {data.factors.length > 0 && (
              <div className="space-y-2">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Faktor Risiko</p>
                {data.factors.map((f, i) => (
                  <FactorRow key={i} factor={f} defaultOpen={f.impact === 'high'} />
                ))}
              </div>
            )}

            {/* Historical context */}
            {(data.historicalContext || data.meta) && (
              <div className="bg-slate-50 rounded-xl border border-slate-200 p-3.5">
                <div className="flex items-center gap-1.5 mb-2">
                  <Info className="w-3.5 h-3.5 text-slate-400" />
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Konteks Historis</p>
                </div>
                {data.historicalContext && (
                  <p className="text-xs text-slate-600 leading-relaxed">{data.historicalContext}</p>
                )}
                {data.meta && (
                  <div className="grid grid-cols-3 gap-2 mt-2.5">
                    {[
                      { label: 'Data dianalisis', val: `${data.meta.totalHistorical} shipment` },
                      { label: 'Delay rate org', val: `${data.meta.delayRate}%` },
                      { label: 'Rute serupa', val: `${data.meta.similarShipments} shipment` },
                    ].map(s => (
                      <div key={s.label} className="bg-white rounded-lg border border-slate-200 px-2.5 py-2 text-center">
                        <p className="text-xs font-bold text-slate-700">{s.val}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">{s.label}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Footer */}
            <div className="flex items-center justify-between pt-1">
              <p className="text-[10px] text-slate-400">
                Dianalisis {new Date(data.predictedAt).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
              </p>
              <button onClick={() => analyze(true)} disabled={loading}
                className="text-[10px] text-brand-500 font-semibold hover:underline flex items-center gap-0.5 disabled:opacity-40">
                <RefreshCw className="w-2.5 h-2.5" /> Refresh analisis
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
