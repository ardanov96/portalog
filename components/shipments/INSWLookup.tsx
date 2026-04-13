'use client'

import { useState, useCallback } from 'react'
import { cn } from '@/lib/utils'
import {
  ExternalLink, AlertCircle, CheckCircle2, Copy,
  Search, FileText, Edit3, Save, X, Info,
  Loader2, Hash, ArrowRight, Clock,
} from 'lucide-react'

// ─── Constants ────────────────────────────────────────────────────────────────

// Format nomor aju: 26 digit, e.g. 11010000002520180726001236
// Breakdown: kode kantor (6) + kode seri (4) + tahun (4) + tanggal (8) + urutan (4)
const NOAJU_LENGTH   = 26
const NOAJU_REGEX    = /^\d{26}$/
const INSW_PIB_URL   = (noaju: string) =>
  `https://insw.go.id/pib-peb?dokumen=pib&noaju=${noaju}`
const INSW_PEB_URL   = (noaju: string) =>
  `https://insw.go.id/pib-peb?dokumen=peb&noaju=${noaju}`
const APPS1_PIB_URL  = (noaju: string) =>
  `https://apps1.insw.go.id/tracking/index.php?dokumen=pib&noaju=${noaju}`
const APPS1_PEB_URL  = (noaju: string) =>
  `https://apps1.insw.go.id/tracking/index.php?dokumen=peb&noaju=${noaju}`

// ─── Types ────────────────────────────────────────────────────────────────────

type DocType = 'PIB' | 'PEB'

interface LookupHistoryItem {
  noaju:    string
  type:     DocType
  label?:   string
  checkedAt: string
}

const HISTORY_KEY = 'fos_insw_history'
const MAX_HISTORY = 10

function getHistory(): LookupHistoryItem[] {
  if (typeof window === 'undefined') return []
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) ?? '[]') } catch { return [] }
}

function addHistory(item: LookupHistoryItem) {
  const prev    = getHistory().filter(h => h.noaju !== item.noaju)
  const updated = [item, ...prev].slice(0, MAX_HISTORY)
  localStorage.setItem(HISTORY_KEY, JSON.stringify(updated))
}

// ─── Format nomor aju ─────────────────────────────────────────────────────────

function formatNoAju(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, NOAJU_LENGTH)
  // Format tampilan: 110100 · 0000 · 25 · 20250312 · 0001 (visual grouping)
  if (digits.length <= 6)  return digits
  if (digits.length <= 10) return `${digits.slice(0, 6)} ${digits.slice(6)}`
  if (digits.length <= 12) return `${digits.slice(0, 6)} ${digits.slice(6, 10)} ${digits.slice(10)}`
  if (digits.length <= 20) return `${digits.slice(0, 6)} ${digits.slice(6, 10)} ${digits.slice(10, 12)} ${digits.slice(12)}`
  return `${digits.slice(0, 6)} ${digits.slice(6, 10)} ${digits.slice(10, 12)} ${digits.slice(12, 20)} ${digits.slice(20)}`
}

function parseNoAju(formatted: string): string {
  return formatted.replace(/\D/g, '')
}

function validateNoAju(noaju: string): string | null {
  const digits = noaju.replace(/\D/g, '')
  if (digits.length === 0)             return null
  if (digits.length < NOAJU_LENGTH)    return `Nomor aju harus 26 digit (baru ${digits.length})`
  if (!NOAJU_REGEX.test(digits))       return 'Hanya boleh angka'
  // Basic sanity: kode kantor harus 6 digit dimulai dari 11 (DJBC)
  if (!digits.startsWith('1'))         return 'Kode kantor tidak valid (harus diawali 1)'
  return null
}

// Dekode informasi dari nomor aju
function decodeNoAju(noaju: string): { kantorBc: string; tahun: string; tanggal: string } | null {
  const d = noaju.replace(/\D/g, '')
  if (d.length !== 26) return null
  try {
    const kantor = d.slice(0, 6)
    const tahun  = d.slice(10, 12)
    const tgl    = d.slice(12, 20)
    const year   = parseInt(tahun) + 2000
    const date   = `${tgl.slice(6, 8)}/${tgl.slice(4, 6)}/${tgl.slice(0, 4)}`
    return { kantorBc: kantor, tahun: String(year), tanggal: date }
  } catch { return null }
}

// ─── Kantor BC lookup (partial) ───────────────────────────────────────────────

