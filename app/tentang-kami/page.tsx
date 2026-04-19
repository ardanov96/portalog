'use client'

// app/tentang-kami/page.tsx
// Untuk dipakai: buat file app/tentang-kami/page.tsx dan paste ini

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { ArrowRight, Target, Eye, Heart, Users, Award, Globe, Zap } from 'lucide-react'

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

const NILAI = [
  { icon: Target, title: 'Fokus Industri',    desc: 'Kami membangun khusus untuk freight forwarder dan PPJK — bukan solusi generik yang dipaksakan.' },
  { icon: Zap,    title: 'Simpel & Cepat',    desc: 'UX yang intuitif. Setup menit, bukan minggu. Tim kamu produktif dari hari pertama.' },
  { icon: Heart,  title: 'Customer First',    desc: 'Setiap fitur lahir dari feedback pengguna nyata. Kami mendengarkan sebelum membangun.' },
  { icon: Globe,  title: 'Skala Bebas',       desc: 'Dari 1 pengguna hingga ratusan — infrastruktur kami tumbuh bersama bisnis kamu.' },
]

const TEAM = [
  { initials: 'AP', name: 'Ardha Putra',    role: 'Founder & CEO',         desc: 'Berlatar belakang logistik dan teknologi. Membangun Portalog dari frustrasi dengan sistem lama.' },
  { initials: 'RD', name: 'Rizky Dananjaya', role: 'Head of Product',       desc: '8 tahun di industri ekspedisi. Memastikan setiap fitur benar-benar menjawab masalah nyata.' },
  { initials: 'SA', name: 'Siti Aminah',    role: 'Head of Customer Success', desc: 'Mantan ops manager di PPJK besar. Menjamin setiap pelanggan sukses onboarding dan bertumbuh.' },
]

const MILESTONES = [
  { year: '2023', title: 'Ide Lahir',         desc: 'Frustrasi dengan spreadsheet dan WhatsApp untuk kelola shipment, Portalog mulai dikerjakan.' },
  { year: '2024', title: 'Beta Launch',        desc: '50 perusahaan pertama bergabung ke program beta. Feedback membentuk roadmap produk.' },
  { year: '2024', title: '200+ Pengguna',      desc: 'Mencapai 200 perusahaan aktif. Fitur white-label dan API diluncurkan.' },
  { year: '2025', title: 'Ekspansi Nasional',  desc: 'Tersedia di seluruh Indonesia. Integrasi dengan sistem Bea Cukai dan vessel tracking.' },
]

