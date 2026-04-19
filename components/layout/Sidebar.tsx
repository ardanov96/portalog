'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { cn, getInitials } from '@/lib/utils'
import type { CurrentUser } from '@/lib/types'
import { LayoutDashboard, Ship, Users, FileText, 
  Settings, LogOut, Receipt, BarChart2, CreditCard, 
  Clock, Gift, Globe, Code2, Key } from 'lucide-react'


const NAV = [
  { href: '/dashboard',   label: 'Dashboard',   icon: LayoutDashboard },
  { href: '/shipments',   label: 'Shipments',   icon: Ship },
  { href: '/clients',     label: 'Klien',       icon: Users },
  { href: '/invoices',    label: 'Invoice',     icon: Receipt },
  { href: '/laporan',     label: 'Laporan',     icon: BarChart2 },
  { href: '/documents',   label: 'Dokumen',     icon: FileText },
  { href: '/referral',    label: 'Referral',    icon: Gift },
  { href: '/white-label', label: 'White-label', icon: Globe },
  { href: '/api-keys',    label: 'API Keys',    icon: Key },
  { href: '/developer',   label: 'API & Dev',   icon: Code2 },
]

export function Sidebar({ user }: { user: CurrentUser }) {
  const pathname = usePathname()

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    window.location.href = '/login'
  }

  return (
    <aside className="w-60 flex flex-col bg-slate-900 text-white shrink-0">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <Image
            src="/logo.png"
            alt="Portalog Logo"
            width={250}
            height={154}
            className="h-8 w-auto object-contain transition-all duration-200 hover:opacity-80"
            priority
          />
          <div className="min-w-0">
            <p className="text-sm font-bold truncate">{user.organization.name}</p>
            <p className="text-[10px] text-slate-400 uppercase tracking-wider">Portalog</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {NAV.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link key={item.href} href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                active ? 'bg-brand-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'
              )}>
              <item.icon className="w-4 h-4 shrink-0" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* Bottom */}
      <div className="px-3 py-4 border-t border-slate-800 space-y-0.5">
        <Link href="/billing" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors">
          <CreditCard className="w-4 h-4" /> Billing
        </Link>
        <Link href="/cron" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors">
          <Clock className="w-4 h-4" /> Cron Jobs
        </Link>
        <Link href="/settings" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors">
          <Settings className="w-4 h-4" /> Pengaturan
        </Link>
        <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:text-red-400 hover:bg-slate-800 transition-colors">
          <LogOut className="w-4 h-4" /> Keluar
        </button>
        <div className="flex items-center gap-3 px-3 py-2.5 mt-2 rounded-lg bg-slate-800">
          <div className="w-7 h-7 rounded-full bg-brand-500 flex items-center justify-center text-xs font-bold shrink-0">
            {getInitials(user.name)}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold truncate">{user.name}</p>
            <p className="text-[10px] text-slate-400">{user.role}</p>
          </div>
        </div>
      </div>
    </aside>
  )
}
