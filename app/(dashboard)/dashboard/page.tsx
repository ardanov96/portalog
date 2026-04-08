import type { Metadata } from 'next'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { formatDate } from '@/lib/utils'
import { ShipmentStatus } from '@prisma/client'
import { Package, Clock, FileWarning, CheckCircle2, AlertTriangle, TrendingUp, Ship, Plane } from 'lucide-react'
import Link from 'next/link'

export const metadata: Metadata = { title: 'Dashboard' }

const ACTIVE: ShipmentStatus[] = ['BOOKING_CONFIRMED','DOCS_IN_PROGRESS','CUSTOMS_PROCESSING','CARGO_RELEASED','IN_TRANSIT','ARRIVED']

const STATUS_LABEL: Record<ShipmentStatus, string> = {
  DRAFT:'Draft', BOOKING_CONFIRMED:'Booking', DOCS_IN_PROGRESS:'Dokumen',
  CUSTOMS_PROCESSING:'Bea Cukai', CARGO_RELEASED:'Released', IN_TRANSIT:'In Transit',
  ARRIVED:'Tiba', DELIVERED:'Dikirim', COMPLETED:'Selesai', CANCELLED:'Batal',
}
const STATUS_COLOR: Record<ShipmentStatus, string> = {
  DRAFT:'bg-slate-100 text-slate-600', BOOKING_CONFIRMED:'bg-blue-100 text-blue-700',
  DOCS_IN_PROGRESS:'bg-amber-100 text-amber-700', CUSTOMS_PROCESSING:'bg-orange-100 text-orange-700',
  CARGO_RELEASED:'bg-teal-100 text-teal-700', IN_TRANSIT:'bg-indigo-100 text-indigo-700',
  ARRIVED:'bg-purple-100 text-purple-700', DELIVERED:'bg-green-100 text-green-700',
  COMPLETED:'bg-green-100 text-green-800', CANCELLED:'bg-red-100 text-red-700',
}

