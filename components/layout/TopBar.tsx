'use client'

import { usePathname } from 'next/navigation'
import { useState, useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'
import type { CurrentUser } from '@/lib/auth'
import { Bell, Rocket, CheckCircle2, Search } from 'lucide-react'
import { OnboardingChecklist } from '@/components/onboarding/OnboardingChecklist'
import { CommandPalette } from '@/components/search/CommandPalette'

const TITLES: Record<string, string> = {
  '/dashboard':         'Dashboard',
  '/dashboard-exporter':'Dashboard Ekspor',
  '/shipments':         'Shipments',
  '/clients':           'Klien',
  '/documents':         'Dokumen',
  '/invoices':          'Invoice',
  '/laporan':           'Laporan & Analytics',
  '/settings':          'Pengaturan',
  '/onboarding':        'Setup & Onboarding',
  '/billing':           'Billing',
  '/cron':              'Cron Jobs',
}

const DISMISS_KEY = 'forwarderos_onboarding_dismissed'

// ─── Onboarding pill ──────────────────────────────────────────────────────────

function OnboardingPill() {
  const [pct, setPct]             = useState<number | null>(null)
  const [done, setDone]           = useState(false)
  const [open, setOpen]           = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const panelRef                  = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const wasDismissed = localStorage.getItem(DISMISS_KEY) === 'true'
    if (wasDismissed) { setDismissed(true); return }

    fetch('/api/onboarding')
      .then(r => r.json())
      .then(d => {
        if (!d.success) return
        setPct(Math.round((d.data.earnedPoints / d.data.totalPoints) * 100))
        setDone(d.data.completed)
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  if (dismissed || pct === null) return null

  const pillStyle = done
    ? 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100'
    : pct >= 50
    ? 'bg-brand-50 border-brand-200 text-brand-700 hover:bg-brand-100'
    : 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100'

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setOpen(p => !p)}
        className={cn('flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all', pillStyle)}
      >
        {done
          ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
          : <Rocket className="w-3.5 h-3.5 shrink-0" />
        }
        <span className="hidden sm:inline whitespace-nowrap">
          {done ? 'Setup selesai!' : `Setup ${pct}%`}
        </span>
        {!done && (
          <div className="w-10 h-1.5 bg-current/20 rounded-full overflow-hidden hidden sm:block">
            <div className="h-full bg-current rounded-full" style={{ width: `${pct}%` }} />
          </div>
        )}
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-2 w-[420px] max-h-[80vh] overflow-y-auto bg-white rounded-2xl border border-slate-200 shadow-2xl z-50 p-5"
          style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.12)' }}
        >
          <OnboardingChecklist onClose={() => setOpen(false)} />
        </div>
      )}
    </div>
  )
}

// ─── Search trigger button ────────────────────────────────────────────────────

function SearchTrigger() {
  const [, forceOpen] = useState(false)

  const trigger = () => {
    // Dispatch keyboard event to activate CommandPalette's global listener
    window.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'k', metaKey: true, ctrlKey: false, bubbles: true,
    }))
  }

  return (
    <button
      onClick={trigger}
      className="hidden md:flex items-center gap-2.5 pl-3 pr-4 py-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-white hover:border-slate-300 text-slate-400 transition-all group text-sm"
      title="Cari (Cmd+K)"
    >
      <Search className="w-3.5 h-3.5 group-hover:text-slate-500" />
      <span className="text-slate-400 group-hover:text-slate-500 text-xs">Cari...</span>
      <div className="flex items-center gap-0.5 ml-2">
        <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[9px] text-slate-400 group-hover:border-slate-300 transition-all">⌘</kbd>
        <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[9px] text-slate-400 group-hover:border-slate-300 transition-all">K</kbd>
      </div>
    </button>
  )
}

// ─── TopBar ────────────────────────────────────────────────────────────────────

export function TopBar({ user }: { user: CurrentUser }) {
  const pathname = usePathname()
  const base     = '/' + pathname.split('/')[1]
  const title    = TITLES[base] ?? 'ForwarderOS'

  return (
    <>
      <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-4">
          <h2 className="text-base font-semibold text-slate-800">{title}</h2>
          <SearchTrigger />
        </div>
        <div className="flex items-center gap-3">
          <OnboardingPill />
          <button className="relative w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center transition-colors">
            <Bell className="w-4 h-4 text-slate-500" />
            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-red-500 rounded-full" />
          </button>
          <div className="text-right">
            <p className="text-xs font-semibold text-slate-700">{user.name}</p>
            <p className="text-[10px] text-slate-400">{user.email}</p>
          </div>
        </div>
      </header>

      {/* CommandPalette mounted once globally inside header */}
      <CommandPalette />
    </>
  )
}
