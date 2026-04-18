'use client'

import { useState, useEffect } from 'react'
import type { BrandingConfig } from '@/lib/white-label'
import { Ship, Plane, Truck, MapPin, Calendar, FileText,
  LogOut, Package, CheckCircle2, Clock, ChevronDown,
  ChevronUp, Phone, Mail, MessageCircle, Eye, ExternalLink,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_CFG: Record<string, { label: string; desc: string }> = {
  DRAFT:              { label: 'Disiapkan',           desc: 'Shipment sedang disiapkan' },
  BOOKING_CONFIRMED:  { label: 'Booking Dikonfirmasi', desc: 'Booking telah dikonfirmasi' },
  DOCS_IN_PROGRESS:   { label: 'Dokumen Diproses',    desc: 'Dokumen sedang dipersiapkan' },
  CUSTOMS_PROCESSING: { label: 'Proses Bea Cukai',    desc: 'Sedang diproses bea cukai' },
  CARGO_RELEASED:     { label: 'Kargo Dilepaskan',    desc: 'Kargo telah dilepaskan bea cukai' },
  IN_TRANSIT:         { label: 'Dalam Perjalanan',    desc: 'Kargo sedang dalam perjalanan' },
  ARRIVED:            { label: 'Telah Tiba',          desc: 'Kargo telah tiba di tujuan' },
  DELIVERED:          { label: 'Terkirim',            desc: 'Kargo telah dikirim ke tujuan akhir' },
  COMPLETED:          { label: 'Selesai',             desc: 'Proses pengiriman selesai' },
  CANCELLED:          { label: 'Dibatalkan',          desc: 'Shipment dibatalkan' },
}

const STATUS_ORDER = [
  'BOOKING_CONFIRMED','DOCS_IN_PROGRESS','CUSTOMS_PROCESSING',
  'CARGO_RELEASED','IN_TRANSIT','ARRIVED','DELIVERED','COMPLETED',
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(d?: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
}

function hex(s: string) { return s.startsWith('#') ? s : `#${s}` }

// ─── Logo component ───────────────────────────────────────────────────────────

function BrandLogo({ branding, size = 32 }: { branding: BrandingConfig; size?: number }) {
  if (branding.logoUrl) {
    return <img src={branding.logoUrl} alt={branding.brandName} style={{ height: size, maxWidth: 160, objectFit: 'contain' }} />
  }
  // Text logo fallback
  return (
    <span style={{ fontSize: Math.round(size * 0.55), fontWeight: 700, color: hex(branding.primaryColor) }}>
      {branding.brandName}
    </span>
  )
}

// ─── Progress bar ─────────────────────────────────────────────────────────────

function ProgressBar({ status, primaryColor }: { status: string; primaryColor: string }) {
  const idx     = STATUS_ORDER.indexOf(status)
  const pct     = idx < 0 ? 0 : Math.round((idx + 1) / STATUS_ORDER.length * 100)
  const isCanc  = status === 'CANCELLED'

  return (
    <div>
      <div style={{ height: 6, background: '#e2e8f0', borderRadius: 999, overflow: 'hidden' }}>
        <div style={{
          height: '100%', borderRadius: 999, transition: 'width 0.6s',
          background: isCanc ? '#ef4444' : hex(primaryColor),
          width: `${isCanc ? 100 : pct}%`,
        }} />
      </div>
      <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>
        {isCanc ? 'Dibatalkan' : `${pct}% selesai`}
      </p>
    </div>
  )
}

// ─── Shipment card ────────────────────────────────────────────────────────────

function ShipmentCard({ s, branding }: { s: any; branding: BrandingConfig }) {
  const [open, setOpen] = useState(false)
  const cfg   = STATUS_CFG[s.status] ?? STATUS_CFG.DRAFT
  const isLate = s.eta && new Date(s.eta) < new Date() && !['COMPLETED','DELIVERED','CANCELLED'].includes(s.status)

  const ModeIcon = s.mode === 'AIR' ? Plane : s.mode === 'LAND' ? Truck : Ship

  return (
    <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, overflow: 'hidden', marginBottom: 12 }}>
      {/* Header */}
      <div style={{ padding: '16px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, flexWrap: 'wrap' }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12, flexShrink: 0,
            background: `${hex(branding.primaryColor)}15`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <ModeIcon size={20} color={hex(branding.primaryColor)} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
              <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#1e293b', fontSize: 14 }}>
                {s.referenceNo}
              </span>
              <span style={{
                fontSize: 11, fontWeight: 700, padding: '2px 10px', borderRadius: 999,
                background: isLate ? '#fef2f2' : `${hex(branding.primaryColor)}15`,
                color: isLate ? '#dc2626' : hex(branding.primaryColor),
              }}>
                {isLate ? '⚠ Terlambat' : cfg.label}
              </span>
            </div>
            <div style={{ fontSize: 12, color: '#64748b', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {(s.originPort || s.destinationPort) && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <MapPin size={12} />
                  {s.originPort || '—'} → {s.destinationPort || '—'}
                </span>
              )}
              {s.eta && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: isLate ? '#dc2626' : '#64748b' }}>
                  <Calendar size={12} />
                  ETA {fmtDate(s.eta)}
                </span>
              )}
            </div>
          </div>
          <button onClick={() => setOpen(p => !p)} style={{
            padding: 8, border: '1px solid #e2e8f0', borderRadius: 8, background: 'transparent',
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
            fontSize: 12, color: '#64748b',
          }}>
            {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            {open ? 'Tutup' : 'Detail'}
          </button>
        </div>

        {/* Progress */}
        <div style={{ marginTop: 12 }}>
          <ProgressBar status={s.status} primaryColor={branding.primaryColor} />
        </div>
      </div>

      {/* Expanded detail */}
      {open && (
        <div style={{ padding: '0 20px 20px', borderTop: '1px solid #f1f5f9', paddingTop: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 16 }}>
            {[
              { label: 'Jenis', value: s.type === 'EXPORT' ? 'Ekspor' : 'Impor' },
              { label: 'Moda', value: s.mode?.replace('_',' ') },
              { label: 'ETD', value: fmtDate(s.etd) },
              { label: 'ETA', value: fmtDate(s.eta) },
              { label: 'Vessel', value: s.vesselName || '—' },
              { label: 'Kargo', value: s.cargoDescription || '—' },
            ].map(row => (
              <div key={row.label} style={{ background: '#f8fafc', borderRadius: 8, padding: '8px 12px' }}>
                <p style={{ fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>{row.label}</p>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>{row.value || '—'}</p>
              </div>
            ))}
          </div>

          {/* Dokumen */}
          {branding.showDocuments && s.documents?.length > 0 && (
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Dokumen</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {s.documents.filter((d: any) => d.isVisibleToClient && d.fileUrl).map((d: any) => (
                  <a key={d.id} href={d.fileUrl} target="_blank" rel="noopener noreferrer" style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px',
                    borderRadius: 8, background: '#f1f5f9', border: '1px solid #e2e8f0',
                    fontSize: 12, fontWeight: 600, color: hex(branding.primaryColor), textDecoration: 'none',
                  }}>
                    <FileText size={12} />
                    {d.name}
                    <ExternalLink size={10} />
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Timeline */}
          {branding.showTimeline && s.statusHistory?.length > 0 && (
            <div style={{ marginTop: 14 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Timeline</p>
              <div style={{ position: 'relative', paddingLeft: 20 }}>
                <div style={{ position: 'absolute', left: 7, top: 8, bottom: 0, width: 1, background: '#e2e8f0' }} />
                {s.statusHistory.slice(0, 5).map((h: any, i: number) => (
                  <div key={i} style={{ position: 'relative', marginBottom: 10, display: 'flex', gap: 10 }}>
                    <div style={{
                      width: 12, height: 12, borderRadius: '50%', flexShrink: 0,
                      background: i === 0 ? hex(branding.primaryColor) : '#e2e8f0',
                      marginTop: 2,
                    }} />
                    <div>
                      <p style={{ fontSize: 12, fontWeight: 600, color: '#1e293b' }}>
                        {STATUS_CFG[h.toStatus]?.label ?? h.toStatus}
                      </p>
                      <p style={{ fontSize: 11, color: '#94a3b8' }}>{fmtDate(h.changedAt)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Main portal ──────────────────────────────────────────────────────────────

interface Props { branding: BrandingConfig; cssVars: string; preview?: boolean }

export function WLPortalClient({ branding, cssVars, preview }: Props) {
  const [step, setStep]         = useState<'login' | 'portal'>('login')
  const [loginForm, setLogin]   = useState({ email: '', password: '' })
  const [loginErr, setLoginErr] = useState('')
  const [loginLoading, setLoginLoading] = useState(false)
  const [shipments, setShipments] = useState<any[]>([])
  const [clientName, setClientName] = useState('')

  const p = hex(branding.primaryColor)
  const a = hex(branding.accentColor)

  const doLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (preview) { setStep('portal'); setClientName('Preview Mode'); setShipments([]); return }
    setLoginErr(''); setLoginLoading(true)
    try {
      const res  = await fetch('/api/portal/auth', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginForm),
      })
      const data = await res.json()
      if (!data.success) { setLoginErr(data.error || 'Login gagal'); return }

      setClientName(data.data.name)
      const sr = await fetch('/api/portal/tracking')
      const sd = await sr.json()
      if (sd.success) setShipments(sd.data)
      setStep('portal')
    } catch { setLoginErr('Kesalahan koneksi') }
    finally { setLoginLoading(false) }
  }

  const doLogout = async () => {
    await fetch('/api/portal/auth', { method: 'DELETE' })
    setStep('login'); setShipments([])
  }

  return (
    <>
      {/* Inject CSS vars + Google Font */}
      <style>{`
        :root { ${cssVars} }
        body { font-family: var(--wl-font, system-ui, sans-serif); background: var(--wl-bg, #f8fafc); margin: 0; }
      `}</style>

      {preview && (
        <div style={{ background: '#fef3c7', borderBottom: '1px solid #fcd34d', padding: '8px 20px', fontSize: 12, color: '#92400e', textAlign: 'center' }}>
          Mode Preview — Tampilan ini akan dilihat klien Anda di domain custom
        </div>
      )}

      {/* Top nav */}
      <nav style={{ background: '#fff', borderBottom: '1px solid #e2e8f0', padding: '0 5vw', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 56 }}>
        <BrandLogo branding={branding} size={32} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {step === 'portal' && (
            <>
              <span style={{ fontSize: 13, color: '#64748b' }}>{clientName}</span>
              <button onClick={doLogout} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', border: '1px solid #e2e8f0', borderRadius: 8, background: 'transparent', cursor: 'pointer', fontSize: 12, color: '#64748b' }}>
                <LogOut size={13} /> Keluar
              </button>
            </>
          )}
        </div>
      </nav>

      <main style={{ maxWidth: 680, margin: '0 auto', padding: '40px 5vw' }}>

        {/* Login */}
        {step === 'login' && (
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 20, padding: 32 }}>
            <div style={{ textAlign: 'center', marginBottom: 28 }}>
              <div style={{ marginBottom: 16 }}>
                <BrandLogo branding={branding} size={48} />
              </div>
              <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1e293b', margin: '0 0 6px' }}>
                {branding.portalTitle}
              </h1>
              <p style={{ fontSize: 14, color: '#64748b', margin: 0 }}>{branding.portalWelcome}</p>
            </div>

            <form onSubmit={doLogin} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {loginErr && (
                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#dc2626' }}>
                  {loginErr}
                </div>
              )}
              {[
                { key: 'email', label: 'Email', type: 'email', placeholder: 'email@perusahaan.com' },
                { key: 'password', label: 'Password', type: 'password', placeholder: '••••••••' },
              ].map(f => (
                <div key={f.key}>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>{f.label}</label>
                  <input
                    type={f.type} required placeholder={f.placeholder}
                    value={(loginForm as any)[f.key]}
                    onChange={e => setLogin(p => ({ ...p, [f.key]: e.target.value }))}
                    style={{ width: '100%', padding: '12px 14px', border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
              ))}
              <button type="submit" disabled={loginLoading} style={{
                padding: '13px', borderRadius: 10, border: 'none', background: p,
                color: '#fff', fontWeight: 700, fontSize: 15, cursor: 'pointer', marginTop: 4,
                opacity: loginLoading ? 0.7 : 1,
              }}>
                {loginLoading ? 'Masuk...' : 'Masuk ke Portal'}
              </button>
            </form>

            {/* Support */}
            {(branding.supportEmail || branding.supportWhatsapp) && (
              <div style={{ marginTop: 24, paddingTop: 18, borderTop: '1px solid #f1f5f9', display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
                {branding.supportEmail && (
                  <a href={`mailto:${branding.supportEmail}`} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#64748b', textDecoration: 'none' }}>
                    <Mail size={13} /> {branding.supportEmail}
                  </a>
                )}
                {branding.supportWhatsapp && (
                  <a href={`https://wa.me/${branding.supportWhatsapp.replace(/\D/g,'')}`} target="_blank" rel="noopener noreferrer"
                    style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#64748b', textDecoration: 'none' }}>
                    <MessageCircle size={13} /> WhatsApp
                  </a>
                )}
              </div>
            )}
          </div>
        )}

        {/* Portal setelah login */}
        {step === 'portal' && (
          <>
            <div style={{ marginBottom: 24 }}>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1e293b', margin: '0 0 4px' }}>
                Selamat datang, {clientName}
              </h2>
              <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>
                {shipments.length} pengiriman aktif
              </p>
            </div>

            {preview && (
              <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 12, padding: '12px 16px', marginBottom: 16, fontSize: 13, color: '#1d4ed8' }}>
                Preview mode — Data shipment klien akan muncul di sini setelah login nyata
              </div>
            )}

            {shipments.length === 0 && !preview ? (
              <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, padding: 40, textAlign: 'center' }}>
                <Package size={40} style={{ color: '#e2e8f0', margin: '0 auto 12px' }} />
                <p style={{ fontWeight: 600, color: '#94a3b8', margin: 0 }}>Tidak ada pengiriman aktif</p>
              </div>
            ) : (
              shipments.map(s => <ShipmentCard key={s.id} s={s} branding={branding} />)
            )}

            {preview && (
              <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, padding: 20, opacity: 0.5 }}>
                <div style={{ display: 'flex', gap: 14 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: '#f1f5f9' }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ height: 14, background: '#f1f5f9', borderRadius: 4, width: '60%', marginBottom: 8 }} />
                    <div style={{ height: 10, background: '#f1f5f9', borderRadius: 4, width: '40%' }} />
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* Footer */}
        <div style={{ marginTop: 40, textAlign: 'center' }}>
          {branding.portalFooter && (
            <p style={{ fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>{branding.portalFooter}</p>
          )}
          {branding.showPoweredBy && (
            <p style={{ fontSize: 11, color: '#cbd5e1', margin: 0 }}>
              Powered by{' '}
              <a href="https://forwarderos.id" target="_blank" rel="noopener noreferrer" style={{ color: '#94a3b8', textDecoration: 'none', fontWeight: 600 }}>
                ForwarderOS
              </a>
            </p>
          )}
        </div>
      </main>
    </>
  )
}