const KANTOR_BC: Record<string, string> = {
  '110100': 'KPPBC TMP Tanjung Priok',
  '110101': 'KPPBC TMP A Tanjung Priok 1',
  '110102': 'KPPBC TMP A Tanjung Priok 2',
  '110200': 'KPPBC TMP Tanjung Emas (Semarang)',
  '110300': 'KPPBC TMP A Tanjung Perak (Surabaya)',
  '110400': 'KPPBC TMP Belawan (Medan)',
  '110500': 'KPPBC TMP Batu Ampar (Batam)',
  '110600': 'KPPBC TMP Makassar',
  '110700': 'KPPBC TMP A Bandara Soekarno-Hatta',
  '110800': 'KPPBC TMP Ngurah Rai (Bali)',
  '110900': 'KPPBC TMP Juanda (Surabaya)',
  '111000': 'KPPBC Madya Pasar Baru',
  '111100': 'KPPBC TMP Merak',
  '111200': 'KPPBC TMP Pontianak',
  '111300': 'KPPBC TMP Palembang',
  '111400': 'KPPBC TMP Samarinda',
}

function getKantorName(code: string): string {
  return KANTOR_BC[code] ?? `Kantor BC ${code}`
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }
  return (
    <button onClick={copy}
      className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all"
      title="Salin">
      {copied
        ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
        : <Copy className="w-3.5 h-3.5" />
      }
    </button>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

interface INSWLookupProps {
  shipmentId:  string
  pibNo?:      string | null
  pebNo?:      string | null
  shipmentType: 'EXPORT' | 'IMPORT' | string  // EXPORT → PEB relevant, IMPORT → PIB relevant
  referenceNo: string
  onSaved?:    (pibNo: string | null, pebNo: string | null) => void
}

export function INSWLookup({
  shipmentId, pibNo, pebNo, shipmentType, referenceNo, onSaved,
}: INSWLookupProps) {
  const isExport = shipmentType === 'EXPORT'

  const [mode, setMode]           = useState<'view' | 'edit'>('view')
  const [editPib, setEditPib]     = useState(pibNo ?? '')
  const [editPeb, setEditPeb]     = useState(pebNo ?? '')
  const [pibErr, setPibErr]       = useState('')
  const [pebErr, setPebErr]       = useState('')
  const [saving, setSaving]       = useState(false)
  const [saved, setSaved]         = useState(false)
  const [history, setHistory]     = useState<LookupHistoryItem[]>(() => getHistory())
  const [showHistory, setShowHistory] = useState(false)

  // Derived — current stored values (use local edit state when saved)
  const [curPib, setCurPib] = useState(pibNo ?? '')
  const [curPeb, setCurPeb] = useState(pebNo ?? '')

  const pibDigits = parseNoAju(curPib)
  const pebDigits = parseNoAju(curPeb)
  const hasPib    = NOAJU_REGEX.test(pibDigits)
  const hasPeb    = NOAJU_REGEX.test(pebDigits)

  const pibDecoded = hasPib ? decodeNoAju(pibDigits) : null
  const pebDecoded = hasPeb ? decodeNoAju(pebDigits) : null

  const startEdit = () => {
    setEditPib(curPib)
    setEditPeb(curPeb)
    setPibErr('')
    setPebErr('')
    setMode('edit')
  }

  const cancelEdit = () => {
    setMode('view')
    setPibErr('')
    setPebErr('')
  }

  const handleSave = async () => {
    const pibRaw = parseNoAju(editPib)
    const pebRaw = parseNoAju(editPeb)

    let hasErr = false
    if (pibRaw) {
      const e = validateNoAju(pibRaw)
      if (e) { setPibErr(e); hasErr = true }
      else setPibErr('')
    }
    if (pebRaw) {
      const e = validateNoAju(pebRaw)
      if (e) { setPebErr(e); hasErr = true }
      else setPebErr('')
    }
    if (hasErr) return

    setSaving(true)
    try {
      const res = await fetch(`/api/shipments/${shipmentId}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          pibNo: pibRaw || null,
          pebNo: pebRaw || null,
        }),
      })
      if (!res.ok) throw new Error('Gagal menyimpan')

      setCurPib(pibRaw)
      setCurPeb(pebRaw)
      onSaved?.(pibRaw || null, pebRaw || null)
      setMode('view')
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch {
      setPibErr('Gagal menyimpan — coba lagi')
    } finally {
      setSaving(false)
    }
  }

  const openINSW = (type: DocType, noaju: string) => {
    const url = type === 'PIB' ? INSW_PIB_URL(noaju) : INSW_PEB_URL(noaju)
    window.open(url, '_blank', 'noopener,noreferrer')
    const item: LookupHistoryItem = {
      noaju, type, label: referenceNo,
      checkedAt: new Date().toISOString(),
    }
    addHistory(item)
    setHistory(getHistory())
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">

      {/* Header */}
      <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Hash className="w-4 h-4 text-slate-500" />
          <h3 className="text-sm font-semibold text-slate-800">INSW — Cek Status PIB / PEB</h3>
          {saved && (
            <span className="text-[10px] font-semibold text-green-700 bg-green-50 px-2 py-0.5 rounded-full border border-green-200">
              Tersimpan ✓
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={() => setShowHistory(p => !p)}
            className={cn('p-1.5 rounded-lg transition-all text-slate-400 hover:bg-slate-100',
              showHistory && 'bg-slate-100 text-slate-600')}>
            <Clock className="w-3.5 h-3.5" />
          </button>
          {mode === 'view'
            ? <button onClick={startEdit}
                className="p-1.5 rounded-lg text-slate-400 hover:text-brand-600 hover:bg-brand-50 transition-all">
                <Edit3 className="w-3.5 h-3.5" />
              </button>
            : <button onClick={cancelEdit}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all">
                <X className="w-3.5 h-3.5" />
              </button>
          }
        </div>
      </div>

      <div className="p-5 space-y-4">

        {/* Info banner — jujur soal keterbatasan */}
        <div className="flex items-start gap-2.5 bg-blue-50 border border-blue-200 rounded-xl px-3.5 py-2.5">
          <Info className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" />
          <p className="text-xs text-blue-700 leading-relaxed">
            INSW tidak menyediakan API publik. Fitur ini menyimpan nomor aju dan membuka portal INSW resmi di tab baru dengan nomor terisi otomatis — Anda tetap perlu input captcha di situs INSW.
          </p>
        </div>

        {/* Edit mode */}
        {mode === 'edit' && (
          <div className="space-y-3 bg-slate-50 rounded-xl p-4 border border-slate-200">
            <p className="text-xs font-semibold text-slate-600">Nomor Aju (26 digit tanpa karakter)</p>

            {/* PIB */}
            <div>
              <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                No. PIB {isExport ? '' : '(Impor)'}</label>
              <div className="mt-1 flex items-center gap-2">
                <input
                  value={formatNoAju(editPib)}
                  onChange={e => {
                    setEditPib(parseNoAju(e.target.value))
                    setPibErr('')
                  }}
                  placeholder="110100 0000 25 20250312 0001"
                  maxLength={32}
                  className={cn(
                    'flex-1 px-3 py-2 text-sm border rounded-lg font-mono bg-white focus:outline-none focus:ring-2 transition-all',
                    pibErr
                      ? 'border-red-300 focus:ring-red-500/20'
                      : 'border-slate-200 focus:ring-brand-500/20'
                  )}
                />
              </div>
              {pibErr && <p className="text-xs text-red-600 mt-1">{pibErr}</p>}
            </div>

            {/* PEB */}
            <div>
              <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                No. PEB {isExport ? '(Ekspor)' : ''}</label>
              <div className="mt-1 flex items-center gap-2">
                <input
                  value={formatNoAju(editPeb)}
                  onChange={e => {
                    setEditPeb(parseNoAju(e.target.value))
                    setPebErr('')
                  }}
                  placeholder="110100 0000 25 20250312 0001"
                  maxLength={32}
                  className={cn(
                    'flex-1 px-3 py-2 text-sm border rounded-lg font-mono bg-white focus:outline-none focus:ring-2 transition-all',
                    pebErr
                      ? 'border-red-300 focus:ring-red-500/20'
                      : 'border-slate-200 focus:ring-brand-500/20'
                  )}
                />
              </div>
              {pebErr && <p className="text-xs text-red-600 mt-1">{pebErr}</p>}
            </div>

            <p className="text-[10px] text-slate-400">
              Format: 6 digit kode kantor + 4 digit kode seri + 2 digit tahun + 8 digit tanggal + 6 digit urutan
            </p>

            <div className="flex gap-2 pt-1">
              <button onClick={cancelEdit}
                className="flex-1 py-2 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-100 transition-all">
                Batal
              </button>
              <button onClick={handleSave} disabled={saving}
                className="flex-1 py-2 rounded-lg bg-brand-600 text-white text-xs font-semibold hover:bg-brand-700 disabled:opacity-60 flex items-center justify-center gap-1.5 transition-all">
                {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                Simpan
              </button>
            </div>
          </div>
        )}

        {/* View mode — PIB card */}
        {mode === 'view' && (
          <div className="space-y-3">

            {/* PIB */}
            <div className={cn(
              'rounded-xl border p-3.5',
              hasPib ? 'border-slate-200 bg-white' : 'border-dashed border-slate-200 bg-slate-50'
            )}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">PIB</span>
                  <span className="text-[10px] text-slate-400">Pemberitahuan Impor Barang</span>
                </div>
                {hasPib && <CopyButton text={pibDigits} />}
              </div>

              {hasPib ? (
                <>
                  <p className="font-mono text-sm font-semibold text-slate-800 mb-1">
                    {formatNoAju(pibDigits)}
                  </p>
                  {pibDecoded && (
                    <p className="text-[10px] text-slate-400 mb-3">
                      {getKantorName(pibDecoded.kantorBc)} · Tgl {pibDecoded.tanggal}
                    </p>
                  )}
                  <div className="flex gap-2">
                    <button
                      onClick={() => openINSW('PIB', pibDigits)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-brand-600 text-white text-xs font-semibold hover:bg-brand-700 transition-all"
                    >
                      <Search className="w-3 h-3" />
                      Cek di INSW
                      <ExternalLink className="w-3 h-3 opacity-70" />
                    </button>
                    <a
                      href={APPS1_PIB_URL(pibDigits)}
                      target="_blank" rel="noopener noreferrer"
                      className="px-3 py-2 rounded-lg border border-slate-200 text-xs text-slate-500 hover:bg-slate-50 transition-all flex items-center gap-1"
                    >
                      apps1 <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-between">
                  <p className="text-xs text-slate-400">Nomor PIB belum diisi</p>
                  <button onClick={startEdit}
                    className="text-xs text-brand-600 font-semibold hover:underline flex items-center gap-1">
                    <Edit3 className="w-3 h-3" /> Isi
                  </button>
                </div>
              )}
            </div>

            {/* PEB */}
            <div className={cn(
              'rounded-xl border p-3.5',
              hasPeb ? 'border-slate-200 bg-white' : 'border-dashed border-slate-200 bg-slate-50'
            )}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">PEB</span>
                  <span className="text-[10px] text-slate-400">Pemberitahuan Ekspor Barang</span>
                </div>
                {hasPeb && <CopyButton text={pebDigits} />}
              </div>

              {hasPeb ? (
                <>
                  <p className="font-mono text-sm font-semibold text-slate-800 mb-1">
                    {formatNoAju(pebDigits)}
                  </p>
                  {pebDecoded && (
                    <p className="text-[10px] text-slate-400 mb-3">
                      {getKantorName(pebDecoded.kantorBc)} · Tgl {pebDecoded.tanggal}
                    </p>
                  )}
                  <div className="flex gap-2">
                    <button
                      onClick={() => openINSW('PEB', pebDigits)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition-all"
                    >
                      <Search className="w-3 h-3" />
                      Cek di INSW
                      <ExternalLink className="w-3 h-3 opacity-70" />
                    </button>
                    <a
                      href={APPS1_PEB_URL(pebDigits)}
                      target="_blank" rel="noopener noreferrer"
                      className="px-3 py-2 rounded-lg border border-slate-200 text-xs text-slate-500 hover:bg-slate-50 transition-all flex items-center gap-1"
                    >
                      apps1 <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-between">
                  <p className="text-xs text-slate-400">Nomor PEB belum diisi</p>
                  <button onClick={startEdit}
                    className="text-xs text-emerald-600 font-semibold hover:underline flex items-center gap-1">
                    <Edit3 className="w-3 h-3" /> Isi
                  </button>
                </div>
              )}
            </div>

            {/* Empty state */}
            {!hasPib && !hasPeb && (
              <div className="text-center py-2">
                <p className="text-xs text-slate-400">
                  Klik ikon edit di atas untuk mengisi nomor aju PIB/PEB dari shipment ini
                </p>
              </div>
            )}
          </div>
        )}

        {/* History */}
        {showHistory && (
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-3.5 py-2.5 bg-slate-50 border-b border-slate-200">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Riwayat cek terakhir
              </p>
            </div>
            {history.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-4">Belum ada riwayat</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {history.slice(0, 5).map((h, i) => (
                  <div key={i} className="flex items-center gap-3 px-3.5 py-2.5">
                    <span className={cn(
                      'text-[10px] font-bold px-1.5 py-0.5 rounded',
                      h.type === 'PIB' ? 'bg-blue-50 text-blue-700' : 'bg-emerald-50 text-emerald-700'
                    )}>
                      {h.type}
                    </span>
                    <p className="font-mono text-xs text-slate-700 flex-1 truncate">{formatNoAju(h.noaju)}</p>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <p className="text-[10px] text-slate-400">
                        {new Date(h.checkedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                      </p>
                      <button
                        onClick={() => openINSW(h.type, h.noaju)}
                        className="p-1 rounded text-slate-400 hover:text-brand-600 transition-all">
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Help links */}
        <div className="flex items-center justify-between pt-1 border-t border-slate-100">
          <p className="text-[10px] text-slate-400">Portal resmi INSW — LNSW Kemenkeu RI</p>
          <div className="flex items-center gap-3">
            <a href="https://insw.go.id/pib-peb" target="_blank" rel="noopener noreferrer"
              className="text-[10px] text-brand-500 hover:underline flex items-center gap-0.5">
              Portal INSW <ExternalLink className="w-2.5 h-2.5" />
            </a>
            <a href="https://reg.insw.go.id" target="_blank" rel="noopener noreferrer"
              className="text-[10px] text-slate-400 hover:underline flex items-center gap-0.5">
              Registrasi <ExternalLink className="w-2.5 h-2.5" />
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
