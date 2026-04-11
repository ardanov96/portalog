'use client'

import { useState, useEffect, useMemo } from 'react'
import { cn, formatRupiah } from '@/lib/utils'
import {
  TrendingUp, TrendingDown, Ship, Plane, Truck, Package,
  BarChart2, PieChart, Users, Receipt, ChevronDown,
  RefreshCw, Download, ArrowUpRight, ArrowDownRight,
} from 'lucide-react'
import { ExportButton } from '@/components/laporan/ExportButton'

// ─── Types ────────────────────────────────────────────────────────────────────

interface MonthData {
  month: number; label: string
  total: number; paid: number; unpaid: number; count: number
}
interface VolumeData {
  month: number; label: string
  total: number; export: number; import: number; sea: number; air: number
}
interface Analytics {
  year:           number
  availableYears: number[]
  summary: {
    totalRevenue:    number; paidRevenue:    number; unpaidRevenue: number
    totalShipments:  number; completedCount: number; cancelledCount: number
    invoicedCount:   number; avgRevenue:     number
  }
  monthlyRevenue: MonthData[]
  monthlyVolume:  VolumeData[]
  byStatus:       { status: string; count: number }[]
  byMode:         { mode: string; count: number; revenue: number }[]
  topClients:     { clientId: string; name: string; pic: string | null; count: number; revenue: number }[]
}

// ─── Config ───────────────────────────────────────────────────────────────────

const STATUS_CFG: Record<string, { label: string; color: string; bg: string }> = {
  DRAFT:              { label: 'Draft',      color: '#94a3b8', bg: '#f1f5f9' },
  BOOKING_CONFIRMED:  { label: 'Booking',    color: '#3b82f6', bg: '#eff6ff' },
  DOCS_IN_PROGRESS:   { label: 'Dokumen',    color: '#f59e0b', bg: '#fffbeb' },
  CUSTOMS_PROCESSING: { label: 'Bea Cukai',  color: '#f97316', bg: '#fff7ed' },
  CARGO_RELEASED:     { label: 'Released',   color: '#14b8a6', bg: '#f0fdfa' },
  IN_TRANSIT:         { label: 'In Transit', color: '#6366f1', bg: '#eef2ff' },
  ARRIVED:            { label: 'Tiba',       color: '#8b5cf6', bg: '#f5f3ff' },
  DELIVERED:          { label: 'Dikirim',    color: '#22c55e', bg: '#f0fdf4' },
  COMPLETED:          { label: 'Selesai',    color: '#16a34a', bg: '#dcfce7' },
  CANCELLED:          { label: 'Batal',      color: '#ef4444', bg: '#fef2f2' },
}

