'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { formatDate, cn } from '@/lib/utils'
import {
  Ship, Plane, Truck, MapPin, Calendar, FileText,
  LogOut, ExternalLink, Package, CheckCircle2, Clock,
  ChevronDown, ChevronUp, Eye,
} from 'lucide-react'
import { PortalChatbot } from '@/components/portal/PortalChatbot'

const STATUS_CFG: Record<string, { label: string; bg: string; text: string; dot: string; desc: string }> = {
  DRAFT:              { label: 'Draft',              bg: 'bg-slate-100', text: 'text-slate-600', dot: 'bg-slate-400',  desc: 'Shipment sedang disiapkan' },
  BOOKING_CONFIRMED:  { label: 'Booking Dikonfirmasi',bg: 'bg-blue-50',  text: 'text-blue-700',  dot: 'bg-blue-500',   desc: 'Booking telah dikonfirmasi' },
  DOCS_IN_PROGRESS:   { label: 'Dokumen Diproses',   bg: 'bg-amber-50',  text: 'text-amber-700', dot: 'bg-amber-500',  desc: 'Dokumen sedang dipersiapkan' },
  CUSTOMS_PROCESSING: { label: 'Proses Bea Cukai',   bg: 'bg-orange-50', text: 'text-orange-700',dot: 'bg-orange-500', desc: 'Sedang diproses bea cukai' },
  CARGO_RELEASED:     { label: 'Kargo Dilepaskan',   bg: 'bg-teal-50',   text: 'text-teal-700',  dot: 'bg-teal-500',   desc: 'Kargo telah dilepaskan bea cukai' },
  IN_TRANSIT:         { label: 'Dalam Perjalanan',   bg: 'bg-indigo-50', text: 'text-indigo-700',dot: 'bg-indigo-500', desc: 'Kargo sedang dalam perjalanan' },
  ARRIVED:            { label: 'Telah Tiba',         bg: 'bg-purple-50', text: 'text-purple-700',dot: 'bg-purple-500', desc: 'Kargo telah tiba di pelabuhan tujuan' },
  DELIVERED:          { label: 'Terkirim',           bg: 'bg-green-50',  text: 'text-green-700', dot: 'bg-green-500',  desc: 'Kargo telah dikirim ke tujuan akhir' },
  COMPLETED:          { label: 'Selesai',            bg: 'bg-green-100', text: 'text-green-800', dot: 'bg-green-600',  desc: 'Proses pengiriman selesai' },
  CANCELLED:          { label: 'Dibatalkan',         bg: 'bg-red-50',    text: 'text-red-700',   dot: 'bg-red-500',    desc: 'Shipment telah dibatalkan' },
}

const DOC_STATUS: Record<string, { label: string; color: string }> = {
  PENDING:      { label: 'Menunggu',  color: 'text-slate-500'  },
  UPLOADED:     { label: 'Tersedia', color: 'text-blue-600'   },
  UNDER_REVIEW: { label: 'Review',   color: 'text-amber-600'  },
  APPROVED:     { label: 'Disetujui',color: 'text-green-600'  },
  REJECTED:     { label: 'Ditolak',  color: 'text-red-600'    },
}

const DOC_TYPE_LABEL: Record<string, string> = {
  BILL_OF_LADING: 'Bill of Lading', AIRWAY_BILL: 'Airway Bill',
  COMMERCIAL_INVOICE: 'Commercial Invoice', PACKING_LIST: 'Packing List',
  CERTIFICATE_OF_ORIGIN: 'Sertifikat Asal', PIB: 'PIB', PEB: 'PEB',
  CUSTOMS_RELEASE: 'Surat Pengeluaran', INSURANCE_POLICY: 'Asuransi', OTHER: 'Dokumen Lain',
}

