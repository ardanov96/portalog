'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { formatDate, formatRupiah, cn, getInitials } from '@/lib/utils'
import {
  ChevronLeft, Ship, Plane, Truck, Package,
  MapPin, Calendar, Weight, Hash, FileText,
  CheckCircle2, Clock, AlertTriangle, XCircle,
  ChevronDown, RefreshCw, Edit2, User,
  ExternalLink, Activity, Upload, Eye, EyeOff,
  MoreHorizontal, Loader2, Check,
} from 'lucide-react'
import { VesselTracker } from '@/components/shipments/VesselTracker'
import { INSWLookup } from '@/components/shipments/INSWLookup'
import { DelayPredictor } from '@/components/shipments/DelayPredictor'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Client {
  id: string; name: string; companyName: string | null
  email: string | null; phone: string | null
}
interface Document {
  id: string; type: string; name: string; status: string
  fileUrl: string | null; fileSize: number | null; version: number
  isRequired: boolean; isVisibleToClient: boolean
  notes: string | null; createdAt: string
}
interface StatusHistory {
  id: string; fromStatus: string | null; toStatus: string
  note: string | null; changedAt: string
}
interface ActivityLog {
  id: string; action: string; description: string; createdAt: string
}
interface Shipment {
  id: string; referenceNo: string; type: string; mode: string; status: string
  originCountry: string | null; originPort: string | null
  destinationCountry: string | null; destinationPort: string | null
  cargoDescription: string | null; grossWeight: number | null
  volume: number | null; packageCount: number | null; hsCode: string | null
  vesselName: string | null; voyageNo: string | null
  etd: string | null; eta: string | null; ata: string | null
  pibNo: string | null; pebNo: string | null
  customsDeadline: string | null
  freightCost: number | null; localCharges: number | null
  customsDuty: number | null; totalCost: number | null
  invoiceNo: string | null; isPaid: boolean
  notes: string | null; internalNotes: string | null
  createdAt: string; updatedAt: string
  // AI prediction cache
  delayRiskScore?:   number | null
  delayRiskLevel?:   string | null
  delayRiskSummary?: string | null
  delayPredictedAt?: string | null
  client: Client
  assignedTo: { id: string; name: string; email: string } | null
  documents: Document[]
  statusHistory: StatusHistory[]
  activityLogs: ActivityLog[]
}

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_CFG = {
  DRAFT:              { label: 'Draft',      color: 'text-slate-600',  bg: 'bg-slate-100',   dot: 'bg-slate-400',   ring: 'ring-slate-300'  },
  BOOKING_CONFIRMED:  { label: 'Booking OK', color: 'text-blue-700',   bg: 'bg-blue-50',     dot: 'bg-blue-500',    ring: 'ring-blue-300'   },
  DOCS_IN_PROGRESS:   { label: 'Dokumen',    color: 'text-amber-700',  bg: 'bg-amber-50',    dot: 'bg-amber-500',   ring: 'ring-amber-300'  },
  CUSTOMS_PROCESSING: { label: 'Bea Cukai',  color: 'text-orange-700', bg: 'bg-orange-50',   dot: 'bg-orange-500',  ring: 'ring-orange-300' },
  CARGO_RELEASED:     { label: 'Released',   color: 'text-teal-700',   bg: 'bg-teal-50',     dot: 'bg-teal-500',    ring: 'ring-teal-300'   },
  IN_TRANSIT:         { label: 'In Transit', color: 'text-indigo-700', bg: 'bg-indigo-50',   dot: 'bg-indigo-500',  ring: 'ring-indigo-300' },
  ARRIVED:            { label: 'Tiba',       color: 'text-purple-700', bg: 'bg-purple-50',   dot: 'bg-purple-500',  ring: 'ring-purple-300' },
  DELIVERED:          { label: 'Dikirim',    color: 'text-green-700',  bg: 'bg-green-50',    dot: 'bg-green-500',   ring: 'ring-green-300'  },
  COMPLETED:          { label: 'Selesai',    color: 'text-green-800',  bg: 'bg-green-100',   dot: 'bg-green-600',   ring: 'ring-green-400'  },
  CANCELLED:          { label: 'Batal',      color: 'text-red-700',    bg: 'bg-red-50',      dot: 'bg-red-500',     ring: 'ring-red-300'    },
} as const

