'use client'

// app/karier/page.tsx

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { ArrowRight, MapPin, Clock, Briefcase, Zap, Heart, Globe, Users } from 'lucide-react'

function useReveal() {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { el.classList.add('fo-visible'); obs.disconnect() } },
      { threshold: 0.12 }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])
  return ref
}

function Reveal({ children, delay = 0, className = '' }: {
  children: React.ReactNode; delay?: number; className?: string
}) {
  const ref = useReveal()
  return (
    <div ref={ref} className={`fo-reveal ${className}`} style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </div>
  )
}

const BENEFITS = [
  { icon: Globe,   title: 'Remote-first',       desc: 'Kerja dari mana saja di Indonesia. Kami percaya output, bukan lokasi.' },
  { icon: Zap,     title: 'Gerak Cepat',        desc: 'Startup stage — keputusan cepat, dampak langsung terasa, tidak ada birokrasi.' },
  { icon: Heart,   title: 'Ownership Nyata',    desc: 'Setiap orang punya dampak langsung terhadap produk dan pelanggan.' },
  { icon: Users,   title: 'Tim yang Solid',     desc: 'Kecil, tapi berpengalaman. Tidak ada politik kantor — cuma kerja bermakna.' },
]

const JOBS = [
  {
    id:       '001',
    title:    'Full-Stack Engineer',
    type:     'Full-time',
    location: 'Remote · Indonesia',
    dept:     'Engineering',
    deptColor:'text-brand-400 bg-brand-500/10 border-brand-500/20',
    desc:     'Membangun dan menjaga platform Portalog dari frontend ke backend. Stack: Next.js, TypeScript, PostgreSQL, Prisma.',
    skills:   ['Next.js', 'TypeScript', 'PostgreSQL', 'REST API'],
  },
  {
    id:       '002',
    title:    'Product Designer (UI/UX)',
    type:     'Full-time',
    location: 'Remote · Indonesia',
    dept:     'Desain',
    deptColor:'text-purple-400 bg-purple-500/10 border-purple-500/20',
    desc:     'Merancang pengalaman pengguna untuk platform B2B yang dipakai sehari-hari oleh tim operasional ekspedisi.',
    skills:   ['Figma', 'Design System', 'User Research', 'Prototyping'],
  },
  {
    id:       '003',
    title:    'Customer Success Manager',
    type:     'Full-time',
    location: 'Remote · Indonesia',
    dept:     'Customer Success',
    deptColor:'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    desc:     'Memastikan setiap pelanggan onboarding dengan mulus, menggunakan platform secara maksimal, dan berhasil dalam bisnis mereka.',
    skills:   ['Onboarding', 'B2B SaaS', 'Komunikasi', 'Problem Solving'],
  },
  {
    id:       '004',
    title:    'Sales & Business Development',
    type:     'Full-time',
    location: 'Remote · Indonesia',
    dept:     'Sales',
    deptColor:'text-amber-400 bg-amber-500/10 border-amber-500/20',
    desc:     'Menjangkau perusahaan freight forwarder dan PPJK di seluruh Indonesia. Target pasar jelas, produk sudah terbukti.',
    skills:   ['B2B Sales', 'Logistik', 'Negosiasi', 'CRM'],
  },
]

