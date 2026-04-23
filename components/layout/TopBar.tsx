'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'
import type { CurrentUser } from '@/lib/auth'
import {
  Bell, Rocket, CheckCircle2, Search, X,
  Ship, FileText, Receipt, AlertTriangle,
  UserPlus, Clock, CheckCheck, Loader2,
} from 'lucide-react'
import { OnboardingChecklist } from '@/components/onboarding/OnboardingChecklist'
import { CommandPalette } from '@/components/search/CommandPalette'

// ─── Page titles ──────────────────────────────────────────────────────────────

const TITLES: Record<string, string> = {
  '/dashboard':          'Dashboard',
  '/dashboard-exporter': 'Dashboard Ekspor',
  '/shipments':          'Shipments',
  '/clients':            'Klien',
  '/documents':          'Dokumen',
  '/invoices':           'Invoice',
  '/laporan':            'Laporan & Analytics',
  '/settings':           'Pengaturan',
  '/onboarding':         'Setup & Onboarding',
  '/billing':            'Billing',
  '/cron':               'Cron Jobs',
}

const DISMISS_KEY = 'Portalog_onboarding_dismissed'

// ─── Notification config ──────────────────────────────────────────────────────

const NOTIF_ICON: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  shipment_status:      { icon: Ship,         color: 'text-brand-600',  bg: 'bg-brand-50'  },
  SHIPMENT_STATUS_CHANGED: { icon: Ship,      color: 'text-brand-600',  bg: 'bg-brand-50'  },
  document_uploaded:    { icon: FileText,      color: 'text-amber-600',  bg: 'bg-amber-50'  },
  document_approved:    { icon: CheckCircle2,  color: 'text-green-600',  bg: 'bg-green-50'  },
  invoice_due:          { icon: Receipt,       color: 'text-red-500',    bg: 'bg-red-50'    },
  deadline_approaching: { icon: AlertTriangle, color: 'text-orange-500', bg: 'bg-orange-50' },
  staff_joined:         { icon: UserPlus,      color: 'text-violet-600', bg: 'bg-violet-50' },
  default:              { icon: Bell,          color: 'text-slate-500',  bg: 'bg-slate-100' },
}

function getNotifIcon(type: string) {
  return NOTIF_ICON[type] ?? NOTIF_ICON.default
}

function timeAgo(dateStr: string): string {
  const diff  = Date.now() - new Date(dateStr).getTime()
  const mins  = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days  = Math.floor(diff / 86400000)
  if (mins  < 1)  return 'Baru saja'
  if (mins  < 60) return `${mins} menit lalu`
  if (hours < 24) return `${hours} jam lalu`
  if (days  < 7)  return `${days} hari lalu`
  return new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
}

// ─── Notification Panel (portal) ─────────────────────────────────────────────

interface Notification {
  id:        string
  type:      string
  title:     string
  message:   string
  isRead:    boolean
  createdAt: string
  shipment?: { referenceNo: string; status: string } | null
}