const STATUS_ORDER = [
  'DRAFT','BOOKING_CONFIRMED','DOCS_IN_PROGRESS','CUSTOMS_PROCESSING',
  'CARGO_RELEASED','IN_TRANSIT','ARRIVED','DELIVERED','COMPLETED',
]

const NEXT_STATUS: Record<string, string[]> = {
  DRAFT:              ['BOOKING_CONFIRMED', 'CANCELLED'],
  BOOKING_CONFIRMED:  ['DOCS_IN_PROGRESS',  'CANCELLED'],
  DOCS_IN_PROGRESS:   ['CUSTOMS_PROCESSING','CANCELLED'],
  CUSTOMS_PROCESSING: ['CARGO_RELEASED',    'CANCELLED'],
  CARGO_RELEASED:     ['IN_TRANSIT',        'CANCELLED'],
  IN_TRANSIT:         ['ARRIVED',           'CANCELLED'],
  ARRIVED:            ['DELIVERED',         'COMPLETED'],
  DELIVERED:          ['COMPLETED'],
  COMPLETED:          [],
  CANCELLED:          [],
}

const DOC_STATUS_CFG = {
  PENDING:      { label: 'Menunggu',    icon: Clock,          color: 'text-slate-500',  bg: 'bg-slate-50'   },
  UPLOADED:     { label: 'Terupload',   icon: Upload,         color: 'text-blue-600',   bg: 'bg-blue-50'    },
  UNDER_REVIEW: { label: 'Review',      icon: Eye,            color: 'text-amber-600',  bg: 'bg-amber-50'   },
  APPROVED:     { label: 'Disetujui',   icon: CheckCircle2,   color: 'text-green-600',  bg: 'bg-green-50'   },
  REJECTED:     { label: 'Ditolak',     icon: XCircle,        color: 'text-red-600',    bg: 'bg-red-50'     },
} as const

const DOC_TYPE_LABEL: Record<string, string> = {
  BILL_OF_LADING:        'Bill of Lading',
  AIRWAY_BILL:           'Airway Bill',
  COMMERCIAL_INVOICE:    'Commercial Invoice',
  PACKING_LIST:          'Packing List',
  CERTIFICATE_OF_ORIGIN: 'Certificate of Origin',
  PIB:                   'PIB (Pemberitahuan Impor)',
  PEB:                   'PEB (Pemberitahuan Ekspor)',
  CUSTOMS_RELEASE:       'Surat Pengeluaran Barang',
  INSURANCE_POLICY:      'Insurance Policy',
  OTHER:                 'Dokumen Lain',
}

// ─── Helper components ────────────────────────────────────────────────────────

function StatusBadge({ status, size = 'md' }: { status: string; size?: 'sm' | 'md' | 'lg' }) {
  const cfg = STATUS_CFG[status as keyof typeof STATUS_CFG] ?? STATUS_CFG.DRAFT
  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 rounded-full font-semibold',
      cfg.bg, cfg.color,
      size === 'sm' ? 'px-2 py-0.5 text-xs' :
      size === 'lg' ? 'px-4 py-1.5 text-sm' :
      'px-2.5 py-1 text-xs'
    )}>
      <span className={cn('rounded-full shrink-0', cfg.dot, size === 'sm' ? 'w-1.5 h-1.5' : 'w-2 h-2')} />
      {cfg.label}
    </span>
  )
}

function InfoRow({ label, value, mono }: { label: string; value?: string | null; mono?: boolean }) {
  if (!value) return null
  return (
    <div className="flex items-start gap-2 py-2 border-b border-slate-50 last:border-0">
      <span className="text-xs text-slate-400 w-32 shrink-0 mt-0.5">{label}</span>
      <span className={cn('text-sm text-slate-800 font-medium', mono && 'font-mono')}>{value}</span>
    </div>
  )
}