const MODE_CFG: Record<string, { label: string; color: string; Icon: any }> = {
  SEA_FCL: { label: 'Sea FCL', color: '#3b82f6', Icon: Ship  },
  SEA_LCL: { label: 'Sea LCL', color: '#06b6d4', Icon: Ship  },
  AIR:     { label: 'Air',     color: '#8b5cf6', Icon: Plane },
  LAND:    { label: 'Land',    color: '#f59e0b', Icon: Truck },
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function pct(v: number, total: number) { return total > 0 ? Math.round((v / total) * 100) : 0 }
function maxOf(arr: number[]) { return Math.max(...arr, 1) }
function shortIdr(v: number) {
  if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(1)}M`
  if (v >= 1_000_000)     return `${(v / 1_000_000).toFixed(0)}jt`
  if (v >= 1_000)         return `${(v / 1_000).toFixed(0)}rb`
  return String(v)
}

// ─── SVG Charts ───────────────────────────────────────────────────────────────

function BarChart({
  data, valueKey, label2Key, color1, color2,
  height = 160, showValues = false,
}: {
  data: any[]; valueKey: string; label2Key?: string
  color1: string; color2?: string; height?: number; showValues?: boolean
}) {
  const values  = data.map(d => d[valueKey] as number)
  const values2 = label2Key ? data.map(d => d[label2Key] as number) : []
  const maxVal  = maxOf([...values, ...values2])
  const W       = 100 / data.length
  const BAR_H   = height - 28

  return (
    <svg viewBox={`0 0 ${data.length * 44} ${height + 8}`} className="w-full" style={{ height }}>
      {/* Grid lines */}
      {[0, 0.25, 0.5, 0.75, 1].map((f, i) => (
        <g key={i}>
          <line x1="0" y1={BAR_H * (1 - f)} x2={data.length * 44} y2={BAR_H * (1 - f)}
            stroke="#f1f5f9" strokeWidth="1" />
          <text x="0" y={BAR_H * (1 - f) - 2} fontSize="7" fill="#cbd5e1">
            {shortIdr(maxVal * f)}
          </text>
        </g>
      ))}

      {data.map((d, i) => {
        const x   = i * 44 + 4
        const v1  = d[valueKey] as number
        const v2  = label2Key ? d[label2Key] as number : 0
        const h1  = maxVal > 0 ? (v1 / maxVal) * BAR_H : 0
        const h2  = maxVal > 0 ? (v2 / maxVal) * BAR_H : 0
        const bw  = label2Key ? 15 : 28

        return (
          <g key={i}>
            {/* Bar 1 */}
            <rect x={x} y={BAR_H - h1} width={bw} height={h1} rx="3"
              fill={color1} opacity="0.9">
              <title>{d.label}: {formatRupiah ? formatRupiah(v1) : v1}</title>
            </rect>
            {/* Bar 2 */}
            {label2Key && v2 > 0 && (
              <rect x={x + 17} y={BAR_H - h2} width={bw} height={h2} rx="3"
                fill={color2 ?? '#e2e8f0'} opacity="0.9" />
            )}
            {/* Label */}
            <text x={x + (label2Key ? 16 : 14)} y={BAR_H + 10} textAnchor="middle"
              fontSize="8.5" fill="#94a3b8">
              {d.label}
            </text>
            {/* Value on top */}
            {showValues && v1 > 0 && (
              <text x={x + (label2Key ? 8 : 14)} y={BAR_H - h1 - 3} textAnchor="middle"
                fontSize="7" fill={color1} fontWeight="600">
                {v1}
              </text>
            )}
          </g>
        )
      })}
    </svg>
  )
}

function LineChart({ data, valueKey, color, height = 160 }: {
  data: any[]; valueKey: string; color: string; height?: number
}) {
  const values = data.map(d => d[valueKey] as number)
  const maxVal = maxOf(values)
  const W      = data.length > 1 ? 560 / (data.length - 1) : 560
  const BAR_H  = height - 24

  const points = values.map((v, i) => ({
    x: i * W + 16,
    y: maxVal > 0 ? BAR_H - (v / maxVal) * (BAR_H - 8) : BAR_H,
  }))

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
  const areaD = `${pathD} L ${points[points.length-1].x} ${BAR_H} L ${points[0].x} ${BAR_H} Z`

  return (
    <svg viewBox={`0 0 592 ${height}`} className="w-full" style={{ height }}>
      <defs>
        <linearGradient id={`grad-${valueKey}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.2" />
          <stop offset="100%" stopColor={color} stopOpacity="0.01" />
        </linearGradient>
      </defs>

      {/* Grid */}
      {[0, 0.5, 1].map((f, i) => (
        <line key={i} x1="16" y1={8 + (BAR_H - 8) * f} x2="576" y2={8 + (BAR_H - 8) * f}
          stroke="#f1f5f9" strokeWidth="1" />
      ))}

      {/* Area fill */}
      <path d={areaD} fill={`url(#grad-${valueKey})`} />

      {/* Line */}
      <path d={pathD} stroke={color} strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />

      {/* Dots + labels */}
      {points.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r="4" fill="white" stroke={color} strokeWidth="2" />
          {values[i] > 0 && (
            <text x={p.x} y={p.y - 8} textAnchor="middle" fontSize="7.5" fill={color} fontWeight="600">
              {shortIdr(values[i])}
            </text>
          )}
          <text x={p.x} y={BAR_H + 12} textAnchor="middle" fontSize="8.5" fill="#94a3b8">
            {data[i].label}
          </text>
        </g>
      ))}
    </svg>
  )
}

