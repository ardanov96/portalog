'use client'

// app/blog/page.tsx

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { ArrowRight, Clock, Tag, BookOpen } from 'lucide-react'

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

const POSTS = [
  {
    slug:     'digitalisasi-freight-forwarder-2025',
    tag:      'Industri',
    tagColor: 'text-brand-400 bg-brand-500/10 border-brand-500/20',
    title:    'Mengapa Digitalisasi Freight Forwarder Tidak Bisa Ditunda Lagi di 2025',
    excerpt:  'Persaingan semakin ketat, margin semakin tipis. Perusahaan yang masih mengandalkan WhatsApp dan Excel untuk operasional harian akan ketinggalan.',
    date:     '12 Apr 2025',
    readTime: '5 menit',
    featured: true,
  },
  {
    slug:     'hs-code-ai-guide',
    tag:      'Panduan',
    tagColor: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    title:    'Cara Mudah Menentukan HS Code dengan Bantuan AI',
    excerpt:  'HS Code yang salah bisa menyebabkan delay clearance dan denda bea cukai. Pelajari cara menggunakan fitur AI suggest di Portalog untuk akurasi lebih tinggi.',
    date:     '5 Apr 2025',
    readTime: '4 menit',
    featured: false,
  },
  {
    slug:     'white-label-portal-klien',
    tag:      'Fitur',
    tagColor: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
    title:    'White-Label Portal: Tampilkan Merek Sendiri ke Klien',
    excerpt:  'Dengan Portalog white-label, klien Anda melihat portal tracking bermerek perusahaan Anda — bukan nama vendor. Ini cara membangun kepercayaan jangka panjang.',
    date:     '28 Mar 2025',
    readTime: '3 menit',
    featured: false,
  },
  {
    slug:     'tips-kelola-dokumen-ekspedisi',
    tag:      'Tips',
    tagColor: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    title:    '7 Tips Mengelola Dokumen Ekspedisi agar Tidak Pernah Hilang Lagi',
    excerpt:  'B/L, Packing List, COO, PIB — dokumen ekspedisi banyak dan krusial. Berikut sistem penyimpanan digital yang bisa langsung diterapkan.',
    date:     '20 Mar 2025',
    readTime: '6 menit',
    featured: false,
  },
  {
    slug:     'invoice-otomatis-ppjk',
    tag:      'Panduan',
    tagColor: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    title:    'Otomatiskan Invoice PPJK: Dari Input Manual ke Generate Sekali Klik',
    excerpt:  'Rata-rata staf invoicing menghabiskan 2 jam per hari hanya untuk input data. Portalog memangkas proses ini menjadi hitungan detik.',
    date:     '15 Mar 2025',
    readTime: '5 menit',
    featured: false,
  },
  {
    slug:     'api-integrasi-erp-tms',
    tag:      'Developer',
    tagColor: 'text-sky-400 bg-sky-500/10 border-sky-500/20',
    title:    'Integrasi Portalog ke ERP/TMS via REST API dalam 1 Hari',
    excerpt:  'Panduan teknis lengkap untuk developer: autentikasi, endpoint utama, webhook, dan contoh kode integrasi ke sistem internal perusahaan.',
    date:     '8 Mar 2025',
    readTime: '8 menit',
    featured: false,
  },
]

const TAGS = ['Semua', 'Industri', 'Panduan', 'Fitur', 'Tips', 'Developer']