function SectionCard({ title, icon: Icon, children, action }: {
  title: string; icon: any; children: React.ReactNode; action?: React.ReactNode
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
          <Icon className="w-4 h-4 text-brand-500" />{title}
        </h3>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

// ─── Status Update Modal ──────────────────────────────────────────────────────

function StatusUpdateModal({
  currentStatus, shipmentId, onClose, onSuccess,
}: {
  currentStatus: string; shipmentId: string
  onClose: () => void; onSuccess: (newStatus: string) => void
}) {
  const [selected, setSelected] = useState('')
  const [note, setNote]         = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const options = NEXT_STATUS[currentStatus] ?? []

  const submit = async () => {
    if (!selected) return
    setLoading(true); setError('')
    try {
      const res  = await fetch(`/api/shipments/${shipmentId}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ status: selected, statusChangeNote: note }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)
      onSuccess(selected)
    } catch (e: any) {
      setError(e.message || 'Gagal update status')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.4)' }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <h3 className="text-base font-bold text-slate-900 mb-4">Update Status Shipment</h3>

        {options.length === 0 ? (
          <p className="text-sm text-slate-500">Tidak ada status berikutnya yang tersedia.</p>
        ) : (
          <div className="space-y-2 mb-4">
            {options.map(s => {
              const cfg = STATUS_CFG[s as keyof typeof STATUS_CFG]
              return (
                <button key={s} type="button" onClick={() => setSelected(s)}
                  className={cn('w-full flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all',
                    selected === s ? `${cfg.bg} border-current ${cfg.color}` : 'border-slate-200 hover:border-slate-300'
                  )}>
                  <span className={cn('w-3 h-3 rounded-full shrink-0', cfg.dot)} />
                  <span className="text-sm font-semibold">{cfg.label}</span>
                  {selected === s && <Check className="w-4 h-4 ml-auto" />}
                </button>
              )
            })}
          </div>
        )}

        <div className="mb-4">
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
            Catatan (opsional)
          </label>
          <textarea value={note} onChange={e => setNote(e.target.value)} rows={3}
            placeholder="Alasan perubahan status, informasi tambahan..."
            className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400 resize-none" />
        </div>

        {error && <p className="text-xs text-red-500 mb-3 flex items-center gap-1"><AlertTriangle className="w-3 h-3" />{error}</p>}

        <div className="flex gap-3">
          <button onClick={onClose} type="button"
            className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-all">
            Batal
          </button>
          <button onClick={submit} disabled={!selected || loading} type="button"
            className="flex-1 py-2.5 rounded-xl bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            Simpan
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function ShipmentDetailClient({
  shipment: initialShipment, currentUserId, userRole,
}: {
  shipment: Shipment; currentUserId: string; userRole: string
}) {
  const router = useRouter()
  const [shipment, setShipment]         = useState(initialShipment)
  const [showStatusModal, setShowStatusModal] = useState(false)
  const [activeTab, setActiveTab]       = useState<'info' | 'docs' | 'timeline' | 'activity'>('info')
  const [refreshing, setRefreshing]     = useState(false)

  const cfg = STATUS_CFG[shipment.status as keyof typeof STATUS_CFG] ?? STATUS_CFG.DRAFT

  const refresh = async () => {
    setRefreshing(true)
    try {
      const res  = await fetch(`/api/shipments/${shipment.id}`)
      const data = await res.json()
      if (data.success) setShipment(data.data)
    } finally { setRefreshing(false) }
  }

  const handleStatusSuccess = (newStatus: string) => {
    setShowStatusModal(false)
    setShipment(prev => ({ ...prev, status: newStatus }))
    refresh()
  }

  const docCounts = {
    total:    shipment.documents.length,
    approved: shipment.documents.filter(d => d.status === 'APPROVED').length,
    pending:  shipment.documents.filter(d => d.status === 'PENDING').length,
  }

  const isLate = shipment.eta && new Date(shipment.eta) < new Date() &&
    !['COMPLETED','DELIVERED','CANCELLED'].includes(shipment.status)

  const currentIdx = STATUS_ORDER.indexOf(shipment.status)

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-7xl space-y-5">

      {/* Breadcrumb & actions */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Link href="/shipments" className="hover:text-brand-600 flex items-center gap-1 transition-colors">
            <ChevronLeft className="w-4 h-4" /> Shipments
          </Link>
          <span>/</span>
          <span className="text-slate-800 font-semibold">{shipment.referenceNo}</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={refresh} disabled={refreshing}
            className="p-2 rounded-xl border border-slate-200 bg-white text-slate-500 hover:text-slate-700 hover:border-slate-300 transition-all disabled:opacity-40">
            <RefreshCw className={cn('w-4 h-4', refreshing && 'animate-spin')} />
          </button>
          <Link
            href={`/shipments/${shipment.id}/edit`}
            className="inline-flex items-center gap-2 px-4 py-2 border border-slate-200 bg-white text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-50 hover:border-slate-300 active:scale-[0.98] transition-all">
            <Edit2 className="w-3.5 h-3.5" /> Edit
          </Link>
          {NEXT_STATUS[shipment.status]?.length > 0 && (
            <button onClick={() => setShowStatusModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-xl text-sm font-semibold hover:bg-brand-700 active:scale-[0.98] transition-all">
              <Edit2 className="w-3.5 h-3.5" /> Update Status
            </button>
          )}
        </div>
      </div>

      {/* Header card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <div className="flex items-start gap-4 flex-wrap">
          <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center shrink-0', cfg.bg)}>
            {shipment.mode === 'AIR'
              ? <Plane  className={cn('w-6 h-6', cfg.color)} />
              : shipment.mode === 'LAND'
              ? <Truck  className={cn('w-6 h-6', cfg.color)} />
              : <Ship   className={cn('w-6 h-6', cfg.color)} />
            }
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap mb-1">
              <h1 className="text-xl font-bold text-slate-900">{shipment.referenceNo}</h1>
              <StatusBadge status={shipment.status} size="lg" />
              {shipment.type === 'EXPORT'
                ? <span className="text-xs font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-100">EXP</span>
                : <span className="text-xs font-bold px-2 py-0.5 rounded bg-sky-50 text-sky-700 border border-sky-100">IMP</span>
              }
              {isLate && (
                <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-100">
                  <AlertTriangle className="w-3 h-3" /> Terlambat
                </span>
              )}
            </div>
            <p className="text-slate-500 text-sm">
              {shipment.client.companyName || shipment.client.name}
              {shipment.client.companyName && <span className="text-slate-400 ml-1">({shipment.client.name})</span>}
            </p>
            <div className="flex items-center gap-4 mt-2 flex-wrap">
              {(shipment.originPort || shipment.destinationPort) && (
                <span className="flex items-center gap-1.5 text-xs text-slate-500">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  {shipment.originPort || shipment.originCountry || '—'} → {shipment.destinationPort || shipment.destinationCountry || '—'}
                </span>
              )}
              {shipment.eta && (
                <span className={cn('flex items-center gap-1.5 text-xs', isLate ? 'text-red-600 font-semibold' : 'text-slate-500')}>
                  <Calendar className="w-3.5 h-3.5" />
                  ETA {formatDate(shipment.eta)}
                </span>
              )}
              {shipment.vesselName && (
                <span className="flex items-center gap-1.5 text-xs text-slate-500">
                  <Ship className="w-3.5 h-3.5 text-slate-400" />
                  {shipment.vesselName} {shipment.voyageNo && `/ ${shipment.voyageNo}`}
                </span>
              )}
            </div>
          </div>

          {/* Doc progress */}
          <div className="shrink-0 text-right">
            <div className="flex items-center gap-1.5 justify-end mb-1">
              <FileText className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-sm font-bold text-slate-800">{docCounts.approved}/{docCounts.total}</span>
              <span className="text-xs text-slate-400">dokumen</span>
            </div>
            <div className="w-32 h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-green-500 rounded-full transition-all"
                style={{ width: docCounts.total > 0 ? `${(docCounts.approved / docCounts.total) * 100}%` : '0%' }} />
            </div>
            <p className="text-[10px] text-slate-400 mt-1">{docCounts.pending} menunggu</p>
          </div>
        </div>

        {/* Status progress bar */}
        {shipment.status !== 'CANCELLED' && (
          <div className="mt-5 pt-5 border-t border-slate-100">
            <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-hide">
              {STATUS_ORDER.map((s, i) => {
                const c    = STATUS_CFG[s as keyof typeof STATUS_CFG]
                const done = i < currentIdx
                const curr = i === currentIdx
                return (
                  <div key={s} className="flex items-center gap-1 shrink-0">
                    <div className={cn('flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[10px] font-semibold whitespace-nowrap transition-all',
                      done ? 'bg-brand-600 text-white' :
                      curr ? `${c.bg} ${c.color} ring-2 ${c.ring}` :
                      'bg-slate-100 text-slate-400'
                    )}>
                      {done && <Check className="w-2.5 h-2.5" />}
                      {curr && <span className={cn('w-1.5 h-1.5 rounded-full', c.dot)} />}
                      {c.label}
                    </div>
                    {i < STATUS_ORDER.length - 1 && (
                      <div className={cn('w-4 h-0.5 rounded', done ? 'bg-brand-400' : 'bg-slate-200')} />
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        {([
          { key: 'info',     label: 'Info Shipment' },
          { key: 'docs',     label: `Dokumen (${docCounts.total})` },
          { key: 'timeline', label: 'Timeline' },
          { key: 'activity', label: 'Aktivitas' },
        ] as const).map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={cn('px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap',
              activeTab === tab.key ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            )}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* ── TAB: Info ── */}
        {activeTab === 'info' && (
          <>
            <div className="lg:col-span-2 space-y-5">
              <SectionCard title="Detail Kargo" icon={Package}>
                <InfoRow label="Deskripsi"    value={shipment.cargoDescription} />
                <InfoRow label="Berat Bruto"  value={shipment.grossWeight ? `${shipment.grossWeight} kg` : null} />
                <InfoRow label="Volume"       value={shipment.volume ? `${shipment.volume} CBM` : null} />
                <InfoRow label="Jumlah Koli"  value={shipment.packageCount ? `${shipment.packageCount} koli` : null} />
                <InfoRow label="HS Code"      value={shipment.hsCode} mono />
                {!shipment.cargoDescription && !shipment.grossWeight && !shipment.hsCode && (
                  <p className="text-sm text-slate-400 text-center py-4">Belum ada detail kargo</p>
                )}
              </SectionCard>

              <SectionCard title="Vessel &amp; Jadwal" icon={Ship}>
                <InfoRow label="Vessel / Penerbangan" value={shipment.vesselName} />
                <InfoRow label="Voyage / Flight No."  value={shipment.voyageNo} mono />
                <InfoRow label="ETD"                  value={shipment.etd ? formatDate(shipment.etd) : null} />
                <InfoRow label="ETA"                  value={shipment.eta ? formatDate(shipment.eta) : null} />
                <InfoRow label="ATA (Aktual)"         value={shipment.ata ? formatDate(shipment.ata) : null} />
                <InfoRow label="Deadline Bea Cukai"   value={shipment.customsDeadline ? formatDate(shipment.customsDeadline) : null} />
                {!shipment.vesselName && !shipment.etd && !shipment.eta && (
                  <p className="text-sm text-slate-400 text-center py-4">Belum ada info vessel</p>
                )}
              </SectionCard>

              {/* Vessel Tracking real-time */}
              <VesselTracker
                shipmentId={shipment.id}
                vesselName={shipment.vesselName}
                imoNumber={(shipment as any).imoNumber}
                mmsiNumber={(shipment as any).mmsiNumber}
                currentEta={shipment.eta}
                mode={shipment.mode}
                onEtaUpdated={(newEta) => {
                  setShipment(prev => ({ ...prev, eta: newEta }))
                }}
              />

              <SectionCard title="Bea Cukai" icon={Hash}>
                <InfoRow label="No. PIB" value={shipment.pibNo} mono />
                <InfoRow label="No. PEB" value={shipment.pebNo} mono />
                {!shipment.pibNo && !shipment.pebNo && (
                  <p className="text-sm text-slate-400 text-center py-4">Belum ada no. PIB / PEB</p>
                )}
              </SectionCard>

              <INSWLookup
                shipmentId={shipment.id}
                pibNo={shipment.pibNo}
                pebNo={shipment.pebNo}
                shipmentType={shipment.type}
                referenceNo={shipment.referenceNo}
                onSaved={(newPib, newPeb) => {
                  setShipment(prev => ({ ...prev, pibNo: newPib, pebNo: newPeb }))
                }}
              />

              {shipment.notes && (
                <SectionCard title="Catatan" icon={FileText}>
                  <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{shipment.notes}</p>
                </SectionCard>
              )}
            </div>

            {/* Right sidebar */}
            <div className="space-y-5">
              {/* AI Delay Predictor — di paling atas sidebar */}
              <DelayPredictor
                shipmentId={shipment.id}
                status={shipment.status}
                cachedScore={shipment.delayRiskScore}
                cachedLevel={shipment.delayRiskLevel}
                cachedSummary={shipment.delayRiskSummary}
                cachedAt={shipment.delayPredictedAt}
              />

              <SectionCard title="Klien" icon={User}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 text-xs font-bold shrink-0">
                    {getInitials(shipment.client.name)}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{shipment.client.companyName || shipment.client.name}</p>
                    {shipment.client.companyName && <p className="text-xs text-slate-400">{shipment.client.name}</p>}
                  </div>
                </div>
                {shipment.client.email && (
                  <a href={`mailto:${shipment.client.email}`}
                    className="text-xs text-brand-600 hover:underline flex items-center gap-1">
                    <ExternalLink className="w-3 h-3" />{shipment.client.email}
                  </a>
                )}
                {shipment.client.phone && (
                  <p className="text-xs text-slate-500 mt-1">{shipment.client.phone}</p>
                )}
              </SectionCard>

              <SectionCard title="Biaya" icon={Activity}>
                {shipment.freightCost || shipment.localCharges || shipment.customsDuty ? (
                  <div className="space-y-2">
                    <InfoRow label="Freight"       value={shipment.freightCost ? formatRupiah(shipment.freightCost) : null} />
                    <InfoRow label="Local Charges" value={shipment.localCharges ? formatRupiah(shipment.localCharges) : null} />
                    <InfoRow label="Bea Masuk"     value={shipment.customsDuty ? formatRupiah(shipment.customsDuty) : null} />
                    {shipment.totalCost && (
                      <div className="pt-2 border-t border-slate-100 flex justify-between items-center">
                        <span className="text-xs font-bold text-slate-600">Total</span>
                        <span className="text-sm font-bold text-slate-900">{formatRupiah(shipment.totalCost)}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-slate-500">Status pembayaran</span>
                      <span className={cn('text-xs font-bold px-2 py-0.5 rounded-full',
                        shipment.isPaid ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700')}>
                        {shipment.isPaid ? 'Lunas' : 'Belum Lunas'}
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-slate-400 text-center py-4">Belum ada info biaya</p>
                )}
              </SectionCard>

              <SectionCard title="PIC" icon={User}>
                {shipment.assignedTo ? (
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 text-xs font-bold shrink-0">
                      {getInitials(shipment.assignedTo.name)}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{shipment.assignedTo.name}</p>
                      <p className="text-xs text-slate-400">{shipment.assignedTo.email}</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-slate-400 text-center py-2">Belum ada PIC</p>
                )}
              </SectionCard>
            </div>
          </>
        )}

        {/* ── TAB: Dokumen ── */}
        {activeTab === 'docs' && (
          <div className="lg:col-span-3">
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-brand-500" />
                  Checklist Dokumen
                  <span className="text-xs font-normal text-slate-400">
                    ({docCounts.approved}/{docCounts.total} disetujui)
                  </span>
                </h3>
                <button
                  onClick={() => alert('Upload dokumen — coming soon!')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 text-white rounded-lg text-xs font-semibold hover:bg-brand-700 transition-colors"
                >
                  <Upload className="w-3.5 h-3.5" /> Upload Dokumen
                </button>
              </div>

              {shipment.documents.length === 0 ? (
                <div className="p-12 text-center">
                  <FileText className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                  <p className="text-slate-400 font-medium text-sm">Belum ada dokumen</p>
                  <p className="text-slate-300 text-xs mt-1">Upload dokumen pertama untuk shipment ini</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-50">
                  {shipment.documents.map(doc => {
                    const dCfg = DOC_STATUS_CFG[doc.status as keyof typeof DOC_STATUS_CFG] ?? DOC_STATUS_CFG.PENDING
                    const DIcon = dCfg.icon
                    return (
                      <div key={doc.id} className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50/60 transition-colors">
                        <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center shrink-0', dCfg.bg)}>
                          <DIcon className={cn('w-4 h-4', dCfg.color)} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-semibold text-slate-800 truncate">{doc.name}</p>
                            {doc.isRequired && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-50 text-red-600 border border-red-100 shrink-0">Wajib</span>
                            )}
                            {doc.isVisibleToClient && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 border border-blue-100 shrink-0 flex items-center gap-0.5">
                                <Eye className="w-2.5 h-2.5" /> Klien
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-400 mt-0.5">
                            {DOC_TYPE_LABEL[doc.type] || doc.type} · v{doc.version} · {formatDate(doc.createdAt)}
                          </p>
                          {doc.notes && <p className="text-xs text-slate-500 mt-0.5 italic">{doc.notes}</p>}
                        </div>
                        <div className="shrink-0 flex items-center gap-2">
                          <span className={cn('text-xs font-semibold px-2.5 py-1 rounded-full', dCfg.bg, dCfg.color)}>
                            {dCfg.label}
                          </span>
                          {doc.fileUrl && (
                            <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer"
                              className="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:text-brand-600 hover:border-brand-200 transition-colors">
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Progress summary */}
              {shipment.documents.length > 0 && (
                <div className="px-5 py-3 border-t border-slate-100 bg-slate-50">
                  <div className="flex items-center gap-4 text-xs text-slate-500">
                    <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-green-500" />{docCounts.approved} disetujui</span>
                    <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-slate-300" />{docCounts.pending} menunggu</span>
                    <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-400" />
                      {shipment.documents.filter(d => d.status === 'UPLOADED' || d.status === 'UNDER_REVIEW').length} review
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── TAB: Timeline ── */}
        {activeTab === 'timeline' && (
          <div className="lg:col-span-3">
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100">
                <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-brand-500" /> Riwayat Status
                </h3>
              </div>
              {shipment.statusHistory.length === 0 ? (
                <div className="p-12 text-center">
                  <Clock className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                  <p className="text-slate-400 font-medium text-sm">Belum ada perubahan status</p>
                </div>
              ) : (
                <div className="p-5">
                  <div className="relative pl-6">
                    <div className="absolute left-0 top-3 bottom-3 w-0.5 bg-slate-100 rounded" />
                    <div className="space-y-6">
                      {shipment.statusHistory.map((h, i) => {
                        const toCfg  = STATUS_CFG[h.toStatus as keyof typeof STATUS_CFG]   ?? STATUS_CFG.DRAFT
                        return (
                          <div key={h.id} className="relative">
                            <div className={cn('absolute -left-6 top-1 w-3 h-3 rounded-full border-2 border-white', toCfg.dot)} />
                            <div className="flex items-start gap-3">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  {h.fromStatus && (
                                    <>
                                      <StatusBadge status={h.fromStatus} size="sm" />
                                      <span className="text-slate-300 text-xs">→</span>
                                    </>
                                  )}
                                  <StatusBadge status={h.toStatus} size="sm" />
                                </div>
                                {h.note && (
                                  <p className="text-xs text-slate-500 mt-1.5 bg-slate-50 rounded-lg px-3 py-2 border border-slate-100">
                                    {h.note}
                                  </p>
                                )}
                              </div>
                              <span className="text-[11px] text-slate-400 whitespace-nowrap shrink-0">
                                {formatDate(h.changedAt)}
                              </span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── TAB: Aktivitas ── */}
        {activeTab === 'activity' && (
          <div className="lg:col-span-3">
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100">
                <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-brand-500" /> Log Aktivitas
                </h3>
              </div>
              {shipment.activityLogs.length === 0 ? (
                <div className="p-12 text-center">
                  <Activity className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                  <p className="text-slate-400 font-medium text-sm">Belum ada aktivitas</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-50">
                  {shipment.activityLogs.map(log => (
                    <div key={log.id} className="px-5 py-3.5 flex items-start gap-3">
                      <div className="w-7 h-7 rounded-full bg-brand-50 flex items-center justify-center shrink-0 mt-0.5">
                        <Activity className="w-3.5 h-3.5 text-brand-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-slate-700">{log.description}</p>
                        <p className="text-[11px] text-slate-400 mt-0.5 font-mono">{log.action}</p>
                      </div>
                      <span className="text-[11px] text-slate-400 whitespace-nowrap shrink-0">
                        {formatDate(log.createdAt)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

      </div>

      {/* Status update modal */}
      {showStatusModal && (
        <StatusUpdateModal
          currentStatus={shipment.status}
          shipmentId={shipment.id}
          onClose={() => setShowStatusModal(false)}
          onSuccess={handleStatusSuccess}
        />
      )}

    </div>
  )
}