function DonutChart({ segments, size = 120 }: {
  segments: { label: string; value: number; color: string }[]
  size?: number
}) {
  const total = segments.reduce((s, g) => s + g.value, 0)
  if (total === 0) return <div className="text-center text-xs text-slate-300 py-8">Tidak ada data</div>

  const r  = 42
  const cx = 52
  const cy = 52

  let cumAngle = -90
  const arcs = segments.filter(s => s.value > 0).map(seg => {
    const angle   = (seg.value / total) * 360
    const start   = cumAngle
    cumAngle     += angle
    const rad1    = (start * Math.PI) / 180
    const rad2    = ((start + angle) * Math.PI) / 180
    const x1 = cx + r * Math.cos(rad1)
    const y1 = cy + r * Math.sin(rad1)
    const x2 = cx + r * Math.cos(rad2)
    const y2 = cy + r * Math.sin(rad2)
    const large = angle > 180 ? 1 : 0
    return { ...seg, path: `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`, angle }
  })

  return (
    <svg viewBox="0 0 104 104" style={{ width: size, height: size }}>
      {arcs.map((a, i) => (
        <path key={i} d={a.path} fill={a.color} opacity="0.9">
          <title>{a.label}: {a.value} ({pct(a.value, total)}%)</title>
        </path>
      ))}
      <circle cx={cx} cy={cy} r="26" fill="white" />
      <text x={cx} y={cy - 3} textAnchor="middle" fontSize="11" fontWeight="700" fill="#0f172a">{total}</text>
      <text x={cx} y={cy + 9} textAnchor="middle" fontSize="7" fill="#94a3b8">shipment</text>
    </svg>
  )
}

// ─── Summary card ─────────────────────────────────────────────────────────────