export default async function DashboardPage() {
  const user = await getCurrentUser()
  if (!user) return null
  const orgId = user.organizationId
  const now   = new Date()
  const som   = new Date(now.getFullYear(), now.getMonth(), 1)
  const in3d  = new Date(now.getTime() + 3 * 86_400_000)

  const [total, active, completed, pendingDocs, recent, deadlines, activity] = await Promise.all([
    prisma.shipment.count({ where: { organizationId: orgId } }),
    prisma.shipment.count({ where: { organizationId: orgId, status: { in: ACTIVE } } }),
    prisma.shipment.count({ where: { organizationId: orgId, status: 'COMPLETED', updatedAt: { gte: som } } }),
    prisma.document.count({ where: { status: { in: ['PENDING','UNDER_REVIEW'] }, shipment: { organizationId: orgId } } }),
    prisma.shipment.findMany({
      where: { organizationId: orgId }, orderBy: { createdAt: 'desc' }, take: 6,
      select: { id: true, referenceNo: true, type: true, mode: true, status: true, eta: true,
        client: { select: { name: true, companyName: true } }, _count: { select: { documents: true } } },
    }),
    prisma.shipment.findMany({
      where: { organizationId: orgId, status: { in: ACTIVE },
        OR: [{ customsDeadline: { gte: now, lte: in3d } }, { eta: { gte: now, lte: in3d } }] },
      select: { id: true, referenceNo: true, eta: true, customsDeadline: true, client: { select: { name: true } } },
      orderBy: { eta: 'asc' }, take: 4,
    }),
    prisma.activityLog.findMany({
      where: { shipment: { organizationId: orgId } }, orderBy: { createdAt: 'desc' }, take: 8,
      include: { shipment: { select: { referenceNo: true } } },
    }),
  ])

  const stats = [
    { label: 'Total Shipment',    value: total,       icon: Package,      bg: 'bg-brand-50',  color: 'text-brand-600' },
    { label: 'Aktif',             value: active,      icon: Clock,        bg: 'bg-amber-50',  color: 'text-amber-600' },
    { label: 'Dokumen Pending',   value: pendingDocs, icon: FileWarning,  bg: 'bg-red-50',    color: 'text-red-600' },
    { label: 'Selesai Bulan Ini', value: completed,   icon: CheckCircle2, bg: 'bg-green-50',  color: 'text-green-600' },
  ]

  return (
    <div className="space-y-6 max-w-7xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Selamat datang, {user.name.split(' ')[0]} 👋</h1>
        <p className="text-slate-500 text-sm">{user.organization.name}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-slate-200 p-5">
            <div className={`w-9 h-9 rounded-lg ${s.bg} flex items-center justify-center mb-3`}>
              <s.icon className={`w-5 h-5 ${s.color}`} />
            </div>
            <p className="text-2xl font-bold text-slate-900">{s.value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent shipments */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-semibold text-slate-800 text-sm">Shipment Terbaru</h2>
            <Link href="/shipments" className="text-xs text-brand-600 font-semibold hover:underline">Lihat semua →</Link>
          </div>
          <div className="divide-y divide-slate-50">
            {recent.length === 0 && <p className="text-center text-slate-400 text-sm py-10">Belum ada shipment</p>}
            {recent.map((s) => (
              <Link key={s.id} href={`/shipments/${s.id}`} className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50 transition-colors">
                <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                  {s.mode === 'AIR' ? <Plane className="w-4 h-4 text-slate-500" /> : <Ship className="w-4 h-4 text-slate-500" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800">{s.referenceNo}</p>
                  <p className="text-xs text-slate-400 truncate">{s.client.companyName || s.client.name}</p>
                </div>
                <div className="text-right shrink-0">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_COLOR[s.status]}`}>{STATUS_LABEL[s.status]}</span>
                  {s.eta && <p className="text-[10px] text-slate-400 mt-0.5">ETA {formatDate(s.eta)}</p>}
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-4">
          {/* Deadlines */}
          <div className="bg-white rounded-xl border border-slate-200">
            <div className="px-4 py-3.5 border-b border-slate-100 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <h2 className="font-semibold text-slate-800 text-sm">Deadline 3 Hari ke Depan</h2>
            </div>
            {deadlines.length === 0
              ? <p className="text-center text-slate-400 text-xs py-6">Tidak ada deadline mendesak</p>
              : deadlines.map((s) => (
                <Link key={s.id} href={`/shipments/${s.id}`} className="flex items-center justify-between px-4 py-3 hover:bg-slate-50 border-b border-slate-50 last:border-0">
                  <div>
                    <p className="text-xs font-semibold text-slate-800">{s.referenceNo}</p>
                    <p className="text-[10px] text-slate-400">{s.client.name}</p>
                  </div>
                  <div className="text-right">
                    {s.customsDeadline && <p className="text-[10px] font-bold text-red-600">Bea cukai: {formatDate(s.customsDeadline)}</p>}
                    {s.eta && <p className="text-[10px] text-amber-600">ETA: {formatDate(s.eta)}</p>}
                  </div>
                </Link>
              ))
            }
          </div>

          {/* Activity */}
          <div className="bg-white rounded-xl border border-slate-200">
            <div className="px-4 py-3.5 border-b border-slate-100 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-brand-500" />
              <h2 className="font-semibold text-slate-800 text-sm">Aktivitas Terbaru</h2>
            </div>
            {activity.map((log) => (
              <div key={log.id} className="px-4 py-3 border-b border-slate-50 last:border-0">
                <p className="text-xs text-slate-700">{log.description}</p>
                {log.shipment?.referenceNo && <p className="text-[10px] text-brand-500 font-semibold mt-0.5">{log.shipment.referenceNo}</p>}
                <p className="text-[10px] text-slate-400 mt-0.5">{formatDate(log.createdAt)}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
