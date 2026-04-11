import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  const orgId = user.organizationId
  const sp    = new URL(req.url).searchParams
  const year  = parseInt(sp.get('year') ?? String(new Date().getFullYear()))

  const yearStart = new Date(year, 0, 1)
  const yearEnd   = new Date(year + 1, 0, 1)

  // ── 1. Semua shipment di tahun ini ──────────────────────────────────────────
  const shipments = await prisma.shipment.findMany({
    where: { organizationId: orgId, createdAt: { gte: yearStart, lt: yearEnd } },
    select: {
      id: true, referenceNo: true, type: true, mode: true, status: true,
      totalCost: true, freightCost: true, localCharges: true, customsDuty: true,
      isPaid: true, invoiceDate: true, invoiceNo: true,
      createdAt: true, updatedAt: true, eta: true,
      client: { select: { id: true, name: true, companyName: true } },
    },
    orderBy: { createdAt: 'asc' },
  })

  // ── 2. Revenue bulanan (12 bulan) ──────────────────────────────────────────
  const monthlyRevenue = Array.from({ length: 12 }, (_, m) => {
    const monthShipments = shipments.filter(s => {
      const d = new Date(s.invoiceDate ?? s.createdAt)
      return d.getMonth() === m && s.totalCost
    })
    return {
      month:    m + 1,
      label:    new Date(year, m, 1).toLocaleString('id-ID', { month: 'short' }),
      total:    monthShipments.reduce((sum, s) => sum + (s.totalCost ?? 0), 0),
      paid:     monthShipments.filter(s => s.isPaid).reduce((sum, s) => sum + (s.totalCost ?? 0), 0),
      unpaid:   monthShipments.filter(s => !s.isPaid && s.totalCost).reduce((sum, s) => sum + (s.totalCost ?? 0), 0),
      count:    monthShipments.length,
    }
  })

  // ── 3. Shipment bulanan (volume) ──────────────────────────────────────────
  const monthlyVolume = Array.from({ length: 12 }, (_, m) => {
    const ms = shipments.filter(s => new Date(s.createdAt).getMonth() === m)
    return {
      month:    m + 1,
      label:    new Date(year, m, 1).toLocaleString('id-ID', { month: 'short' }),
      total:    ms.length,
      export:   ms.filter(s => s.type === 'EXPORT').length,
      import:   ms.filter(s => s.type === 'IMPORT').length,
      sea:      ms.filter(s => s.mode === 'SEA_FCL' || s.mode === 'SEA_LCL').length,
      air:      ms.filter(s => s.mode === 'AIR').length,
    }
  })

  // ── 4. Breakdown by status ────────────────────────────────────────────────
  const statusGroups = await prisma.shipment.groupBy({
    by: ['status'],
    where: { organizationId: orgId },
    _count: { status: true },
  })
  const byStatus = statusGroups.map(g => ({ status: g.status, count: g._count.status }))

  // ── 5. Breakdown by mode ──────────────────────────────────────────────────
  const modeGroups = await prisma.shipment.groupBy({
    by: ['mode'],
    where: { organizationId: orgId },
    _count: { mode: true },
    _sum:   { totalCost: true },
  })
  const byMode = modeGroups.map(g => ({
    mode:     g.mode,
    count:    g._count.mode,
    revenue:  g._sum.totalCost ?? 0,
  }))

  // ── 6. Top klien by shipment volume ──────────────────────────────────────
  const clientGroups = await prisma.shipment.groupBy({
    by: ['clientId'],
    where: { organizationId: orgId },
    _count: { clientId: true },
    _sum:   { totalCost: true },
    orderBy: { _count: { clientId: 'desc' } },
    take: 8,
  })
  const clientIds = clientGroups.map(g => g.clientId)
  const clientData = await prisma.client.findMany({
    where: { id: { in: clientIds } },
    select: { id: true, name: true, companyName: true },
  })
  const topClients = clientGroups.map(g => {
    const c = clientData.find(c => c.id === g.clientId)
    return {
      clientId: g.clientId,
      name:     c?.companyName || c?.name || 'Unknown',
      pic:      c?.companyName ? c.name : null,
      count:    g._count.clientId,
      revenue:  g._sum.totalCost ?? 0,
    }
  })

  // ── 7. Summary cards ────────────────────────────────────────────────────
  const totalRevenue     = shipments.reduce((s, sh) => s + (sh.totalCost ?? 0), 0)
  const paidRevenue      = shipments.filter(s => s.isPaid).reduce((s, sh) => s + (sh.totalCost ?? 0), 0)
  const unpaidRevenue    = shipments.filter(s => !s.isPaid && s.totalCost).reduce((s, sh) => s + (sh.totalCost ?? 0), 0)
  const totalShipments   = shipments.length
  const completedCount   = shipments.filter(s => s.status === 'COMPLETED' || s.status === 'DELIVERED').length
  const cancelledCount   = shipments.filter(s => s.status === 'CANCELLED').length

  // ── 8. Available years ──────────────────────────────────────────────────
  const oldest = await prisma.shipment.findFirst({
    where:   { organizationId: orgId },
    orderBy: { createdAt: 'asc' },
    select:  { createdAt: true },
  })
  const firstYear   = oldest ? new Date(oldest.createdAt).getFullYear() : year
  const currentYear = new Date().getFullYear()
  const availableYears = Array.from(
    { length: currentYear - firstYear + 1 },
    (_, i) => currentYear - i
  )

  return NextResponse.json({
    success: true,
    data: {
      year,
      availableYears,
      summary: {
        totalRevenue,
        paidRevenue,
        unpaidRevenue,
        totalShipments,
        completedCount,
        cancelledCount,
        invoicedCount: shipments.filter(s => s.invoiceNo).length,
        avgRevenue:    totalShipments > 0 ? totalRevenue / totalShipments : 0,
      },
      monthlyRevenue,
      monthlyVolume,
      byStatus,
      byMode,
      topClients,
    },
  })
}
