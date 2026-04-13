'use client'

import { useState, useEffect, useCallback } from 'react'
import { cn, formatDate } from '@/lib/utils'
import {
  Ship, Loader2, RefreshCw, MapPin, Navigation,
  Clock, AlertCircle, CheckCircle2, Zap, Info,
  Edit3, ExternalLink, Radio, Anchor, ArrowRight,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface VesselPosition {
  lat: number; lon: number; speed: number; course: number
  status: string; statusText: string
  destination?: string; eta?: string
  timestamp: string; provider: string
}

interface TrackData {
  position:     VesselPosition | null
  eta:          string | null
  etaUpdatedAt: string | null
  etaUpdated?:  boolean
  cached?:      boolean
  cacheAgeMin?: number
  reason?:      'no_vessel_info' | 'not_found' | string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function degToCompass(deg: number): string {
  const dirs = ['U', 'TL', 'T', 'TG', 'S', 'BD', 'B', 'BL']
  return dirs[Math.round(deg / 45) % 8]
}

function speedLabel(knots: number): string {
  if (knots < 0.5) return 'Diam'
  if (knots < 5)   return 'Lambat'
  if (knots < 12)  return 'Sedang'
  return 'Cepat'
}

const STATUS_CFG: Record<string, { color: string; bg: string; dot: string; icon: any }> = {
  'underway':  { color: 'text-green-700',  bg: 'bg-green-50',  dot: 'bg-green-500',  icon: Ship   },
  'at anchor': { color: 'text-amber-700',  bg: 'bg-amber-50',  dot: 'bg-amber-400',  icon: Anchor },
  'moored':    { color: 'text-blue-700',   bg: 'bg-blue-50',   dot: 'bg-blue-400',   icon: MapPin },
  'unknown':   { color: 'text-slate-600',  bg: 'bg-slate-100', dot: 'bg-slate-400',  icon: Radio  },
}

// ─── Minimap (SVG compass + direction arrow) ──────────────────────────────────

function VesselCompass({ course, speed }: { course: number; speed: number }) {
  const rad  = (course - 90) * (Math.PI / 180)
  const arrowX = 32 + Math.cos(rad) * 20
  const arrowY = 32 + Math.sin(rad) * 20

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width="64" height="64" viewBox="0 0 64 64">
        {/* Compass ring */}
        <circle cx="32" cy="32" r="30" fill="#f8fafc" stroke="#e2e8f0" strokeWidth="1.5" />
        {/* Cardinal directions */}
        {[['U', 32, 6], ['S', 32, 60], ['T', 60, 35], ['B', 4, 35]].map(([l, x, y]) => (
          <text key={String(l)} x={Number(x)} y={Number(y)} textAnchor="middle"
            fontSize="8" fill="#94a3b8" fontWeight="600" fontFamily="sans-serif">
            {l}
          </text>
        ))}
        {/* Arrow */}
        <line x1="32" y1="32" x2={arrowX} y2={arrowY}
          stroke="#3b82f6" strokeWidth="3" strokeLinecap="round" />
        <circle cx={arrowX} cy={arrowY} r="3" fill="#3b82f6" />
        {/* Center dot */}
        <circle cx="32" cy="32" r="4" fill="#1e293b" />
        <circle cx="32" cy="32" r="2" fill="#f8fafc" />
      </svg>
      <p className="text-[10px] font-semibold text-slate-500">{Math.round(course)}° {degToCompass(course)}</p>
      <p className="text-[10px] text-slate-400">{speed.toFixed(1)} kn · {speedLabel(speed)}</p>
    </div>
  )
}

// ─── Main VesselTracker component ─────────────────────────────────────────────

interface VesselTrackerProps {
  shipmentId:  string
  vesselName?: string | null
  imoNumber?:  string | null
  mmsiNumber?: string | null
  currentEta?: string | null
  mode:        string
  onEtaUpdated?: (newEta: string) => void
}

export function VesselTracker({
  shipmentId, vesselName, imoNumber, mmsiNumber,
  currentEta, mode, onEtaUpdated,
}: VesselTrackerProps) {
  const [data, setData]         = useState<TrackData | null>(null)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [showIMOForm, setShowIMOForm] = useState(false)
  const [imo, setImo]           = useState(imoNumber ?? '')
  const [mmsi, setMmsi]         = useState(mmsiNumber ?? '')
  const [savingIds, setSavingIds] = useState(false)

  // Only track sea shipments
  const isSeaMode = ['SEA_FCL', 'SEA_LCL'].includes(mode)

  const fetchTrack = useCallback(async () => {
    if (!isSeaMode) return
    setLoading(true); setError('')
    try {
      const res  = await fetch(`/api/shipments/${shipmentId}/track`)
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      setData(json.data)
      if (json.data.etaUpdated && json.data.eta && onEtaUpdated) {
        onEtaUpdated(json.data.eta)
      }
    } catch (e: any) {
      setError(e.message || 'Gagal mengambil data posisi')
    } finally {
      setLoading(false)
    }
  }, [shipmentId, isSeaMode, onEtaUpdated])

  useEffect(() => { fetchTrack() }, [fetchTrack])

  const saveIds = async () => {
    setSavingIds(true)
    try {
      await fetch(`/api/shipments/${shipmentId}/track`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ imoNumber: imo || null, mmsiNumber: mmsi || null }),
      })
      setShowIMOForm(false)
      fetchTrack()
    } catch {}
    finally { setSavingIds(false) }
  }

  if (!isSeaMode) return null

  const pos = data?.position
  const cfg = pos ? (STATUS_CFG[pos.status] ?? STATUS_CFG.unknown) : null
  const StatusIcon = cfg?.icon ?? Ship
  const ageMin     = data?.cacheAgeMin ?? 0

  const hasVesselId = imoNumber || mmsiNumber || imo || mmsi

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={cn('w-2 h-2 rounded-full', pos ? 'bg-green-500 animate-pulse' : 'bg-slate-300')} />
          <h3 className="text-sm font-semibold text-slate-800">Vessel Tracking</h3>
          {data?.cached && (
            <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-full">
              Cache {ageMin}m lalu
            </span>
          )}
          {pos?.provider && pos.provider !== 'cache' && (
            <span className="text-[10px] text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded-full border border-slate-200">
              via {pos.provider}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowIMOForm(p => !p)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-brand-600 hover:bg-brand-50 transition-all"
            title="Set IMO / MMSI"
          >
            <Edit3 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={fetchTrack}
            disabled={loading}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all disabled:opacity-40"
            title="Refresh"
          >
            <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
          </button>
        </div>
      </div>

      <div className="p-5 space-y-4">

        {/* IMO/MMSI form */}
        {showIMOForm && (
          <div className="bg-brand-50 border border-brand-200 rounded-xl p-4 space-y-3">
            <p className="text-xs font-semibold text-brand-700">Identifikasi Kapal</p>
            <p className="text-[11px] text-brand-600">Masukkan IMO atau MMSI untuk tracking lebih akurat</p>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-semibold text-brand-600 uppercase tracking-wide">IMO Number</label>
                <input
                  value={imo} onChange={e => setImo(e.target.value.replace(/\D/g, '').slice(0, 7))}
                  placeholder="9123456"
                  className="mt-1 w-full px-3 py-2 text-sm border border-brand-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 font-mono"
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-brand-600 uppercase tracking-wide">MMSI</label>
                <input
                  value={mmsi} onChange={e => setMmsi(e.target.value.replace(/\D/g, '').slice(0, 9))}
                  placeholder="538000001"
                  className="mt-1 w-full px-3 py-2 text-sm border border-brand-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 font-mono"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowIMOForm(false)}
                className="flex-1 py-2 rounded-lg border border-brand-200 text-xs font-medium text-brand-600 hover:bg-brand-100 transition-all">
                Batal
              </button>
              <button onClick={saveIds} disabled={savingIds}
                className="flex-1 py-2 rounded-lg bg-brand-600 text-white text-xs font-semibold hover:bg-brand-700 transition-all flex items-center justify-center gap-1">
                {savingIds ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                Simpan
              </button>
            </div>
          </div>
        )}

        {/* Loading state */}
        {loading && !data && (
          <div className="flex items-center gap-2 text-slate-400 text-sm py-4 justify-center">
            <Loader2 className="w-4 h-4 animate-spin" />
            Mengambil posisi kapal...
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
            <p className="text-xs text-red-700">{error}</p>
          </div>
        )}

        {/* No vessel info */}
        {!loading && data?.reason === 'no_vessel_info' && (
          <div className="bg-slate-50 rounded-xl p-4 text-center border border-slate-200">
            <Ship className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-500">Nama kapal belum diisi</p>
            <p className="text-xs text-slate-400 mt-1">Isi nama kapal atau IMO number untuk tracking posisi real-time</p>
            <button onClick={() => setShowIMOForm(true)}
              className="mt-3 text-xs text-brand-600 font-semibold hover:underline flex items-center gap-1 mx-auto">
              <Edit3 className="w-3 h-3" /> Tambah IMO / MMSI
            </button>
          </div>
        )}

        {/* Not found */}
        {!loading && data?.reason === 'not_found' && vesselName && (
          <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-amber-700">Kapal tidak ditemukan dalam AIS</p>
                <p className="text-xs text-amber-600 mt-0.5 leading-relaxed">
                  "{vesselName}" tidak terdeteksi di AIS saat ini. Mungkin sedang di luar jangkauan, atau nama berbeda dari yang di database.
                  Coba tambahkan IMO number untuk pencarian yang lebih akurat.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 mt-3">
              <button onClick={() => setShowIMOForm(true)}
                className="text-xs text-amber-700 font-semibold hover:underline flex items-center gap-1">
                <Edit3 className="w-3 h-3" /> Set IMO
              </button>
              <a href={`https://www.vesselfinder.com/vessels?name=${encodeURIComponent(vesselName ?? '')}`}
                target="_blank" rel="noopener noreferrer"
                className="text-xs text-amber-700 font-semibold hover:underline flex items-center gap-1">
                <ExternalLink className="w-3 h-3" /> Cari di VesselFinder
              </a>
            </div>
          </div>
        )}

        {/* Position data */}
        {pos && (
          <>
            {/* Status badge + ETA updated */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold', cfg!.bg, cfg!.color)}>
                <span className={cn('w-1.5 h-1.5 rounded-full', cfg!.dot)} />
                {pos.statusText}
              </span>
              {data?.etaUpdated && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-50 text-green-700 border border-green-100">
                  <Zap className="w-3 h-3" /> ETA diperbarui otomatis
                </span>
              )}
            </div>

            {/* Main info grid */}
            <div className="grid grid-cols-2 gap-4 items-start">
              {/* Compass */}
              <div className="flex items-center justify-center py-2">
                <VesselCompass course={pos.course} speed={pos.speed} />
              </div>

              {/* Position details */}
              <div className="space-y-2.5">
                <div>
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Koordinat</p>
                  <p className="text-sm font-mono text-slate-800 mt-0.5">
                    {pos.lat.toFixed(4)}°N, {pos.lon.toFixed(4)}°E
                  </p>
                </div>
                {pos.destination && (
                  <div>
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Tujuan AIS</p>
                    <p className="text-sm text-slate-800 mt-0.5">{pos.destination}</p>
                  </div>
                )}
                {pos.eta && (
                  <div>
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">ETA dari AIS</p>
                    <p className="text-sm font-semibold text-brand-700 mt-0.5">
                      {new Date(pos.eta).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Data terakhir</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {new Date(pos.timestamp).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            </div>

            {/* ETA comparison */}
            {(data?.eta || currentEta) && (
              <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200">
                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">ETA Shipment</p>
                <div className="flex items-center gap-3">
                  <div>
                    <p className="text-xs text-slate-400">Sistem</p>
                    <p className="text-sm font-semibold text-slate-800">
                      {data?.eta ? new Date(data.eta).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                    </p>
                  </div>
                  {data?.etaUpdatedAt && (
                    <>
                      <ArrowRight className="w-3 h-3 text-slate-400 shrink-0" />
                      <div>
                        <p className="text-[10px] text-slate-400">Diperbarui</p>
                        <p className="text-xs text-slate-500">
                          {new Date(data.etaUpdatedAt).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Simulation warning */}
            {pos.provider === 'simulation' && (
              <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3.5 py-2.5">
                <Info className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700 leading-relaxed">
                  Mode simulasi aktif. Set <code className="bg-amber-100 px-1 rounded text-[10px]">VESSEL_FINDER_API_KEY</code> di env untuk tracking real-time.
                  <a href="https://apidocs.vesselfinder.com" target="_blank" rel="noopener noreferrer"
                    className="ml-1 font-semibold hover:underline">Daftar VesselFinder →</a>
                </p>
              </div>
            )}

            {/* Link ke VesselFinder */}
            <div className="flex items-center justify-between pt-1">
              <p className="text-[10px] text-slate-400">Tracking via AIS (Automatic Identification System)</p>
              {vesselName && (
                <a
                  href={`https://www.vesselfinder.com/vessels?name=${encodeURIComponent(vesselName)}`}
                  target="_blank" rel="noopener noreferrer"
                  className="text-[10px] text-brand-500 hover:underline flex items-center gap-1"
                >
                  VesselFinder <ExternalLink className="w-2.5 h-2.5" />
                </a>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
