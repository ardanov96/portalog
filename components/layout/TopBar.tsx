'use client'

import { usePathname } from 'next/navigation'
import type { CurrentUser } from '@/lib/auth'
import { Bell } from 'lucide-react'

const TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/shipments': 'Shipments',
  '/clients':   'Klien',
  '/documents': 'Dokumen',
  '/settings':  'Pengaturan',
}

export function TopBar({ user }: { user: CurrentUser }) {
  const pathname  = usePathname()
  const base      = '/' + pathname.split('/')[1]
  const title     = TITLES[base] ?? 'ForwarderOS'

  return (
    <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0">
      <h2 className="text-base font-semibold text-slate-800">{title}</h2>
      <div className="flex items-center gap-3">
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
  )
}