export default function TentangKami() {
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
      <section className="pt-36 pb-20 px-6 md:px-10 max-w-4xl mx-auto text-center">
        <div className="fo-fade-up inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-brand-500/30 bg-brand-500/10 text-brand-400 text-xs font-mono font-medium mb-7">
          <Users className="w-3 h-3" /> Tentang Portalog
        </div>
        <h1 className="fo-fade-up fo-d100 text-4xl md:text-5xl xl:text-6xl font-extrabold tracking-tight leading-[1.1] mb-6">
          Kami Membangun untuk<br /><span className="fo-shimmer">Industri Ekspedisi</span>
        </h1>
        <p className="fo-fade-up fo-d200 text-slate-400 text-lg leading-relaxed max-w-2xl mx-auto mb-10">
          Portalog lahir dari pengalaman langsung di lapangan — frustrasi dengan proses manual, spreadsheet berserakan, dan komunikasi yang tidak terstruktur. Kami hadir untuk mengubah itu.
        </p>
      </section>

      {/* MISSION VISION */}
      <section className="py-16 px-6 md:px-10 max-w-6xl mx-auto">
        <div className="grid md:grid-cols-2 gap-6">
          {[
            { icon: Target, label: 'Misi', color: 'brand', title: 'Digitalisasi Ekspedisi Indonesia', desc: 'Membuat setiap perusahaan freight forwarder dan PPJK — dari yang kecil hingga besar — mampu beroperasi dengan efisiensi kelas dunia melalui teknologi yang terjangkau dan mudah digunakan.' },
            { icon: Eye,    label: 'Visi', color: 'emerald', title: 'Platform #1 Ekspedisi Asia Tenggara', desc: 'Menjadi sistem operasi pilihan industri ekspedisi di Asia Tenggara — tempat di mana shipment dikelola, klien dilayani, dan bisnis bertumbuh dalam satu platform terintegrasi.' },
          ].map((item, i) => (
            <Reveal key={item.label} delay={i * 100}>
              <div className={`h-full rounded-2xl p-8 border bg-slate-900/60 border-white/[0.08] hover:border-${item.color}-500/30 transition-all duration-300`}>
                <div className={`w-12 h-12 rounded-xl bg-${item.color}-500/10 border border-${item.color}-500/20 flex items-center justify-center text-${item.color}-400 mb-5`}>
                  <item.icon className="w-6 h-6" />
                </div>
                <p className={`text-xs font-mono font-semibold tracking-widest uppercase text-${item.color}-400 mb-2`}>{item.label}</p>
                <h3 className="text-xl font-bold mb-3">{item.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{item.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* NILAI */}
      <section className="py-20 px-6 md:px-10 max-w-6xl mx-auto">
        <Reveal className="mb-12 text-center">
          <p className="text-xs font-mono font-semibold tracking-widest uppercase text-brand-400 mb-3">Nilai Kami</p>
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight">
            Prinsip yang <span className="fo-shimmer">Membentuk Kami</span>
          </h2>
        </Reveal>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {NILAI.map((n, i) => (
            <Reveal key={n.title} delay={i * 80}>
              <div className="group h-full rounded-xl bg-slate-900/60 border border-white/[0.07] hover:border-brand-500/30 p-6 transition-all duration-300 hover:-translate-y-1">
                <div className="w-10 h-10 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-400 mb-4 group-hover:bg-brand-500/20 transition-all">
                  <n.icon className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-[15px] mb-2">{n.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{n.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* TIMELINE */}
      <section className="py-20 px-6 md:px-10 bg-slate-900/40 border-y border-white/[0.05]">
        <div className="max-w-3xl mx-auto">
          <Reveal className="text-center mb-12">
            <p className="text-xs font-mono font-semibold tracking-widest uppercase text-brand-400 mb-3">Perjalanan</p>
            <h2 className="text-3xl font-extrabold tracking-tight">Dari Ide ke <span className="fo-shimmer">Kenyataan</span></h2>
          </Reveal>
          <div className="relative">
            <div className="absolute left-4 top-0 bottom-0 w-px bg-white/[0.07]" />
            <div className="space-y-8">
              {MILESTONES.map((m, i) => (
                <Reveal key={i} delay={i * 100}>
                  <div className="flex gap-6 items-start pl-2">
                    <div className="relative shrink-0">
                      <div className="w-8 h-8 rounded-full bg-brand-600 border-2 border-brand-400 flex items-center justify-center z-10 relative">
                        <Award className="w-3.5 h-3.5 text-white" />
                      </div>
                    </div>
                    <div className="pb-2">
                      <span className="text-xs font-mono text-brand-400 font-semibold">{m.year}</span>
                      <h3 className="font-bold text-[15px] mt-1 mb-1">{m.title}</h3>
                      <p className="text-slate-400 text-sm leading-relaxed">{m.desc}</p>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* TEAM */}
      <section className="py-20 px-6 md:px-10 max-w-6xl mx-auto">
        <Reveal className="text-center mb-12">
          <p className="text-xs font-mono font-semibold tracking-widest uppercase text-brand-400 mb-3">Tim</p>
          <h2 className="text-3xl font-extrabold tracking-tight">Orang-orang di <span className="fo-shimmer">Balik Portalog</span></h2>
        </Reveal>
        <div className="grid md:grid-cols-3 gap-5">
          {TEAM.map((t, i) => (
            <Reveal key={t.name} delay={i * 100}>
              <div className="rounded-2xl bg-slate-900/60 border border-white/[0.07] hover:border-brand-500/25 p-7 transition-all duration-300 hover:-translate-y-1">
                <div className="w-14 h-14 rounded-full bg-brand-500/15 border border-brand-500/25 flex items-center justify-center text-brand-400 font-bold text-lg mb-4">
                  {t.initials}
                </div>
                <h3 className="font-bold text-[16px] mb-0.5">{t.name}</h3>
                <p className="text-xs font-mono text-brand-400 mb-3">{t.role}</p>
                <p className="text-slate-400 text-sm leading-relaxed">{t.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6 md:px-10 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(99,102,241,0.09)_0%,transparent_65%)] pointer-events-none" />
        <Reveal className="relative max-w-2xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-5">
            Bergabung dan <span className="fo-shimmer">Rasakan Perbedaannya</span>
          </h2>
          <p className="text-slate-400 mb-8">Gratis 14 hari. Tidak perlu kartu kredit.</p>
          <Link href="/register" className="group inline-flex items-center gap-2 px-7 py-4 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-[15px] transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-brand-600/30">
            Mulai Sekarang <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </Reveal>
      </section>

      {/* FOOTER minimal */}
      <footer className="border-t border-white/[0.06] bg-slate-900/60 px-6 md:px-10 py-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-brand-500 flex items-center justify-center font-bold text-xs text-white">F</div>
            <span className="font-bold text-sm">Forwarder<span className="text-brand-400">OS</span></span>
          </Link>
          <div className="flex gap-6 text-sm text-slate-400">
            <Link href="/tentang-kami" className="text-white">Tentang Kami</Link>
            <Link href="/blog" className="hover:text-white transition-colors">Blog</Link>
            <Link href="/karier" className="hover:text-white transition-colors">Karier</Link>
            <Link href="/kontak" className="hover:text-white transition-colors">Kontak</Link>
          </div>
          <p className="text-xs text-slate-500">© 2025 Portalog</p>
        </div>
      </footer>

    </div>
  )
}