function SummaryCard({
  label, value, sub, icon: Icon, color, trend,
}: {
  label: string; value: string; sub?: string; icon: any
  color: string; trend?: 'up' | 'down' | null
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 px-5 py-4">
      <div className="flex items-start justify-between mb-3">
        <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center', `bg-opacity-10`)}
          style={{ background: `${color}18` }}>
          <Icon className="w-4.5 h-4.5" style={{ color }} />
        </div>
        {trend && (
          <span className={cn('flex items-center gap-0.5 text-[10px] font-semibold px-2 py-0.5 rounded-full',
            trend === 'up' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500')}>
            {trend === 'up' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
          </span>
        )}
      </div>
      <p className="text-xl font-bold text-slate-900 leading-none mb-1">{value}</p>
      <p className="text-xs font-medium text-slate-500">{label}</p>
      {sub && <p className="text-[10px] text-slate-400 mt-0.5">{sub}</p>}
    </div>
  )
}

function ChartCard({ title, subtitle, children, action }: {
  title: string; subtitle?: string; children: React.ReactNode; action?: React.ReactNode
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
          {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
        </div>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

// ─── Main page ─────────────────────────────────────────────────────────────────

export default function LaporanPage() {
  const [data, setData]       = useState<Analytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [year, setYear]       = useState(new Date().getFullYear())
  const [chartMode, setChartMode] = useState<'revenue' | 'volume'>('revenue')

  const fetchData = async (y: number) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/analytics?year=${y}`)
      const d   = await res.json()
      if (d.success) setData(d.data)
    } finally { setLoading(false) }
  }

  useEffect(() => { fetchData(year) }, [year])

  const totalShipments = useMemo(() =>
    data?.byStatus.reduce((s, g) => s + g.count, 0) ?? 0, [data])

  const activeStatuses = ['BOOKING_CONFIRMED','DOCS_IN_PROGRESS','CUSTOMS_PROCESSING','CARGO_RELEASED','IN_TRANSIT','ARRIVED']
  const activeCount    = useMemo(() =>
    data?.byStatus.filter(g => activeStatuses.includes(g.status)).reduce((s, g) => s + g.count, 0) ?? 0,
    [data])

  if (loading && !data) return (
    <div className="max-w-7xl space-y-5">
      <div className="h-8 bg-slate-100 rounded animate-pulse w-48" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => <div key={i} className="h-28 bg-slate-100 rounded-2xl animate-pulse" />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {[...Array(4)].map((_, i) => <div key={i} className="h-64 bg-slate-100 rounded-2xl animate-pulse" />)}
      </div>
    </div>
  )

  const s = data?.summary

  return (
    <div className="max-w-7xl space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Laporan &amp; Analytics</h1>
          <p className="text-slate-500 text-sm">Ringkasan performa pengiriman dan revenue</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Year selector */}
          <div className="relative">
            <select
              value={year}
              onChange={e => setYear(Number(e.target.value))}
              className="appearance-none pl-4 pr-8 py-2 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 font-medium text-slate-700"
            >
              {(data?.availableYears ?? [year]).map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
          </div>
          <button onClick={() => fetchData(year)} disabled={loading}
            className="p-2 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 transition-all">
            <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
          </button>
          <ExportButton year={year} />
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard label="Total Revenue" value={formatRupiah(s?.totalRevenue ?? 0)}
          sub={`${s?.invoicedCount ?? 0} invoice dibuat`}
          icon={TrendingUp} color="#3b82f6" />
        <SummaryCard label="Belum Dibayar" value={formatRupiah(s?.unpaidRevenue ?? 0)}
          sub={s?.unpaidRevenue ? 'Perlu ditagih' : 'Semua lunas ✓'}
          icon={Receipt} color="#f59e0b" />
        <SummaryCard label="Total Shipment" value={String(s?.totalShipments ?? 0)}
          sub={`${s?.completedCount ?? 0} selesai · ${s?.cancelledCount ?? 0} dibatalkan`}
          icon={Package} color="#8b5cf6" />
        <SummaryCard label="Rata-rata per Shipment" value={formatRupiah(s?.avgRevenue ?? 0)}
          sub="Revenue per shipment"
          icon={BarChart2} color="#14b8a6" />
      </div>

      {/* Main chart — Revenue or Volume toggle */}
      <ChartCard
        title={chartMode === 'revenue' ? 'Revenue Bulanan' : 'Volume Shipment Bulanan'}
        subtitle={`Tahun ${year}`}
        action={
          <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
            {([
              { key: 'revenue', label: 'Revenue' },
              { key: 'volume',  label: 'Shipment' },
            ] as const).map(t => (
              <button key={t.key} onClick={() => setChartMode(t.key)}
                className={cn('px-3 py-1 rounded text-xs font-medium transition-all',
                  chartMode === t.key ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500')}>
                {t.label}
              </button>
            ))}
          </div>
        }
      >
        {data && chartMode === 'revenue' ? (
          <>
            <div className="flex items-center gap-5 mb-4">
              <span className="flex items-center gap-1.5 text-xs text-slate-500">
                <span className="w-2.5 h-2.5 rounded-sm bg-brand-500" /> Total Invoice
              </span>
              <span className="flex items-center gap-1.5 text-xs text-slate-500">
                <span className="w-2.5 h-2.5 rounded-sm bg-brand-200" /> Lunas
              </span>
            </div>
            <LineChart data={data.monthlyRevenue} valueKey="total" color="#3b82f6" height={180} />
          </>
        ) : data ? (
          <>
            <div className="flex items-center gap-5 mb-4">
              <span className="flex items-center gap-1.5 text-xs text-slate-500">
                <span className="w-2.5 h-2.5 rounded-sm bg-brand-500" /> Import
              </span>
              <span className="flex items-center gap-1.5 text-xs text-slate-500">
                <span className="w-2.5 h-2.5 rounded-sm bg-violet-400" /> Export
              </span>
            </div>
            <BarChart data={data.monthlyVolume} valueKey="import" label2Key="export"
              color1="#3b82f6" color2="#8b5cf6" height={180} showValues />
          </>
        ) : null}
      </ChartCard>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Status breakdown */}
        <ChartCard title="Breakdown Status" subtitle="Semua waktu">
          {data && (
            <div className="flex items-center gap-4">
              <DonutChart
                segments={(data.byStatus ?? []).map(g => ({
                  label: STATUS_CFG[g.status]?.label ?? g.status,
                  value: g.count,
                  color: STATUS_CFG[g.status]?.color ?? '#94a3b8',
                }))}
                size={104}
              />
              <div className="flex-1 space-y-1.5">
                {data.byStatus.sort((a, b) => b.count - a.count).slice(0, 6).map(g => {
                  const cfg = STATUS_CFG[g.status] ?? { label: g.status, color: '#94a3b8', bg: '#f1f5f9' }
                  return (
                    <div key={g.status} className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: cfg.color }} />
                      <span className="text-xs text-slate-600 flex-1 truncate">{cfg.label}</span>
                      <span className="text-xs font-bold text-slate-800">{g.count}</span>
                      <span className="text-[10px] text-slate-400 w-8 text-right">{pct(g.count, totalShipments)}%</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </ChartCard>

        {/* Mode breakdown */}
        <ChartCard title="Moda Pengiriman" subtitle="Semua waktu">
          {data && (
            <div className="space-y-3">
              {data.byMode.sort((a, b) => b.count - a.count).map(g => {
                const cfg  = MODE_CFG[g.mode] ?? { label: g.mode, color: '#94a3b8', Icon: Package }
                const Icon = cfg.Icon
                const w    = pct(g.count, totalShipments)
                return (
                  <div key={g.mode}>
                    <div className="flex items-center gap-2 mb-1">
                      <Icon className="w-3.5 h-3.5 shrink-0" style={{ color: cfg.color }} />
                      <span className="text-xs font-medium text-slate-700 flex-1">{cfg.label}</span>
                      <span className="text-xs font-bold text-slate-800">{g.count}</span>
                      <span className="text-[10px] text-slate-400">{w}%</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${w}%`, background: cfg.color }} />
                    </div>
                    {g.revenue > 0 && (
                      <p className="text-[10px] text-slate-400 mt-0.5 text-right">
                        {formatRupiah(g.revenue)} revenue
                      </p>
                    )}
                  </div>
                )
              })}
              {data.byMode.length === 0 && (
                <p className="text-xs text-slate-300 text-center py-6">Belum ada data</p>
              )}
            </div>
          )}
        </ChartCard>

        {/* Top clients */}
        <ChartCard title="Top Klien" subtitle="Berdasarkan jumlah shipment">
          {data && (
            <div className="space-y-2">
              {data.topClients.slice(0, 6).map((c, i) => {
                const maxCount = data.topClients[0]?.count ?? 1
                return (
                  <div key={c.clientId} className="flex items-center gap-3">
                    <span className="text-[10px] font-bold text-slate-300 w-4 text-right shrink-0">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-700 truncate">{c.name}</p>
                      <div className="h-1 bg-slate-100 rounded-full mt-0.5 overflow-hidden">
                        <div className="h-full bg-brand-400 rounded-full"
                          style={{ width: `${pct(c.count, maxCount)}%` }} />
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-bold text-slate-800">{c.count}</p>
                      {c.revenue > 0 && <p className="text-[9px] text-slate-400">{formatRupiah(c.revenue)}</p>}
                    </div>
                  </div>
                )
              })}
              {data.topClients.length === 0 && (
                <p className="text-xs text-slate-300 text-center py-6">Belum ada data</p>
              )}
            </div>
          )}
        </ChartCard>
      </div>

      {/* Revenue detail table */}
      <ChartCard title="Detail Revenue Bulanan" subtitle={`Tahun ${year}`}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                {['Bulan','Shipment','Total Invoice','Lunas','Belum Lunas','%Lunas'].map(h => (
                  <th key={h} className="pb-3 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider pr-4 last:pr-0">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {(data?.monthlyRevenue ?? []).filter(m => m.total > 0 || m.count > 0).map(m => (
                <tr key={m.month} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-3 pr-4 font-semibold text-slate-800">{m.label} {year}</td>
                  <td className="py-3 pr-4 text-slate-600">{m.count}</td>
                  <td className="py-3 pr-4 font-mono text-slate-800">{m.total > 0 ? formatRupiah(m.total) : '—'}</td>
                  <td className="py-3 pr-4 text-green-600 font-mono">{m.paid > 0 ? formatRupiah(m.paid) : '—'}</td>
                  <td className="py-3 pr-4 text-amber-600 font-mono">{m.unpaid > 0 ? formatRupiah(m.unpaid) : '—'}</td>
                  <td className="py-3">
                    {m.total > 0 ? (
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-green-500 rounded-full" style={{ width: `${pct(m.paid, m.total)}%` }} />
                        </div>
                        <span className="text-xs font-semibold text-slate-700">{pct(m.paid, m.total)}%</span>
                      </div>
                    ) : '—'}
                  </td>
                </tr>
              ))}
              {(data?.monthlyRevenue ?? []).every(m => m.total === 0 && m.count === 0) && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-xs text-slate-300">
                    Tidak ada data revenue untuk tahun {year}
                  </td>
                </tr>
              )}
            </tbody>
            {/* Total row */}
            {(data?.monthlyRevenue ?? []).some(m => m.total > 0) && (
              <tfoot>
                <tr className="border-t-2 border-slate-200 bg-slate-50">
                  <td className="py-3 pr-4 font-bold text-slate-900">Total {year}</td>
                  <td className="py-3 pr-4 font-bold text-slate-800">
                    {data?.monthlyRevenue.reduce((s, m) => s + m.count, 0)}
                  </td>
                  <td className="py-3 pr-4 font-bold text-slate-900 font-mono">
                    {formatRupiah(data?.summary.totalRevenue ?? 0)}
                  </td>
                  <td className="py-3 pr-4 font-bold text-green-700 font-mono">
                    {formatRupiah(data?.summary.paidRevenue ?? 0)}
                  </td>
                  <td className="py-3 pr-4 font-bold text-amber-700 font-mono">
                    {formatRupiah(data?.summary.unpaidRevenue ?? 0)}
                  </td>
                  <td className="py-3">
                    <span className="text-sm font-bold text-slate-800">
                      {pct(data?.summary.paidRevenue ?? 0, data?.summary.totalRevenue ?? 1)}%
                    </span>
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </ChartCard>

    </div>
  )
}