export default function Karier() {
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', fn, { passive: true })
    return () => window.removeEventListener('scroll', fn)
  }, [])

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans antialiased overflow-x-hidden">

      {/* NAV */}
      <nav className={`fixed top-0 inset-x-0 z-50 flex items-center justify-between px-6 md:px-10 h-16 transition-all duration-300 border-b ${
        scrolled ? 'bg-slate-950/95 backdrop-blur-xl border-white/[0.09]' : 'bg-slate-950/60 backdrop-blur-md border-white/[0.04]'
      }`}>
        <Link href="/" className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center font-bold text-sm text-white">F</div>
          <span className="font-bold text-[15px] tracking-tight">Forwarder<span className="text-brand-400">OS</span></span>
        </Link>
        <div className="flex items-center gap-2">
          <Link href="/login" className="hidden sm:inline-flex text-sm px-4 py-2 rounded-lg border border-white/10 text-slate-300 hover:text-white hover:border-white/25 transition-all">Masuk</Link>
          <Link href="/register" className="text-sm px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-white font-semibold transition-all">Daftar Gratis</Link>
        </div>
      </nav>

      {/* HERO */}
      <section className="pt-36 pb-16 px-6 md:px-10 max-w-4xl mx-auto text-center">
        <div className="fo-fade-up inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-brand-500/30 bg-brand-500/10 text-brand-400 text-xs font-mono font-medium mb-7">
          <Briefcase className="w-3 h-3" /> Karier di Portalog
        </div>
        <h1 className="fo-fade-up fo-d100 text-4xl md:text-5xl font-extrabold tracking-tight leading-[1.1] mb-6">
          Bangun Masa Depan<br /><span className="fo-shimmer">Industri Ekspedisi</span>
        </h1>
        <p className="fo-fade-up fo-d200 text-slate-400 text-lg leading-relaxed max-w-2xl mx-auto">
          Kami tim kecil dengan misi besar — mendigitalisasi ribuan perusahaan freight forwarder Indonesia. Kalau kamu ingin kerja dengan dampak nyata, ini tempatnya.
        </p>
      </section>

      {/* BENEFITS */}
      <section className="py-16 px-6 md:px-10 max-w-6xl mx-auto">
        <Reveal className="text-center mb-10">
          <p className="text-xs font-mono font-semibold tracking-widest uppercase text-brand-400 mb-3">Kenapa Portalog</p>
          <h2 className="text-3xl font-extrabold tracking-tight">Lebih dari Sekadar <span className="fo-shimmer">Pekerjaan</span></h2>
        </Reveal>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {BENEFITS.map((b, i) => (
            <Reveal key={b.title} delay={i * 80}>
              <div className="group h-full rounded-xl bg-slate-900/60 border border-white/[0.07] hover:border-brand-500/30 p-6 transition-all duration-300 hover:-translate-y-1">
                <div className="w-10 h-10 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-400 mb-4 group-hover:bg-brand-500/20 transition-all">
                  <b.icon className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-[15px] mb-2">{b.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{b.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* JOB LISTINGS */}
      <section className="py-16 px-6 md:px-10 max-w-4xl mx-auto">
        <Reveal className="mb-10">
          <p className="text-xs font-mono font-semibold tracking-widest uppercase text-brand-400 mb-3">Posisi Terbuka</p>
          <h2 className="text-3xl font-extrabold tracking-tight">
            {JOBS.length} Posisi <span className="fo-shimmer">Tersedia</span>
          </h2>
        </Reveal>
        <div className="space-y-4">
          {JOBS.map((job, i) => (
            <Reveal key={job.id} delay={i * 80}>
              <div className="group rounded-2xl bg-slate-900/60 border border-white/[0.07] hover:border-brand-500/30 p-6 md:p-7 transition-all duration-300 hover:-translate-y-0.5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${job.deptColor}`}>{job.dept}</span>
                      <span className="text-xs text-slate-500 flex items-center gap-1"><Clock className="w-3 h-3" />{job.type}</span>
                      <span className="text-xs text-slate-500 flex items-center gap-1"><MapPin className="w-3 h-3" />{job.location}</span>
                    </div>
                    <h3 className="text-lg font-bold mb-2 group-hover:text-brand-300 transition-colors">{job.title}</h3>
                    <p className="text-slate-400 text-sm leading-relaxed mb-4">{job.desc}</p>
                    <div className="flex flex-wrap gap-2">
                      {job.skills.map(s => (
                        <span key={s} className="text-xs px-2.5 py-1 rounded border border-white/[0.08] text-slate-400 font-mono">{s}</span>
                      ))}
                    </div>
                  </div>
                  <a
                    href={`mailto:karier@Portalog.id?subject=Lamaran: ${job.title} [${job.id}]`}
                    className="shrink-0 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-sm font-semibold transition-all hover:shadow-lg hover:shadow-brand-600/25 active:scale-95"
                  >
                    Lamar <ArrowRight className="w-4 h-4" />
                  </a>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* OPEN APPLICATION */}
      <section className="py-16 px-6 md:px-10 max-w-4xl mx-auto">
        <Reveal>
          <div className="rounded-2xl border border-dashed border-white/[0.12] bg-slate-900/40 p-8 md:p-10 text-center">
            <div className="w-12 h-12 rounded-full bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-400 mx-auto mb-5">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold mb-3">Tidak ada posisi yang cocok?</h3>
            <p className="text-slate-400 text-sm leading-relaxed max-w-md mx-auto mb-6">
              Kami selalu terbuka untuk orang-orang berbakat. Kirim CV dan ceritakan apa yang bisa kamu kontribusikan.
            </p>
            <a
              href="mailto:karier@Portalog.id?subject=Open Application"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-white/10 text-slate-300 hover:text-white hover:border-white/25 text-sm font-semibold transition-all"
            >
              Kirim Lamaran Terbuka <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        </Reveal>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-white/[0.06] bg-slate-900/60 px-6 md:px-10 py-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-brand-500 flex items-center justify-center font-bold text-xs text-white">F</div>
            <span className="font-bold text-sm">Forwarder<span className="text-brand-400">OS</span></span>
          </Link>
          <div className="flex gap-6 text-sm text-slate-400">
            <Link href="/tentang-kami" className="hover:text-white transition-colors">Tentang Kami</Link>
            <Link href="/blog" className="hover:text-white transition-colors">Blog</Link>
            <Link href="/karier" className="text-white">Karier</Link>
            <Link href="/kontak" className="hover:text-white transition-colors">Kontak</Link>
          </div>
          <p className="text-xs text-slate-500">© 2025 Portalog</p>
        </div>
      </footer>
    </div>
  )
}