export default function Blog() {
  const [scrolled, setScrolled] = useState(false)
  const [activeTag, setActiveTag] = useState('Semua')

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', fn, { passive: true })
    return () => window.removeEventListener('scroll', fn)
  }, [])

  const filtered = activeTag === 'Semua' ? POSTS : POSTS.filter(p => p.tag === activeTag)
  const featured = filtered.find(p => p.featured)
  const rest     = filtered.filter(p => !p.featured)

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
          <BookOpen className="w-3 h-3" /> Blog Portalog
        </div>
        <h1 className="fo-fade-up fo-d100 text-4xl md:text-5xl font-extrabold tracking-tight leading-[1.1] mb-5">
          Insight untuk <span className="fo-shimmer">Industri Ekspedisi</span>
        </h1>
        <p className="fo-fade-up fo-d200 text-slate-400 text-lg max-w-xl mx-auto">
          Panduan praktis, tips operasional, dan berita terbaru seputar freight forwarding dan PPJK Indonesia.
        </p>
      </section>

      {/* TAG FILTER */}
      <div className="px-6 md:px-10 max-w-6xl mx-auto mb-10">
        <div className="flex flex-wrap gap-2">
          {TAGS.map(tag => (
            <button
              key={tag}
              onClick={() => setActiveTag(tag)}
              className={`text-sm px-4 py-1.5 rounded-full border font-medium transition-all ${
                activeTag === tag
                  ? 'bg-brand-600 border-brand-500 text-white'
                  : 'border-white/[0.08] text-slate-400 hover:text-white hover:border-white/20'
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      <div className="px-6 md:px-10 max-w-6xl mx-auto pb-24">

        {/* FEATURED POST */}
        {featured && (
          <Reveal className="mb-8">
            <Link href={`/blog/${featured.slug}`} className="group block rounded-2xl bg-slate-900/60 border border-white/[0.07] hover:border-brand-500/30 p-8 md:p-10 transition-all duration-300 hover:-translate-y-1">
              <div className="flex flex-wrap items-center gap-3 mb-4">
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${featured.tagColor}`}>
                  {featured.tag}
                </span>
                <span className="text-xs text-slate-500 font-mono">✦ Featured</span>
              </div>
              <h2 className="text-2xl md:text-3xl font-extrabold mb-3 group-hover:text-brand-300 transition-colors">{featured.title}</h2>
              <p className="text-slate-400 leading-relaxed mb-6 max-w-2xl">{featured.excerpt}</p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 text-xs text-slate-500">
                  <span className="flex items-center gap-1.5"><Tag className="w-3 h-3" />{featured.date}</span>
                  <span className="flex items-center gap-1.5"><Clock className="w-3 h-3" />{featured.readTime} baca</span>
                </div>
                <span className="text-sm text-brand-400 font-semibold flex items-center gap-1 group-hover:gap-2 transition-all">
                  Baca <ArrowRight className="w-4 h-4" />
                </span>
              </div>
            </Link>
          </Reveal>
        )}

        {/* POST GRID */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {rest.map((post, i) => (
            <Reveal key={post.slug} delay={i * 70}>
              <Link href={`/blog/${post.slug}`} className="group flex flex-col h-full rounded-2xl bg-slate-900/60 border border-white/[0.07] hover:border-brand-500/25 p-6 transition-all duration-300 hover:-translate-y-1">
                <div className="flex items-center gap-2 mb-4">
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${post.tagColor}`}>{post.tag}</span>
                </div>
                <h3 className="font-bold text-[15px] leading-snug mb-3 flex-1 group-hover:text-brand-300 transition-colors">{post.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed mb-5 line-clamp-2">{post.excerpt}</p>
                <div className="flex items-center justify-between text-xs text-slate-500 mt-auto pt-4 border-t border-white/[0.05]">
                  <span className="flex items-center gap-1.5"><Tag className="w-3 h-3" />{post.date}</span>
                  <span className="flex items-center gap-1.5"><Clock className="w-3 h-3" />{post.readTime}</span>
                </div>
              </Link>
            </Reveal>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-20 text-slate-500">
            <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>Belum ada artikel untuk kategori ini.</p>
          </div>
        )}
      </div>

      {/* FOOTER */}
      <footer className="border-t border-white/[0.06] bg-slate-900/60 px-6 md:px-10 py-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-brand-500 flex items-center justify-center font-bold text-xs text-white">F</div>
            <span className="font-bold text-sm">Forwarder<span className="text-brand-400">OS</span></span>
          </Link>
          <div className="flex gap-6 text-sm text-slate-400">
            <Link href="/tentang-kami" className="hover:text-white transition-colors">Tentang Kami</Link>
            <Link href="/blog" className="text-white">Blog</Link>
            <Link href="/karier" className="hover:text-white transition-colors">Karier</Link>
            <Link href="/kontak" className="hover:text-white transition-colors">Kontak</Link>
          </div>
          <p className="text-xs text-slate-500">© 2025 Portalog</p>
        </div>
      </footer>
    </div>
  )
}
