import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// SheetJS (xlsx) diimport secara dinamis agar tidak membebani bundle server
// Install: npm install xlsx  (atau sudah ada karena SheetJS pakai via CDN di client)
// Kalau belum ada: npm install xlsx --save

const STATUS_LABEL: Record<string, string> = {
  DRAFT: 'Draft', BOOKING_CONFIRMED: 'Booking Dikonfirmasi',
  DOCS_IN_PROGRESS: 'Dokumen Diproses', CUSTOMS_PROCESSING: 'Proses Bea Cukai',
  CARGO_RELEASED: 'Kargo Dilepaskan', IN_TRANSIT: 'Dalam Perjalanan',
  ARRIVED: 'Telah Tiba', DELIVERED: 'Terkirim',
  COMPLETED: 'Selesai', CANCELLED: 'Dibatalkan',
}
const MODE_LABEL: Record<string, string> = {
  SEA_FCL: 'Sea FCL', SEA_LCL: 'Sea LCL', AIR: 'Air Cargo', LAND: 'Darat',
}

function fmtDate(d?: Date | string | null): string {
  if (!d) return ''
  try { return new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' }) }
  catch { return '' }
}

function fmtNum(n?: number | null): number { return n ?? 0 }

export async function GET(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  const sp   = new URL(req.url).searchParams
  const year = parseInt(sp.get('year') ?? String(new Date().getFullYear()))
  const type = sp.get('type') ?? 'full'  // 'full' | 'shipments' | 'revenue' | 'clients'

  const orgId     = user.organizationId
  const yearStart = new Date(year, 0, 1)
  const yearEnd   = new Date(year + 1, 0, 1)

  // ── Fetch data ──────────────────────────────────────────────────────────────
  const [shipments, org] = await Promise.all([
    prisma.shipment.findMany({
      where:   { organizationId: orgId, createdAt: { gte: yearStart, lt: yearEnd } },
      include: { client: { select: { name: true, companyName: true, country: true } } },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.organization.findUnique({
      where:  { id: orgId },
      select: { name: true },
    }),
  ])

  // ── Build workbook dengan SheetJS ────────────────────────────────────────────
  const XLSX = await import('xlsx')
  const wb   = XLSX.utils.book_new()

  // ─── Sheet 1: Ringkasan ────────────────────────────────────────────────────
  const totalRevenue   = shipments.reduce((s, x) => s + fmtNum(x.totalCost), 0)
  const paidRevenue    = shipments.filter(x => x.isPaid).reduce((s, x) => s + fmtNum(x.totalCost), 0)
  const completedCount = shipments.filter(x => ['COMPLETED', 'DELIVERED'].includes(x.status)).length
  const invoicedCount  = shipments.filter(x => x.invoiceNo).length

  const summaryData = [
    ['ForwarderOS — Laporan Ekspor'],
    [`Organisasi: ${org?.name ?? '-'}`],
    [`Periode: Tahun ${year}`],
    [`Dicetak: ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`],
    [],
    ['RINGKASAN TAHUN', year],
    [],
    ['Metrik', 'Nilai'],
    ['Total Shipment', shipments.length],
    ['Shipment Selesai', completedCount],
    ['Shipment Dibatalkan', shipments.filter(x => x.status === 'CANCELLED').length],
    ['Total Invoice', invoicedCount],
    ['Total Revenue (Rp)', totalRevenue],
    ['Revenue Dibayar (Rp)', paidRevenue],
    ['Revenue Belum Dibayar (Rp)', totalRevenue - paidRevenue],
    ['Rata-rata Revenue per Shipment (Rp)', invoicedCount > 0 ? Math.round(totalRevenue / invoicedCount) : 0],
    [],
    ['VOLUME PER BULAN'],
    [],
    ['Bulan', 'Total Shipment', 'Ekspor', 'Impor', 'Sea FCL', 'Sea LCL', 'Air', 'Darat', 'Revenue (Rp)'],
  ]

  const months = Array.from({ length: 12 }, (_, m) => {
    const ms = shipments.filter(s => new Date(s.createdAt).getMonth() === m)
    return [
      new Date(year, m, 1).toLocaleString('id-ID', { month: 'long' }),
      ms.length,
      ms.filter(s => s.type === 'EXPORT').length,
      ms.filter(s => s.type === 'IMPORT').length,
      ms.filter(s => s.mode === 'SEA_FCL').length,
      ms.filter(s => s.mode === 'SEA_LCL').length,
      ms.filter(s => s.mode === 'AIR').length,
      ms.filter(s => s.mode === 'LAND').length,
      ms.reduce((sum, s) => sum + fmtNum(s.totalCost), 0),
    ]
  })

  const wsSummary = XLSX.utils.aoa_to_sheet([...summaryData, ...months])

  // Style: lebar kolom
  wsSummary['!cols'] = [{ wch: 32 }, { wch: 18 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 20 }]
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Ringkasan')

  // ─── Sheet 2: Daftar Shipment ──────────────────────────────────────────────
  const shipmentHeader = [
    'No.', 'No. Referensi', 'Tanggal Dibuat', 'Klien / Buyer',
    'Tipe', 'Moda', 'Status', 'Asal', 'Tujuan', 'Kapal / Penerbangan',
    'ETD', 'ETA', 'HS Code', 'Berat (kg)', 'Koli',
    'No. Invoice', 'Tanggal Invoice', 'Freight Cost (Rp)', 'Local Charges (Rp)',
    'Bea Cukai (Rp)', 'Total Revenue (Rp)', 'Sudah Dibayar',
    'No. PIB / PEB',
  ]

  const shipmentRows = shipments.map((s, i) => [
    i + 1,
    s.referenceNo,
    fmtDate(s.createdAt),
    s.client.companyName ?? s.client.name,
    s.type === 'EXPORT' ? 'Ekspor' : 'Impor',
    MODE_LABEL[s.mode] ?? s.mode,
    STATUS_LABEL[s.status] ?? s.status,
    [s.originCountry, s.originPort].filter(Boolean).join(' / ') || '',
    [s.destinationCountry, s.destinationPort].filter(Boolean).join(' / ') || '',
    [s.vesselName, s.voyageNo].filter(Boolean).join(' / ') || '',
    fmtDate(s.etd),
    fmtDate(s.eta),
    s.hsCode ?? '',
    fmtNum(s.grossWeight),
    fmtNum(s.packageCount),
    s.invoiceNo ?? '',
    fmtDate(s.invoiceDate),
    fmtNum(s.freightCost),
    fmtNum(s.localCharges),
    fmtNum(s.customsDuty),
    fmtNum(s.totalCost),
    s.isPaid ? 'Ya' : 'Belum',
    [s.pibNo, s.pebNo].filter(Boolean).join(' / ') || '',
  ])

  const wsShipments = XLSX.utils.aoa_to_sheet([shipmentHeader, ...shipmentRows])
  wsShipments['!cols'] = [
    { wch: 5 }, { wch: 18 }, { wch: 14 }, { wch: 28 },
    { wch: 10 }, { wch: 12 }, { wch: 20 }, { wch: 16 }, { wch: 16 }, { wch: 22 },
    { wch: 12 }, { wch: 12 }, { wch: 14 }, { wch: 12 }, { wch: 8 },
    { wch: 16 }, { wch: 14 }, { wch: 18 }, { wch: 18 },
    { wch: 16 }, { wch: 18 }, { wch: 14 },
    { wch: 18 },
  ]
  // Freeze header row
  wsShipments['!freeze'] = { xSplit: 0, ySplit: 1 }
  XLSX.utils.book_append_sheet(wb, wsShipments, 'Daftar Shipment')

  // ─── Sheet 3: Revenue per Klien ───────────────────────────────────────────
  const clientMap = new Map<string, { name: string; count: number; revenue: number; paid: number; lastDate: string }>()
  for (const s of shipments) {
    const key = s.clientId
    const existing = clientMap.get(key)
    const rev = fmtNum(s.totalCost)
    if (existing) {
      existing.count++
      existing.revenue += rev
      if (s.isPaid) existing.paid += rev
      if (s.createdAt > new Date(existing.lastDate)) existing.lastDate = fmtDate(s.createdAt)
    } else {
      clientMap.set(key, {
        name:     s.client.companyName ?? s.client.name,
        count:    1,
        revenue:  rev,
        paid:     s.isPaid ? rev : 0,
        lastDate: fmtDate(s.createdAt),
      })
    }
  }

  const clientHeader = ['No.', 'Nama Klien / Buyer', 'Total Shipment', 'Revenue (Rp)', 'Revenue Dibayar (Rp)', 'Belum Dibayar (Rp)', 'Shipment Terakhir']
  const clientRows   = Array.from(clientMap.values())
    .sort((a, b) => b.revenue - a.revenue)
    .map((c, i) => [i + 1, c.name, c.count, c.revenue, c.paid, c.revenue - c.paid, c.lastDate])

  const wsClients = XLSX.utils.aoa_to_sheet([clientHeader, ...clientRows])
  wsClients['!cols'] = [{ wch: 5 }, { wch: 30 }, { wch: 16 }, { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 18 }]
  wsClients['!freeze'] = { xSplit: 0, ySplit: 1 }
  XLSX.utils.book_append_sheet(wb, wsClients, 'Revenue per Klien')

  // ─── Sheet 4: Revenue per Bulan (detail) ─────────────────────────────────
  const revHeader = ['Bulan', 'Total Shipment', 'Diinvoice', 'Revenue Total (Rp)', 'Dibayar (Rp)', 'Belum Dibayar (Rp)', 'Ekspor', 'Impor']
  const revRows   = Array.from({ length: 12 }, (_, m) => {
    const ms  = shipments.filter(s => new Date(s.createdAt).getMonth() === m)
    const inv = ms.filter(s => s.invoiceNo)
    return [
      new Date(year, m, 1).toLocaleString('id-ID', { month: 'long', year: 'numeric' }),
      ms.length,
      inv.length,
      inv.reduce((sum, s) => sum + fmtNum(s.totalCost), 0),
      inv.filter(s => s.isPaid).reduce((sum, s) => sum + fmtNum(s.totalCost), 0),
      inv.filter(s => !s.isPaid).reduce((sum, s) => sum + fmtNum(s.totalCost), 0),
      ms.filter(s => s.type === 'EXPORT').length,
      ms.filter(s => s.type === 'IMPORT').length,
    ]
  })
  // Total row
  const totalRow = [
    `TOTAL ${year}`,
    shipments.length,
    shipments.filter(s => s.invoiceNo).length,
    totalRevenue,
    paidRevenue,
    totalRevenue - paidRevenue,
    shipments.filter(s => s.type === 'EXPORT').length,
    shipments.filter(s => s.type === 'IMPORT').length,
  ]

  const wsRevenue = XLSX.utils.aoa_to_sheet([revHeader, ...revRows, [], totalRow])
  wsRevenue['!cols'] = [{ wch: 22 }, { wch: 16 }, { wch: 12 }, { wch: 20 }, { wch: 18 }, { wch: 20 }, { wch: 10 }, { wch: 10 }]
  wsRevenue['!freeze'] = { xSplit: 0, ySplit: 1 }
  XLSX.utils.book_append_sheet(wb, wsRevenue, 'Revenue Bulanan')

  // ── Generate file ────────────────────────────────────────────────────────────
  const buf      = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
  const orgSlug  = org?.name?.replace(/\s+/g, '_').toLowerCase() ?? 'laporan'
  const filename = `ForwarderOS_${orgSlug}_${year}.xlsx`

  return new NextResponse(buf, {
    status: 200,
    headers: {
      'Content-Type':        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length':      String(buf.length),
    },
  })
}
