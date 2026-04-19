'use client'

import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import {
  Globe, Palette, Type, Settings2, Eye, Copy, Check,
  CheckCircle2, AlertCircle, Clock, Loader2, Save,
  ExternalLink, Info, RefreshCw, Trash2, Image,
  MessageCircle, Mail, Phone, ChevronRight,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface WLConfig {
  id?:              string
  status:           string   // PENDING | ACTIVE | SUSPENDED
  customDomain?:    string | null
  domainVerifiedAt?:string | null
  domainVerifyToken?:string | null
  brandName?:       string | null
  logoUrl?:         string | null
  faviconUrl?:      string | null
  primaryColor?:    string | null
  accentColor?:     string | null
  fontFamily?:      string | null
  portalTitle?:     string | null
  portalWelcome?:   string | null
  portalFooter?:    string | null
  supportEmail?:    string | null
  supportPhone?:    string | null
  supportWhatsapp?: string | null
  showPoweredBy?:   boolean
  showChatbot?:     boolean
  showDocuments?:   boolean
  showTimeline?:    boolean
  allowClientLogin?:boolean
  previewUrl?:      string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function ColorPicker({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const [text, setText] = useState(value)
  useEffect(() => { setText(value) }, [value])

  const apply = (raw: string) => {
    const clean = raw.replace('#','').toUpperCase()
    if (/^[0-9A-F]{6}$/i.test(clean)) { onChange(clean); setText(clean) }
  }

  return (
    <div>
      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">{label}</label>
      <div className="flex items-center gap-2">
        <input type="color" value={`#${value || '000000'}`}
          onChange={e => { const v = e.target.value.replace('#','').toUpperCase(); onChange(v); setText(v) }}
          className="w-10 h-10 rounded-xl border border-slate-200 cursor-pointer p-1 bg-white" />
        <div className="flex items-center gap-1 flex-1">
          <span className="text-slate-400 text-sm">#</span>
          <input type="text" value={text} maxLength={6}
            onChange={e => { const v = e.target.value.toUpperCase().replace(/[^0-9A-F]/g,''); setText(v); if (v.length===6) onChange(v) }}
            onBlur={e => apply(e.target.value)}
            className="flex-1 px-3 py-2 border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-500/20"
          />
        </div>
      </div>
    </div>
  )
}

function Toggle({ label, desc, checked, onChange }: { label: string; desc?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-slate-100 last:border-0">
      <div>
        <p className="text-sm font-medium text-slate-800">{label}</p>
        {desc && <p className="text-xs text-slate-400 mt-0.5">{desc}</p>}
      </div>
      <button onClick={() => onChange(!checked)}
        className={cn('relative w-11 h-6 rounded-full transition-colors shrink-0', checked ? 'bg-brand-600' : 'bg-slate-200')}>
        <span className={cn('absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform', checked ? 'left-6' : 'left-1')} />
      </button>
    </div>
  )
}

const FONT_OPTIONS = ['Inter', 'Plus Jakarta Sans', 'DM Sans', 'Outfit', 'Poppins', 'Nunito', 'Lato', 'Source Sans 3']

// ─── Section header ───────────────────────────────────────────────────────────

function SectionHeader({ icon: Icon, title, desc }: { icon: any; title: string; desc?: string }) {
  return (
    <div className="flex items-start gap-3 mb-5">
      <div className="w-9 h-9 rounded-xl bg-brand-50 flex items-center justify-center shrink-0">
        <Icon className="w-4.5 h-4.5 text-brand-600" />
      </div>
      <div>
        <h2 className="text-base font-semibold text-slate-800">{title}</h2>
        {desc && <p className="text-xs text-slate-500 mt-0.5">{desc}</p>}
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function WhiteLabelPage() {
  const [config, setConfig] = useState<WLConfig>({ status: 'PENDING', showPoweredBy: true, showChatbot: true, showDocuments: true, showTimeline: true, allowClientLogin: true })
  const [loading, setLoading]     = useState(true)
  const [saving, setSaving]       = useState(false)
  const [saved, setSaved]         = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [verifyResult, setVerifyResult] = useState<{ ok: boolean; msg: string } | null>(null)
  const [copied, setCopied]       = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'domain' | 'branding' | 'portal' | 'features'>('domain')

  const load = async () => {
    setLoading(true)
    try {
      const res  = await fetch('/api/white-label')
      const data = await res.json()
      if (data.success && data.data) setConfig(prev => ({ ...prev, ...data.data }))
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const save = async () => {
    setSaving(true); setSaved(false)
    const { id, status, domainVerifiedAt, domainVerifyToken, previewUrl, ...payload } = config
    try {
      const res  = await fetch('/api/white-label', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body:   JSON.stringify(payload),
      })
      const data = await res.json()
      if (data.success) { setSaved(true); setConfig(prev => ({ ...prev, ...data.data })); setTimeout(() => setSaved(false), 3000) }
    } finally { setSaving(false) }
  }

  const verifyDomain = async () => {
    setVerifying(true); setVerifyResult(null)
    try {
      const res  = await fetch('/api/white-label/verify-domain', { method: 'POST' })
      const data = await res.json()
      if (data.success) {
        setVerifyResult({ ok: true, msg: 'Domain berhasil diverifikasi!' })
        load()
      } else {
        setVerifyResult({ ok: false, msg: data.error })
      }
    } finally { setVerifying(false) }
  }

  const copyText = async (text: string, key: string) => {
    await navigator.clipboard.writeText(text)
    setCopied(key); setTimeout(() => setCopied(null), 2000)
  }

  const upd = (key: keyof WLConfig) => (val: any) => setConfig(p => ({ ...p, [key]: val }))

  const inp = (key: keyof WLConfig, placeholder?: string, type = 'text') => (
    <input type={type} placeholder={placeholder}
      value={(config[key] as string) ?? ''}
      onChange={e => upd(key)(e.target.value || null)}
      className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 bg-white"
    />
  )

  const isActive   = config.status === 'ACTIVE'
  const isVerified = !!config.domainVerifiedAt

  if (loading) return (
    <div className="flex items-center justify-center h-48 gap-2 text-slate-400">
      <Loader2 className="w-5 h-5 animate-spin" /> Memuat konfigurasi...
    </div>
  )

  return (
    <div className="max-w-3xl space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Globe className="w-6 h-6 text-brand-500" /> White-label Portal
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">Custom domain dan branding untuk portal klien Anda</p>
        </div>
        <div className="flex items-center gap-2">
          {config.previewUrl && (
            <a href={config.previewUrl} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-all">
              <Eye className="w-4 h-4" /> Preview
            </a>
          )}
          <button onClick={save} disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 disabled:opacity-60 transition-all">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            {saved ? 'Tersimpan!' : saving ? 'Menyimpan...' : 'Simpan'}
          </button>
        </div>
      </div>

      {/* Status banner */}
      <div className={cn(
        'flex items-center gap-3 px-4 py-3 rounded-2xl border',
        isActive ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'
      )}>
        {isActive
          ? <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
          : <Clock className="w-5 h-5 text-amber-600 shrink-0" />}
        <div className="flex-1">
          <p className={cn('text-sm font-semibold', isActive ? 'text-green-800' : 'text-amber-800')}>
            {isActive ? `Portal aktif di ${config.customDomain}` : 'Portal belum aktif — domain perlu diverifikasi'}
          </p>
          {!isActive && config.customDomain && (
            <p className="text-xs text-amber-700 mt-0.5">Tambahkan TXT record ke DNS domain Anda lalu klik "Verifikasi Domain"</p>
          )}
        </div>
        {isActive && (
          <a href={`https://${config.customDomain}`} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-green-700 font-semibold hover:underline shrink-0">
            Buka <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit flex-wrap">
        {([
          { key: 'domain',   label: 'Domain',   icon: Globe    },
          { key: 'branding', label: 'Branding', icon: Palette  },
          { key: 'portal',   label: 'Portal',   icon: Type     },
          { key: 'features', label: 'Fitur',    icon: Settings2 },
        ] as const).map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            className={cn('inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all',
              activeTab === t.key ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700')}>
            <t.icon className="w-3.5 h-3.5" /> {t.label}
          </button>
        ))}
      </div>

      {/* ── Tab: Domain ── */}
      {activeTab === 'domain' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
          <SectionHeader icon={Globe} title="Custom Domain" desc="Arahkan domain Anda ke portal klien white-label Portalog" />

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Domain</label>
            <input type="text" placeholder="portal.perusahaananda.co.id"
              value={config.customDomain ?? ''}
              onChange={e => upd('customDomain')(e.target.value || null)}
              className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 font-mono"
            />
            <p className="text-xs text-slate-400 mt-1.5">Hanya domain (tanpa https://). Contoh: portal.majulogistik.co.id</p>
          </div>

          {/* DNS instructions */}
          {config.customDomain && (
            <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 space-y-3">
              <p className="text-xs font-bold text-slate-600 uppercase tracking-wider">Konfigurasi DNS</p>

              <div className="space-y-2">
                <p className="text-xs text-slate-500 font-semibold">1. Tambahkan CNAME record:</p>
                <div className="flex items-center gap-2 bg-white rounded-lg border border-slate-200 px-3 py-2">
                  <div className="flex-1 grid grid-cols-3 gap-2 font-mono text-xs text-slate-700">
                    <span className="text-slate-400">Type</span>
                    <span className="text-slate-400">Name</span>
                    <span className="text-slate-400">Value</span>
                    <span className="font-bold">CNAME</span>
                    <span>{config.customDomain.split('.')[0]}</span>
                    <span className="truncate">cname.vercel-dns.com</span>
                  </div>
                  <button onClick={() => copyText('cname.vercel-dns.com', 'cname')} className="p-1 text-slate-400 hover:text-slate-600">
                    {copied === 'cname' ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>

                {config.domainVerifyToken && !isVerified && (
                  <>
                    <p className="text-xs text-slate-500 font-semibold mt-3">2. Tambahkan TXT record untuk verifikasi:</p>
                    <div className="flex items-center gap-2 bg-white rounded-lg border border-slate-200 px-3 py-2">
                      <div className="flex-1 font-mono text-xs text-slate-700 space-y-1">
                        <div className="grid grid-cols-3 gap-2">
                          <span className="text-slate-400">Type</span>
                          <span className="text-slate-400">Name</span>
                          <span className="text-slate-400">Value</span>
                          <span className="font-bold">TXT</span>
                          <span>@</span>
                          <span className="truncate" title={config.domainVerifyToken}>{config.domainVerifyToken}</span>
                        </div>
                      </div>
                      <button onClick={() => copyText(config.domainVerifyToken!, 'txt')} className="p-1 text-slate-400 hover:text-slate-600 shrink-0">
                        {copied === 'txt' ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </>
                )}

                {isVerified && (
                  <div className="flex items-center gap-2 bg-green-50 rounded-lg px-3 py-2 border border-green-100">
                    <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
                    <p className="text-xs text-green-700 font-semibold">Domain terverifikasi</p>
                  </div>
                )}
              </div>

              {!isVerified && config.customDomain && (
                <div className="pt-1">
                  <button onClick={verifyDomain} disabled={verifying}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 disabled:opacity-60 transition-all">
                    {verifying ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                    {verifying ? 'Memeriksa DNS...' : 'Verifikasi Domain'}
                  </button>
                  {verifyResult && (
                    <div className={cn('flex items-center gap-2 mt-3 text-sm px-3.5 py-2.5 rounded-xl',
                      verifyResult.ok ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-red-50 border border-red-200 text-red-700')}>
                      {verifyResult.ok ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                      {verifyResult.msg}
                    </div>
                  )}
                  <p className="text-xs text-slate-400 mt-2">Propagasi DNS bisa memakan waktu 1–48 jam setelah menambahkan record</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Branding ── */}
      {activeTab === 'branding' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
          <SectionHeader icon={Palette} title="Identitas Brand" desc="Logo, warna, dan tipografi portal klien Anda" />

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Nama Brand</label>
            {inp('brandName', 'PT Maju Logistik')}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">URL Logo</label>
            {inp('logoUrl', 'https://cdn.perusahaan.com/logo.png', 'url')}
            <p className="text-xs text-slate-400 mt-1">Gunakan URL Cloudflare R2 atau CDN Anda. Format: PNG/SVG dengan background transparan</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <ColorPicker label="Warna Utama" value={config.primaryColor ?? '1A3C34'} onChange={upd('primaryColor')} />
            <ColorPicker label="Warna Aksen" value={config.accentColor ?? 'C8953A'} onChange={upd('accentColor')} />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Font</label>
            <select value={config.fontFamily ?? 'Inter'} onChange={e => upd('fontFamily')(e.target.value)}
              className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 bg-white">
              {FONT_OPTIONS.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>

          {/* Color preview */}
          <div className="rounded-xl border border-slate-200 overflow-hidden">
            <div style={{ background: `#${config.primaryColor ?? '1A3C34'}`, padding: '12px 16px' }}>
              <p style={{ color: '#fff', fontSize: 13, fontWeight: 700, margin: 0 }}>Preview warna — {config.brandName ?? 'Brand Anda'}</p>
            </div>
            <div style={{ padding: '10px 16px', background: `#${config.accentColor ?? 'C8953A'}20` }}>
              <span style={{
                background: `#${config.accentColor ?? 'C8953A'}`,
                color: '#fff', fontSize: 11, padding: '4px 12px', borderRadius: 20, fontWeight: 700,
              }}>Aksen</span>
            </div>
          </div>
        </div>
      )}

      {/* ── Tab: Portal ── */}
      {activeTab === 'portal' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
          <SectionHeader icon={Type} title="Teks Portal" desc="Judul, pesan sambutan, dan informasi kontak" />

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Judul Halaman Portal</label>
            {inp('portalTitle', 'Portal Pengiriman — PT Maju Logistik')}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Pesan Selamat Datang</label>
            <textarea value={config.portalWelcome ?? ''} rows={2}
              onChange={e => upd('portalWelcome')(e.target.value || null)}
              placeholder="Lacak status pengiriman Anda secara real-time."
              className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Teks Footer</label>
            {inp('portalFooter', '© 2025 PT Maju Logistik. Semua hak dilindungi.')}
          </div>

          <div className="border-t border-slate-100 pt-4">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Informasi Dukungan</p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1 flex items-center gap-1.5"><Mail className="w-3 h-3" /> Email Dukungan</label>
                {inp('supportEmail', 'cs@perusahaan.co.id', 'email')}
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1 flex items-center gap-1.5"><Phone className="w-3 h-3" /> Nomor Telepon</label>
                {inp('supportPhone', '+62-21-123456')}
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1 flex items-center gap-1.5"><MessageCircle className="w-3 h-3" /> WhatsApp</label>
                {inp('supportWhatsapp', '6281234567890')}
                <p className="text-xs text-slate-400 mt-1">Tanpa tanda + atau spasi. Contoh: 6281234567890</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Tab: Features ── */}
      {activeTab === 'features' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-1">
          <SectionHeader icon={Settings2} title="Fitur Portal" desc="Kontrol fitur apa saja yang tersedia untuk klien Anda" />
          <Toggle label="Tampilkan 'Powered by Portalog'" desc="Hilangkan watermark untuk white-label penuh" checked={config.showPoweredBy ?? true} onChange={upd('showPoweredBy')} />
          <Toggle label="Chatbot AI" desc="AI assistant untuk pertanyaan klien tentang shipment" checked={config.showChatbot ?? true} onChange={upd('showChatbot')} />
          <Toggle label="Akses Dokumen" desc="Klien bisa download dokumen yang sudah disetujui" checked={config.showDocuments ?? true} onChange={upd('showDocuments')} />
          <Toggle label="Timeline Status" desc="Tampilkan riwayat perubahan status shipment" checked={config.showTimeline ?? true} onChange={upd('showTimeline')} />
          <Toggle label="Login Klien" desc="Klien bisa login dengan email & password yang sudah diatur" checked={config.allowClientLogin ?? true} onChange={upd('allowClientLogin')} />
        </div>
      )}

      {/* Info box */}
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-start gap-3">
        <Info className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
        <div className="text-xs text-blue-700 leading-relaxed">
          <p className="font-semibold mb-1">Cara kerja white-label:</p>
          <p>Setelah domain diverifikasi dan konfigurasi disimpan, klien Anda dapat login di <strong>{config.customDomain ?? 'domain.anda.co.id'}</strong> menggunakan email portal yang sudah diatur di halaman Klien. Mereka akan melihat portal dengan branding perusahaan Anda — tanpa branding Portalog (jika "Powered by" dimatikan).</p>
        </div>
      </div>
    </div>
  )
}
