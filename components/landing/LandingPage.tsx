'use client'

// components/landing/LandingPage.tsx

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import {
  Ship, Receipt, FileText, Users, BarChart2, Key,
  Globe, Gift, Clock, LayoutDashboard, Code2, CreditCard,
  Settings, Bell, Shield, ArrowRight,
} from 'lucide-react'

// ─── Hooks ─────────────────────────────────────────────────────────────────────

function useReveal() {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add('fo-visible')
          obs.disconnect()
        }
      },
      { threshold: 0.12 }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])
  return ref
}

function useCounter(target: number, duration: number, active: boolean) {
  const [val, setVal] = useState(0)
  useEffect(() => {
    if (!active) return
    let raf: number
    const t0 = performance.now()
    const tick = (now: number) => {
      const p = Math.min((now - t0) / duration, 1)
      setVal(Math.floor((1 - Math.pow(1 - p, 3)) * target))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [active, target, duration])
  return val
}

// ─── Data ──────────────────────────────────────────────────────────────────────

const FEATURES = [
  { icon: Ship,      title: 'Manajemen Shipment',  desc: 'Kelola FCL, LCL, udara, dan darat. Tracking real-time dari booking hingga POD.' },
  { icon: Receipt,   title: 'Invoice & Penagihan',  desc: 'Generate invoice otomatis. Kelola piutang, jadwal tagihan, dan rekap pembayaran.' },
  { icon: FileText,  title: 'Manajemen Dokumen',    desc: 'Simpan dan bagikan B/L, Packing List, COO, PIB/PEB dengan kontrol akses peran.' },
  { icon: Users,     title: 'CRM Klien',            desc: 'Database klien terpusat dengan riwayat transaksi, segmentasi, dan manajemen kontak.' },
  { icon: BarChart2, title: 'Laporan & Analitik',   desc: 'Laporan shipment, revenue per klien, tren volume, dan export PDF/Excel.' },
  { icon: Key,       title: 'API & Integrasi',      desc: 'REST API lengkap. Integrasikan ke TMS, ERP, atau portal klien Anda.' },
  { icon: Globe,     title: 'White-Label',          desc: 'Rebrand dengan logo dan domain sendiri. Portal bermerek tanpa effort teknis.' },
  { icon: Gift,      title: 'Program Referral',     desc: 'Program referral terstruktur. Pantau komisi dan konversi mitra dalam satu panel.' },
  { icon: Clock,     title: 'Automasi & Cron Job',  desc: 'Jadwalkan reminder tagihan, laporan otomatis, dan notifikasi ETA tanpa kerja manual.' },
]

const MODULES = [
  { icon: LayoutDashboard, name: 'Dashboard'     },
  { icon: Ship,            name: 'Shipments'     },
  { icon: Users,           name: 'Klien'         },
  { icon: Receipt,         name: 'Invoice'       },
  { icon: BarChart2,       name: 'Laporan'       },
  { icon: FileText,        name: 'Dokumen'       },
  { icon: Gift,            name: 'Referral'      },
  { icon: Globe,           name: 'White-Label'   },
  { icon: Key,             name: 'API Keys'      },
  { icon: Code2,           name: 'Developer'     },
  { icon: CreditCard,      name: 'Billing'       },
  { icon: Clock,           name: 'Cron Jobs'     },
  { icon: Settings,        name: 'Pengaturan'    },
  { icon: Shield,          name: 'Tim'           },
  { icon: Bell,            name: 'Notifikasi'    },
]

const PLANS = [
  {
    name: 'Starter', price: '299K', popular: false,
    desc: 'Untuk perusahaan kecil yang baru memulai digitalisasi.',
    features: [
      { text: 'Hingga 3 pengguna',        ok: true  },
      { text: '50 shipment / bulan',      ok: true  },
      { text: 'Manajemen dokumen dasar',  ok: true  },
      { text: 'Invoice & penagihan',      ok: true  },
      { text: 'Laporan standar',          ok: true  },
      { text: 'White-label',              ok: false },
      { text: 'API access',               ok: false },
      { text: 'Cron jobs & automasi',     ok: false },
    ],
  },
  {
    name: 'Professional', price: '799K', popular: true,
    desc: 'Untuk perusahaan berkembang dengan volume tinggi.',
    features: [
      { text: 'Hingga 15 pengguna',           ok: true  },
      { text: 'Shipment tidak terbatas',      ok: true  },
      { text: 'Manajemen dokumen lengkap',    ok: true  },
      { text: 'Invoice & penagihan lanjutan', ok: true  },
      { text: 'Laporan & analitik lengkap',   ok: true  },
      { text: 'Program referral',             ok: true  },
      { text: 'API keys & developer access',  ok: true  },
      { text: 'White-label',                  ok: false },
    ],
  },
  {
    name: 'Enterprise', price: 'Custom', popular: false,
    desc: 'Solusi khusus untuk perusahaan besar atau holding.',
    features: [
      { text: 'Pengguna tidak terbatas',      ok: true },
      { text: 'Shipment tidak terbatas',      ok: true },
      { text: 'White-label + domain sendiri', ok: true },
      { text: 'API & webhook lanjutan',       ok: true },
      { text: 'Cron jobs & automasi',         ok: true },
      { text: 'SLA uptime 99.9%',             ok: true },
      { text: 'Dedicated onboarding',         ok: true },
      { text: 'Custom integrasi ERP/TMS',     ok: true },
    ],
  },
]

const TESTIMONIALS = [
  { initials: 'AS', name: 'Andi Setiawan',   company: 'Direktur Operasional · PT Maju Logistik', text: '"Sebelum ForwarderOS, tim kami menghabiskan 3–4 jam sehari untuk update status shipment manual. Sekarang semua terotomasi."' },
  { initials: 'RH', name: 'Rini Hartono',    company: 'CEO · RH Forwarding & Customs',           text: '"Fitur white-label luar biasa. Klien mengira portal tracking itu sistem internal kami sendiri. Image perusahaan naik drastis."' },
  { initials: 'BK', name: 'Bagas Kurniawan', company: 'IT Manager · Samudera Express Cargo',     text: '"API-nya lengkap dan dokumentasinya jelas. Integrasi ke ERP internal selesai dalam kurang dari seminggu."' },
]

const MOCK_ROWS = [
  { ref: 'FF-2401', route: 'Surabaya → Rotterdam', badge: 'On Track',  cls: 'bg-emerald-500/15 text-emerald-400', eta: '25 Apr' },
  { ref: 'FF-2402', route: 'Jakarta → Singapore',  badge: 'Clearance', cls: 'bg-brand-500/15 text-brand-400',    eta: '22 Apr' },
  { ref: 'FF-2403', route: 'Belawan → Hamburg',    badge: 'Booking',   cls: 'bg-sky-500/15 text-sky-400',        eta: '02 Mei' },
  { ref: 'FF-2404', route: 'Makassar → Osaka',     badge: 'Draft',     cls: 'bg-slate-500/15 text-slate-400',    eta: '—'      },
]

// ─── Reveal wrapper ────────────────────────────────────────────────────────────

function Reveal({ children, delay = 0, className = '' }: {
  children: React.ReactNode
  delay?: number
  className?: string
}) {
  const ref = useReveal()
  return (
    <div ref={ref} className={`fo-reveal ${className}`} style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </div>
  )
}

// ─── Stats Bar ─────────────────────────────────────────────────────────────────

function StatsBar() {
  const ref = useRef<HTMLDivElement>(null)
  const [go, setGo] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setGo(true); obs.disconnect() } },
      { threshold: 0.4 }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])
  const c500  = useCounter(500,  1200, go)
  const c50   = useCounter(50,   1000, go)
  const c9999 = useCounter(9999, 1500, go)

  const items = [
    { val: go ? `${c500}+`  : '0+',  label: 'Perusahaan Aktif'  },
    { val: go ? `${c50}K+`  : '0K+', label: 'Shipment Diproses' },
    { val: go ? `${(c9999 / 10000 * 100).toFixed(1)}%` : '0%', label: 'Uptime SLA' },
    { val: '24/7',                    label: 'Support Teknis'   },
  ]

  return (
    <div ref={ref} className="border-y border-white/[0.06] bg-slate-900/50">
      <div className="max-w-7xl mx-auto px-6 md:px-10 py-10 grid grid-cols-2 md:grid-cols-4 divide-x divide-white/[0.06]">
        {items.map((s, i) => (
          <div key={s.label} className="fo-fade-up text-center px-6 py-2 tabular-nums"
            style={{ animationDelay: `${i * 100 + 200}ms`, animationFillMode: 'both' }}>
            <p className="text-3xl font-extrabold text-brand-400 tracking-tight">{s.val}</p>
            <p className="text-sm text-slate-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Main ──────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', fn, { passive: true })
    return () => window.removeEventListener('scroll', fn)
  }, [])

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans antialiased overflow-x-hidden">

      {/* NAV */}
      <nav className={`fo-nav fixed top-0 inset-x-0 z-50 flex items-center justify-between px-6 md:px-10 h-16 transition-all duration-300 border-b ${
        scrolled
          ? 'bg-slate-950/95 backdrop-blur-xl border-white/[0.09] shadow-xl shadow-black/30'
          : 'bg-slate-950/60 backdrop-blur-md border-white/[0.04]'
      }`}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center font-bold text-sm text-white transition-all duration-200 hover:scale-110 hover:rotate-3 cursor-pointer">
            F
          </div>
          <span className="font-bold text-[15px] tracking-tight">
            Forwarder<span className="text-brand-400">OS</span>
          </span>
        </div>
        <div className="hidden md:flex items-center gap-8 text-sm text-slate-400">
          {['Fitur', 'Modul', 'Harga', 'Testimoni'].map((l, i) => (
            <a key={l} href={`#${l.toLowerCase()}`}
              className="fo-navlink fo-fade-in hover:text-white transition-colors"
              style={{ animationDelay: `${i * 60 + 100}ms`, animationFillMode: 'both' }}>
              {l}
            </a>
          ))}
        </div>
        <div className="flex items-center gap-2 fo-fade-in fo-d400">
          <Link href="/login" className="hidden sm:inline-flex text-sm px-4 py-2 rounded-lg border border-white/10 text-slate-300 hover:text-white hover:border-white/25 hover:bg-white/[0.04] transition-all">
            Masuk
          </Link>
          <Link href="/register" className="text-sm px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-white font-semibold transition-all hover:shadow-lg hover:shadow-brand-600/30 active:scale-95">
            Daftar Gratis
          </Link>
        </div>
      </nav>

      {/* HERO */}
      <section className="min-h-screen pt-32 pb-20 px-6 md:px-10 grid md:grid-cols-2 gap-16 items-center max-w-7xl mx-auto">
        <div>
          <div className="fo-fade-up inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-brand-500/30 bg-brand-500/10 text-brand-400 text-xs font-mono font-medium mb-7">
            <span className="fo-pulse w-1.5 h-1.5 rounded-full bg-brand-400 inline-block" />
            Khusus Freight Forwarder &amp; PPJK Indonesia
          </div>
          <h1 className="text-4xl md:text-5xl xl:text-6xl font-extrabold tracking-tight leading-[1.1] mb-6">
            <span className="block fo-fade-up fo-d100">Kelola Ekspedisi</span>
            <span className="block fo-fade-up fo-d200">
              Anda dengan <span className="fo-shimmer">Presisi</span>
            </span>
          </h1>
          <p className="fo-fade-up fo-d300 text-slate-400 text-lg leading-relaxed max-w-lg mb-10">
            Platform manajemen end-to-end untuk perusahaan freight forwarder dan PPJK. Shipment tracking, penagihan, white-label — semua dalam satu sistem.
          </p>
          <div className="fo-fade-up fo-d400 flex flex-wrap gap-3 mb-5">
            <Link href="/register" className="group inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-[15px] transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-brand-600/30 active:scale-95">
              Coba Gratis 14 Hari
              <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1" />
            </Link>
            <Link href="/login" className="inline-flex items-center px-6 py-3.5 rounded-xl border border-white/10 text-slate-300 hover:text-white hover:border-white/25 font-medium text-[15px] transition-all hover:bg-white/[0.03]">
              Masuk ke Akun
            </Link>
          </div>
          <p className="fo-fade-up fo-d500 text-slate-500 text-sm">
            Tidak perlu kartu kredit · Setup 5 menit · Batalkan kapan saja
          </p>
        </div>

        {/* Dashboard Mock */}
        <div className="hidden md:block fo-slide-l fo-d300">
          <div className="fo-float rounded-2xl overflow-hidden border border-white/[0.08] bg-slate-900 shadow-2xl shadow-black/60">
            <div className="flex items-center gap-2 px-4 py-3 bg-slate-800/60 border-b border-white/[0.06]">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
              <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/70" />
              <span className="w-2.5 h-2.5 rounded-full bg-green-500/70" />
              <span className="ml-3 text-xs text-slate-500 font-mono">ForwarderOS · Dashboard</span>
            </div>
            <div className="p-4">
              <div className="grid grid-cols-3 gap-3 mb-4">
                {[
                  { label: 'Total Shipment', val: '248', color: 'text-white'       },
                  { label: 'Aktif',          val: '34',  color: 'text-brand-400'   },
                  { label: 'Selesai',        val: '17',  color: 'text-emerald-400' },
                ].map((s, i) => (
                  <div key={s.label} className="fo-fade-up rounded-lg bg-slate-800/70 border border-white/[0.06] p-3"
                    style={{ animationDelay: `${i * 80 + 550}ms`, animationFillMode: 'both' }}>
                    <p className="text-[10px] text-slate-500 mb-1">{s.label}</p>
                    <p className={`text-xl font-extrabold ${s.color}`}>{s.val}</p>
                  </div>
                ))}
              </div>
              <div className="rounded-lg bg-slate-800/70 border border-white/[0.06] overflow-hidden">
                <div className="grid grid-cols-[1fr_2fr_1fr_auto] gap-2 px-3 py-2 border-b border-white/[0.06]">
                  {['Ref No', 'Rute', 'Status', 'ETA'].map(h => (
                    <span key={h} className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">{h}</span>
                  ))}
                </div>
                {MOCK_ROWS.map((row, i) => (
                  <div key={i}
                    className={`fo-slide-r grid grid-cols-[1fr_2fr_1fr_auto] gap-2 px-3 py-2 items-center ${i < MOCK_ROWS.length - 1 ? 'border-b border-white/[0.04]' : ''}`}
                    style={{ animationDelay: `${i * 75 + 650}ms`, animationFillMode: 'both' }}>
                    <span className="text-[10px] font-mono text-brand-400">{row.ref}</span>
                    <span className="text-[11px] text-slate-300 truncate">{row.route}</span>
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded ${row.cls}`}>{row.badge}</span>
                    <span className="text-[10px] text-slate-500 whitespace-nowrap">{row.eta}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* STATS */}
      <StatsBar />

      {/* FEATURES */}
      <section id="fitur" className="py-24 px-6 md:px-10 max-w-7xl mx-auto">
        <Reveal className="mb-14">
          <p className="text-xs font-mono font-semibold tracking-widest uppercase text-brand-400 mb-3">Fitur Unggulan</p>
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-4">
            Semua yang Dibutuhkan<br /><span className="fo-shimmer">Bisnis Ekspedisi Anda</span>
          </h2>
          <p className="text-slate-400 text-base max-w-xl leading-relaxed">
            Dirancang khusus untuk operasional freight forwarder dan PPJK Indonesia.
          </p>
        </Reveal>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-white/[0.04] rounded-2xl overflow-hidden border border-white/[0.06]">
          {FEATURES.map((f, i) => (
            <Reveal key={f.title} delay={i * 55}>
              <div className="fo-feat group bg-slate-950 hover:bg-slate-900 p-8 transition-all duration-300 relative overflow-hidden h-full">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(99,102,241,0.07),transparent_55%)] opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="relative w-10 h-10 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-400 mb-5 transition-all duration-300 group-hover:bg-brand-500/20 group-hover:border-brand-500/40 group-hover:scale-110">
                  <f.icon className="w-5 h-5" />
                </div>
                <h3 className="relative font-bold text-[15px] mb-2 text-white">{f.title}</h3>
                <p className="relative text-slate-400 text-sm leading-relaxed group-hover:text-slate-300 transition-colors">{f.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="py-24 px-6 md:px-10 max-w-7xl mx-auto text-center">
        <Reveal>
          <p className="text-xs font-mono font-semibold tracking-widest uppercase text-brand-400 mb-3">Cara Kerja</p>
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-16">
            Mulai dalam <span className="fo-shimmer">4 Langkah</span>
          </h2>
        </Reveal>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 relative">
          <div className="absolute top-7 left-[15%] right-[15%] h-px bg-gradient-to-r from-brand-600 via-brand-400 to-brand-600/10 hidden md:block" />
          {[
            { n: '1', title: 'Daftar & Setup',  desc: 'Buat akun, isi profil, undang anggota tim.' },
            { n: '2', title: 'Tambah Klien',    desc: 'Import atau input data klien ke CRM.' },
            { n: '3', title: 'Buat Shipment',   desc: 'Input order, upload dokumen, pantau status.' },
            { n: '4', title: 'Tagih & Laporan', desc: 'Generate invoice dan lihat analitik bisnis.' },
          ].map((s, i) => (
            <Reveal key={s.n} delay={i * 100}>
              <div className="flex flex-col items-center group">
                <div className="w-14 h-14 rounded-full bg-slate-900 border-2 border-brand-500 flex items-center justify-center font-extrabold text-lg text-brand-400 mb-5 relative z-10 transition-all duration-300 group-hover:bg-brand-600 group-hover:text-white group-hover:scale-110">
                  {s.n}
                </div>
                <h3 className="font-bold text-[14px] mb-2">{s.title}</h3>
                <p className="text-slate-400 text-[13px] leading-relaxed">{s.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* MODULES */}
      <section id="modul" className="py-20 px-6 md:px-10 bg-slate-900/40 border-y border-white/[0.05]">
        <Reveal className="max-w-7xl mx-auto text-center mb-12">
          <p className="text-xs font-mono font-semibold tracking-widest uppercase text-brand-400 mb-3">Modul Lengkap</p>
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight">
            Satu Platform, <span className="fo-shimmer">Semua Fungsi</span>
          </h2>
        </Reveal>
        <div className="max-w-5xl mx-auto grid grid-cols-3 sm:grid-cols-5 gap-3">
          {MODULES.map((m, i) => (
            <Reveal key={m.name} delay={i * 40}>
              <div className="group flex flex-col items-center gap-2 p-4 rounded-xl bg-slate-900 border border-white/[0.06] hover:border-brand-500/40 hover:bg-slate-800/60 hover:-translate-y-1 transition-all duration-200 cursor-default">
                <m.icon className="w-5 h-5 text-slate-500 group-hover:text-brand-400 transition-colors" />
                <span className="text-[12px] text-slate-500 group-hover:text-slate-200 transition-colors text-center">{m.name}</span>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* PRICING */}
      <section id="harga" className="py-24 px-6 md:px-10 max-w-7xl mx-auto text-center">
        <Reveal>
          <p className="text-xs font-mono font-semibold tracking-widest uppercase text-brand-400 mb-3">Harga</p>
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-4">
            Pilih Paket yang <span className="fo-shimmer">Tepat</span>
          </h2>
          <p className="text-slate-400 max-w-md mx-auto mb-14">Mulai gratis, upgrade sesuai pertumbuhan. Tidak ada biaya tersembunyi.</p>
        </Reveal>
        <div className="grid md:grid-cols-3 gap-5 max-w-5xl mx-auto text-left">
          {PLANS.map((plan, i) => (
            <Reveal key={plan.name} delay={i * 100}>
              <div className={`relative rounded-2xl p-8 border h-full flex flex-col transition-all duration-300 hover:-translate-y-2 ${
                plan.popular
                  ? 'bg-slate-900 border-brand-500 shadow-lg shadow-brand-600/10'
                  : 'bg-slate-900/60 border-white/[0.08] hover:border-white/[0.15]'
              }`}>
                {plan.popular && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-brand-600 text-white text-[11px] font-bold px-4 py-1 rounded-full whitespace-nowrap">
                    ✦ PALING POPULER
                  </div>
                )}
                <p className="text-[11px] font-semibold tracking-widest uppercase text-slate-500 mb-2">{plan.name}</p>
                <div className="flex items-baseline gap-1 mb-2">
                  {plan.price === 'Custom'
                    ? <span className="text-3xl font-extrabold text-brand-400">Custom</span>
                    : <><span className="text-base text-slate-400">Rp</span><span className="text-4xl font-extrabold text-white">{plan.price}</span><span className="text-slate-400 text-sm">/ bulan</span></>
                  }
                </div>
                <p className="text-sm text-slate-400 mb-6">{plan.desc}</p>
                <div className="h-px bg-white/[0.07] mb-6" />
                <ul className="space-y-3 mb-8 flex-1">
                  {plan.features.map(f => (
                    <li key={f.text} className={`flex items-start gap-2.5 text-sm ${f.ok ? 'text-slate-200' : 'text-slate-600'}`}>
                      <span className={`mt-0.5 shrink-0 font-bold text-xs ${f.ok ? 'text-emerald-400' : 'text-slate-600'}`}>{f.ok ? '✓' : '—'}</span>
                      {f.text}
                    </li>
                  ))}
                </ul>
                {plan.price === 'Custom'
                  ? <a href="mailto:sales@forwarderos.id" className="block text-center py-3 rounded-xl border border-white/10 text-slate-300 hover:text-white text-sm font-semibold transition-all">Hubungi Sales</a>
                  : <Link href="/register" className={`block text-center py-3 rounded-xl text-sm font-semibold transition-all active:scale-95 ${plan.popular ? 'bg-brand-600 hover:bg-brand-500 text-white' : 'border border-white/10 text-slate-300 hover:text-white'}`}>
                      Mulai Gratis 14 Hari
                    </Link>
                }
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section id="testimoni" className="py-24 px-6 md:px-10 bg-slate-900/30 border-y border-white/[0.05]">
        <div className="max-w-7xl mx-auto">
          <Reveal className="text-center mb-14">
            <p className="text-xs font-mono font-semibold tracking-widest uppercase text-brand-400 mb-3">Testimoni</p>
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight">
              Dipercaya oleh <span className="fo-shimmer">Pelaku Industri</span>
            </h2>
          </Reveal>
          <div className="grid md:grid-cols-3 gap-5">
            {TESTIMONIALS.map((t, i) => (
              <Reveal key={t.name} delay={i * 120}>
                <div className="rounded-2xl bg-slate-900 border border-white/[0.07] p-7 h-full flex flex-col transition-all duration-300 hover:border-brand-500/25 hover:-translate-y-1.5">
                  <div className="text-brand-400 tracking-widest text-sm mb-4">★★★★★</div>
                  <p className="text-sm text-slate-300 leading-relaxed italic mb-6 flex-1">{t.text}</p>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-brand-500/15 border border-brand-500/25 flex items-center justify-center text-brand-400 text-xs font-bold shrink-0">
                      {t.initials}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">{t.name}</p>
                      <p className="text-xs text-slate-500">{t.company}</p>
                    </div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-28 px-6 md:px-10 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(99,102,241,0.09)_0%,transparent_65%)] pointer-events-none" />
        <Reveal className="relative max-w-2xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-5">
            Siap Transformasi<br /><span className="fo-shimmer">Bisnis Ekspedisi Anda?</span>
          </h2>
          <p className="text-slate-400 text-base mb-10 leading-relaxed">
            Bergabung dengan ratusan perusahaan freight forwarder dan PPJK yang sudah lebih efisien bersama ForwarderOS.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link href="/register" className="group inline-flex items-center gap-2 px-7 py-4 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-[15px] transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-brand-600/30 active:scale-95">
              Daftar Sekarang — Gratis
              <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1" />
            </Link>
            <Link href="/login" className="inline-flex items-center px-7 py-4 rounded-xl border border-white/10 text-slate-300 hover:text-white hover:border-white/20 font-medium text-[15px] transition-all hover:bg-white/[0.03]">
              Sudah punya akun? Masuk
            </Link>
          </div>
        </Reveal>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-white/[0.06] bg-slate-900/60 px-6 md:px-10 py-14">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-10 mb-12">
            <div className="md:col-span-2">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center font-bold text-sm text-white">F</div>
                <span className="font-bold text-[15px]">Forwarder<span className="text-brand-400">OS</span></span>
              </div>
              <p className="text-sm text-slate-400 leading-relaxed max-w-xs">Platform manajemen ekspedisi end-to-end untuk freight forwarder dan PPJK Indonesia.</p>
            </div>
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-4">Produk</h4>
              {['Fitur', 'Modul', 'Harga', 'API Reference'].map(l => (
                <a key={l} href="#" className="block text-sm text-slate-400 hover:text-white mb-2.5 transition-colors">{l}</a>
              ))}
            </div>
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-4">Perusahaan</h4>
              {['Tentang Kami', 'Blog', 'Karier', 'Kontak'].map(l => (
                <a key={l} href="#" className="block text-sm text-slate-400 hover:text-white mb-2.5 transition-colors">{l}</a>
              ))}
            </div>
          </div>
          <div className="border-t border-white/[0.06] pt-6 flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-xs text-slate-500">© 2025 ForwarderOS. Hak cipta dilindungi undang-undang.</p>
            <div className="flex gap-2">
              {['Next.js 15', 'PostgreSQL', 'Prisma', 'TypeScript'].map(t => (
                <span key={t} className="text-[11px] font-mono px-2 py-1 rounded border border-white/[0.07] text-slate-500">{t}</span>
              ))}
            </div>
          </div>
        </div>
      </footer>

    </div>
  )
}
