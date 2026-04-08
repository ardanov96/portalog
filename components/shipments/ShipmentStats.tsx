'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import type { ShipmentStatus } from '@/types'

type StatusCount = { status: ShipmentStatus; count: number }

const ACTIVE_STATUSES: ShipmentStatus[] = [
  'BOOKING_CONFIRMED', 'DOCS_IN_PROGRESS', 'CUSTOMS_PROCESSING',
  'CARGO_RELEASED', 'IN_TRANSIT', 'ARRIVED',
]

export function ShipmentStats({ onFilterStatus }: { onFilterStatus: (status: string) => void }) {
  const [counts, setCounts]   = useState<StatusCount[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/dashboard')
      .then((r) => r.json())
      .then((d) => { if (d.success) setCounts(d.data.shipmentsByStatus) })
      .finally(() => setLoading(false))
  }, [])

  const total  = counts.reduce((s, c) => s + c.count, 0)
  const active = counts.filter((c) => ACTIVE_STATUSES.includes(c.status)).reduce((s, c) => s + c.count, 0)
  const done   = counts.find((c) => c.status === 'COMPLETED')?.count ?? 0
  const draft  = counts.find((c) => c.status === 'DRAFT')?.count ?? 0

  const stats = [
    { label: 'Total', value: total,  status: '',           color: 'text-slate-700', bg: 'bg-slate-50',  border: 'border-slate-200' },
    { label: 'Aktif', value: active, status: 'IN_TRANSIT', color: 'text-blue-700',  bg: 'bg-blue-50',   border: 'border-blue-100' },
    { label: 'Draft', value: draft,  status: 'DRAFT',      color: 'text-amber-700', bg: 'bg-amber-50',  border: 'border-amber-100' },
    { label: 'Selesai', value: done, status: 'COMPLETED',  color: 'text-green-700', bg: 'bg-green-50',  border: 'border-green-100' },
  ]

  if (loading) {
    return (
      <div className="grid grid-cols-4 gap-3">
        {[1,2,3,4].map((i) => (
          <div key={i} className="h-16 bg-slate-100 rounded-xl animate-pulse" />
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {stats.map((s) => (
        <button
          key={s.label}
          onClick={() => onFilterStatus(s.status)}
          className={cn(
            'text-left px-4 py-3 rounded-xl border transition-all hover:shadow-sm active:scale-[0.98]',
            s.bg, s.border
          )}
        >
          <p className={cn('text-2xl font-bold', s.color)}>{s.value}</p>
          <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
        </button>
      ))}
    </div>
  )
}