function ShipmentCard({ shipment }: { shipment: any }) {
  const [expanded, setExpanded] = useState(false)
  const cfg     = STATUS_CFG[shipment.status] ?? STATUS_CFG.DRAFT
  const isLate  = shipment.eta && new Date(shipment.eta) < new Date() && !['COMPLETED','DELIVERED','CANCELLED'].includes(shipment.status)
  const docs    = shipment.documents ?? []
  const history = shipment.statusHistory ?? []

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="p-5">
        <div className="flex items-start gap-3">
          <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0', cfg.bg)}>
            {shipment.mode === 'AIR' ? <Plane className={cn('w-5 h-5', cfg.text)} /> : <Ship className={cn('w-5 h-5', cfg.text)} />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-bold text-slate-900">{shipment.referenceNo}</h3>
              <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold', cfg.bg, cfg.text)}>
                <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', cfg.dot)} />{cfg.label}
              </span>
              {isLate && <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-100">Terlambat</span>}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">{cfg.desc}</p>
          </div>
          <button
            onClick={() => setExpanded(p => !p)}
            className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors shrink-0"
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>

        {/* Key info row */}
        <div className="flex flex-wrap gap-4 mt-4">
          {(shipment.originPort || shipment.destinationPort) && (
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              <span>{shipment.originPort || '—'} → {shipment.destinationPort || '—'}</span>
            </div>
          )}
          {shipment.eta && (
            <div className={cn('flex items-center gap-1.5 text-xs', isLate ? 'text-red-600 font-semibold' : 'text-slate-500')}>
              <Calendar className="w-3.5 h-3.5" />
              <span>ETA: {formatDate(shipment.eta)}</span>
            </div>
          )}
          {docs.length > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <FileText className="w-3.5 h-3.5 text-slate-400" />
              <span>{docs.filter((d: any) => d.status === 'APPROVED').length}/{docs.length} dokumen siap</span>
            </div>
          )}
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="border-t border-slate-100">
          {/* Status history */}
          {history.length > 0 && (
            <div className="px-5 py-4">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Riwayat Status</p>
              <div className="space-y-2">
                {history.map((h: any, i: number) => {
                  const hcfg = STATUS_CFG[h.toStatus] ?? STATUS_CFG.DRAFT
                  return (
                    <div key={i} className="flex items-center gap-3">
                      <span className={cn('w-2 h-2 rounded-full shrink-0', hcfg.dot)} />
                      <span className={cn('text-xs font-semibold', hcfg.text)}>{hcfg.label}</span>
                      <span className="text-xs text-slate-400 ml-auto">{formatDate(h.changedAt)}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Documents */}
          {docs.length > 0 && (
            <div className="px-5 py-4 border-t border-slate-50">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Dokumen Tersedia</p>
              <div className="space-y-2">
                {docs.map((doc: any) => {
                  const dStatus = DOC_STATUS[doc.status] ?? DOC_STATUS.PENDING
                  return (
                    <div key={doc.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                      <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-700 truncate">{doc.name}</p>
                        <p className="text-[10px] text-slate-400">{DOC_TYPE_LABEL[doc.type] || doc.type}</p>
                      </div>
                      <span className={cn('text-xs font-semibold shrink-0', dStatus.color)}>{dStatus.label}</span>
                      {doc.fileUrl && doc.status === 'APPROVED' && (
                        <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer"
                          className="p-1.5 rounded-lg bg-brand-50 text-brand-600 hover:bg-brand-100 transition-colors shrink-0">
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {docs.length === 0 && (
            <div className="px-5 py-4 border-t border-slate-50 text-center">
              <p className="text-xs text-slate-400">Belum ada dokumen yang tersedia</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function PortalTrackingPage() {
  const router = useRouter()
  const [data, setData]       = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter]   = useState('active')

  useEffect(() => {
    fetch('/api/portal/tracking').then(r => {
      if (r.status === 401) { router.push('/portal/login'); return null }
      return r.json()
    }).then(d => {
      if (d?.success) setData(d.data)
    }).finally(() => setLoading(false))
  }, [router])

  const logout = async () => {
    await fetch('/api/portal/auth', { method: 'DELETE' })
    router.push('/portal/login')
  }

  const ACTIVE_STATUSES = ['BOOKING_CONFIRMED','DOCS_IN_PROGRESS','CUSTOMS_PROCESSING','CARGO_RELEASED','IN_TRANSIT','ARRIVED']

  const filteredShipments = (data?.shipments ?? []).filter((s: any) => {
    if (filter === 'active')    return ACTIVE_STATUSES.includes(s.status)
    if (filter === 'completed') return ['COMPLETED','DELIVERED'].includes(s.status)
    return true
  })

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-brand-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-slate-400 text-sm">Memuat data...</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen">
      {/* Top nav */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center">
              <Ship className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900 leading-none">{data?.client?.organization?.name}</p>
              <p className="text-[10px] text-slate-400">Tracking Portal</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-semibold text-slate-700">{data?.client?.companyName || data?.client?.name}</p>
              <p className="text-[10px] text-slate-400">{data?.client?.name}</p>
            </div>
            <button onClick={logout}
              className="p-2 rounded-xl border border-slate-200 text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-5">

        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Total', value: data?.shipments?.length ?? 0, color: 'text-slate-700', bg: 'bg-white', bd: 'border-slate-200' },
            { label: 'Aktif', value: (data?.shipments ?? []).filter((s: any) => ACTIVE_STATUSES.includes(s.status)).length, color: 'text-blue-700', bg: 'bg-blue-50', bd: 'border-blue-100' },
            { label: 'Selesai', value: (data?.shipments ?? []).filter((s: any) => ['COMPLETED','DELIVERED'].includes(s.status)).length, color: 'text-green-700', bg: 'bg-green-50', bd: 'border-green-100' },
          ].map(s => (
            <div key={s.label} className={cn('rounded-xl border px-4 py-3', s.bg, s.bd)}>
              <p className={cn('text-2xl font-bold', s.color)}>{s.value}</p>
              <p className="text-xs text-slate-500">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
          {[
            { key: 'active', label: 'Aktif' },
            { key: 'completed', label: 'Selesai' },
            { key: 'all', label: 'Semua' },
          ].map(t => (
            <button key={t.key} onClick={() => setFilter(t.key)}
              className={cn('px-4 py-2 rounded-lg text-sm font-medium transition-all',
                filter === t.key ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700')}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Shipment cards */}
        {filteredShipments.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
            <Package className="w-8 h-8 text-slate-200 mx-auto mb-2" />
            <p className="text-slate-400 font-medium text-sm">
              {filter === 'active' ? 'Tidak ada shipment aktif saat ini' :
               filter === 'completed' ? 'Belum ada shipment yang selesai' :
               'Belum ada shipment'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredShipments.map((s: any) => <ShipmentCard key={s.id} shipment={s} />)}
          </div>
        )}

        <p className="text-center text-xs text-slate-300 pb-4">
          &copy; {new Date().getFullYear()} {data?.client?.organization?.name} · Powered by Portalog
        </p>
      </main>

      {/* AI Chatbot — floating widget */}
      <PortalChatbot
        orgName={data?.client?.organization?.name ?? 'Freight Forwarder'}
        clientName={data?.client?.companyName ?? data?.client?.name ?? ''}
      />
    </div>
  )
}