function NotificationPanel({
  anchorRef,
  onClose,
}: {
  anchorRef: React.RefObject<HTMLButtonElement | null>
  onClose:  () => void
}) {
  const router = useRouter()
  const [notifs, setNotifs]   = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [marking, setMarking] = useState(false)
  const [pos, setPos]         = useState({ top: 0, right: 0 })
  const panelRef              = useRef<HTMLDivElement>(null)

  // Position below the bell button
  useEffect(() => {
    if (!anchorRef.current) return
    const rect = anchorRef.current.getBoundingClientRect()
    setPos({
      top:   rect.bottom + window.scrollY + 8,
      right: window.innerWidth - rect.right,
    })
  }, [anchorRef])

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target as Node) &&
        anchorRef.current &&
        !anchorRef.current.contains(e.target as Node)
      ) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose, anchorRef])

  // Fetch notifications
  useEffect(() => {
    fetch('/api/notifications')
      .then(r => r.json())
      .then(d => { if (d.success) setNotifs(d.data) })
      .finally(() => setLoading(false))
  }, [])

  const markAll = async () => {
    setMarking(true)
    await fetch('/api/notifications/read', {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({}),
    })
    setNotifs(p => p.map(n => ({ ...n, isRead: true })))
    setMarking(false)
  }

  const markOne = async (id: string) => {
    fetch('/api/notifications/read', {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ id }),
    })
    setNotifs(p => p.map(n => n.id === id ? { ...n, isRead: true } : n))
  }

  const handleClick = (n: Notification) => {
    markOne(n.id)
    if (n.shipment) {
      router.push(`/shipments`)
      onClose()
    }
  }

  const unread = notifs.filter(n => !n.isRead).length

  return createPortal(
    <div
      ref={panelRef}
      className="fixed z-[9999] w-[380px] bg-white rounded-2xl border border-slate-200 overflow-hidden"
      style={{
        top:   pos.top,
        right: pos.right,
        boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-bold text-slate-900">Notifikasi</h3>
          {unread > 0 && (
            <span className="text-[10px] font-bold bg-brand-600 text-white px-2 py-0.5 rounded-full">
              {unread} baru
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {unread > 0 && (
            <button onClick={markAll} disabled={marking}
              className="flex items-center gap-1 text-[11px] font-semibold text-brand-600 hover:text-brand-700 transition-colors">
              {marking
                ? <Loader2    className="w-3 h-3 animate-spin" />
                : <CheckCheck className="w-3 h-3" />
              }
              Tandai semua dibaca
            </button>
          )}
          <button onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="max-h-[420px] overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-5 h-5 animate-spin text-brand-500" />
          </div>
        ) : notifs.length === 0 ? (
          <div className="py-12 text-center">
            <Bell className="w-8 h-8 text-slate-200 mx-auto mb-2" />
            <p className="text-sm font-medium text-slate-400">Belum ada notifikasi</p>
            <p className="text-xs text-slate-300 mt-1">Notifikasi akan muncul di sini</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {notifs.map(n => {
              const cfg  = getNotifIcon(n.type)
              const Icon = cfg.icon
              return (
                <button key={n.id} onClick={() => handleClick(n)}
                  className={cn(
                    'w-full flex items-start gap-3 px-4 py-3.5 text-left hover:bg-slate-50 transition-colors',
                    !n.isRead && 'bg-brand-50/40'
                  )}>
                  <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5', cfg.bg)}>
                    <Icon className={cn('w-4 h-4', cfg.color)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn('text-sm leading-snug',
                      !n.isRead ? 'font-semibold text-slate-900' : 'font-medium text-slate-700')}>
                      {n.title}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5 leading-relaxed line-clamp-2">
                      {n.message}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] text-slate-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />{timeAgo(n.createdAt)}
                      </span>
                      {n.shipment && (
                        <span className="text-[10px] font-mono text-brand-500 bg-brand-50 px-1.5 py-0.5 rounded">
                          {n.shipment.referenceNo}
                        </span>
                      )}
                    </div>
                  </div>
                  {!n.isRead && (
                    <div className="w-2 h-2 rounded-full bg-brand-500 shrink-0 mt-1.5" />
                  )}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {notifs.length > 0 && (
        <div className="px-4 py-3 border-t border-slate-100 bg-slate-50 text-center">
          <p className="text-[11px] text-slate-400">
            Menampilkan {notifs.length} notifikasi terbaru
          </p>
        </div>
      )}
    </div>,
    document.body
  )
}

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
      <button onClick={() => setOpen(p => !p)}
        className={cn('flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all', pillStyle)}>
        {done
          ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
          : <Rocket       className="w-3.5 h-3.5 shrink-0" />
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

// ─── Search trigger ───────────────────────────────────────────────────────────

function SearchTrigger() {
  const trigger = () => {
    document.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'k', metaKey: true, ctrlKey: false, bubbles: true,
    }))
  }

  return (
    <button onClick={trigger}
      className="hidden md:flex items-center gap-2.5 pl-3 pr-4 py-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-white hover:border-slate-300 text-slate-400 transition-all group text-sm"
      title="Cari (Cmd+K)">
      <Search className="w-3.5 h-3.5 group-hover:text-slate-500" />
      <span className="text-slate-400 group-hover:text-slate-500 text-xs">Cari...</span>
      {/* suppressHydrationWarning mencegah mismatch ⌘ vs Ctrl antar OS */}
      <div className="flex items-center gap-0.5 ml-2" suppressHydrationWarning>
        <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[9px] text-slate-400 group-hover:border-slate-300 transition-all"
          suppressHydrationWarning>⌘</kbd>
        <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[9px] text-slate-400 group-hover:border-slate-300 transition-all"
          suppressHydrationWarning>K</kbd>
      </div>
    </button>
  )
}

// ─── TopBar ───────────────────────────────────────────────────────────────────

export function TopBar({ user }: { user: CurrentUser }) {
  const pathname = usePathname()
  const base     = '/' + pathname.split('/')[1]
  const title    = TITLES[base] ?? 'Portalog'

  const [notifOpen, setNotifOpen]     = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [mounted, setMounted]         = useState(false)
  const bellRef = useRef<HTMLButtonElement>(null)

  useEffect(() => { setMounted(true) }, [])

  // Fetch unread count on mount
  useEffect(() => {
    fetch('/api/notifications')
      .then(r => r.json())
      .then(d => { if (d.success) setUnreadCount(d.unreadCount ?? 0) })
      .catch(() => {})
  }, [])

  const handleBellClick = () => {
    setNotifOpen(p => !p)
    if (!notifOpen) setUnreadCount(0)
  }

  return (
    <>
      <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-4">
          <h2 className="text-base font-semibold text-slate-800">{title}</h2>
          <SearchTrigger />
        </div>

        <div className="flex items-center gap-3">
          <OnboardingPill />

          {/* Notification bell */}
          <button
            ref={bellRef}
            onClick={handleBellClick}
            className="relative w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center transition-colors"
          >
            <Bell className="w-4 h-4 text-slate-500" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>

          {/* User info */}
          <div className="text-right">
            <p className="text-xs font-semibold text-slate-700">{user.name}</p>
            <p className="text-[10px] text-slate-400">{user.email}</p>
          </div>
        </div>
      </header>

      {/* Notification panel via portal — tidak terhalang elemen apapun */}
      {mounted && notifOpen && (
        <NotificationPanel
          anchorRef={bellRef}
          onClose={() => setNotifOpen(false)}
        />
      )}

      <CommandPalette />
    </>
  )
}
