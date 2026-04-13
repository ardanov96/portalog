import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export type SearchResultType = 'shipment' | 'client' | 'document' | 'page'

export interface SearchResult {
  id:       string
  type:     SearchResultType
  title:    string
  subtitle: string
  meta?:    string
  href:     string
  status?:  string
  mode?:    string
}

// Static page shortcuts
const PAGES: SearchResult[] = [
  { id: 'p-dashboard',    type: 'page', title: 'Dashboard',           subtitle: 'Ringkasan operasional',     href: '/dashboard',      meta: 'Halaman' },
  { id: 'p-shipments',   type: 'page', title: 'Daftar Shipment',     subtitle: 'Semua pengiriman',           href: '/shipments',      meta: 'Halaman' },
  { id: 'p-new',         type: 'page', title: 'Buat Shipment Baru',  subtitle: 'Mulai pengiriman baru',      href: '/shipments/new',  meta: 'Aksi'    },
  { id: 'p-clients',     type: 'page', title: 'Klien',               subtitle: 'Manajemen klien & buyer',   href: '/clients',        meta: 'Halaman' },
  { id: 'p-documents',   type: 'page', title: 'Dokumen',             subtitle: 'Semua dokumen',             href: '/documents',      meta: 'Halaman' },
  { id: 'p-invoices',    type: 'page', title: 'Invoice',             subtitle: 'Manajemen invoice',         href: '/invoices',       meta: 'Halaman' },
  { id: 'p-laporan',     type: 'page', title: 'Laporan & Analytics', subtitle: 'Grafik dan data performa',  href: '/laporan',        meta: 'Halaman' },
  { id: 'p-billing',     type: 'page', title: 'Billing',             subtitle: 'Paket dan pembayaran',      href: '/billing',        meta: 'Halaman' },
  { id: 'p-settings',    type: 'page', title: 'Pengaturan',          subtitle: 'Organisasi dan profil',     href: '/settings',       meta: 'Halaman' },
  { id: 'p-onboarding',  type: 'page', title: 'Setup & Onboarding',  subtitle: 'Panduan memulai',            href: '/onboarding',     meta: 'Halaman' },
]

const STATUS_LABEL: Record<string, string> = {
  DRAFT: 'Draft', BOOKING_CONFIRMED: 'Booking', DOCS_IN_PROGRESS: 'Dokumen',
  CUSTOMS_PROCESSING: 'Bea Cukai', CARGO_RELEASED: 'Released',
  IN_TRANSIT: 'In Transit', ARRIVED: 'Tiba', DELIVERED: 'Terkirim',
  COMPLETED: 'Selesai', CANCELLED: 'Batal',
}

export async function GET(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  const q     = new URL(req.url).searchParams.get('q')?.trim() ?? ''
  const orgId = user.organizationId

  // Empty query → return quick-access pages only
  if (q.length < 2) {
    return NextResponse.json({
      success: true,
      data: {
        pages:    PAGES.slice(0, 6),
        shipments:[], clients: [], documents: [],
        total: 6,
      },
    })
  }

  // Run all searches in parallel
  const [shipments, clients, documents] = await Promise.all([

    prisma.shipment.findMany({
      where: {
        organizationId: orgId,
        OR: [
          { referenceNo:      { contains: q, mode: 'insensitive' } },
          { cargoDescription: { contains: q, mode: 'insensitive' } },
          { vesselName:       { contains: q, mode: 'insensitive' } },
          { hsCode:           { contains: q, mode: 'insensitive' } },
          { originPort:       { contains: q, mode: 'insensitive' } },
          { destinationPort:  { contains: q, mode: 'insensitive' } },
          { client: { name:   { contains: q, mode: 'insensitive' } } },
          { client: { companyName: { contains: q, mode: 'insensitive' } } },
          { invoiceNo:        { contains: q, mode: 'insensitive' } },
          { pibNo:            { contains: q, mode: 'insensitive' } },
          { pebNo:            { contains: q, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true, referenceNo: true, type: true, mode: true, status: true,
        cargoDescription: true, eta: true,
        client: { select: { name: true, companyName: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 8,
    }),

    prisma.client.findMany({
      where: {
        organizationId: orgId,
        isActive: true,
        OR: [
          { name:        { contains: q, mode: 'insensitive' } },
          { companyName: { contains: q, mode: 'insensitive' } },
          { email:       { contains: q, mode: 'insensitive' } },
          { npwp:        { contains: q, mode: 'insensitive' } },
          { phone:       { contains: q, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true, name: true, companyName: true, email: true, country: true,
        _count: { select: { shipments: true } },
      },
      orderBy: { name: 'asc' },
      take: 5,
    }),

    prisma.document.findMany({
      where: {
        shipment: { organizationId: orgId },
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { shipment: { referenceNo: { contains: q, mode: 'insensitive' } } },
        ],
      },
      select: {
        id: true, name: true, type: true, status: true,
        shipment: { select: { id: true, referenceNo: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 4,
    }),
  ])

  // Filter pages that match query
  const matchedPages = PAGES.filter(p =>
    p.title.toLowerCase().includes(q.toLowerCase()) ||
    p.subtitle.toLowerCase().includes(q.toLowerCase())
  )

  // Shape results
  const shipmentResults: SearchResult[] = shipments.map(s => ({
    id:       s.id,
    type:     'shipment',
    title:    s.referenceNo,
    subtitle: s.client.companyName ?? s.client.name,
    meta:     STATUS_LABEL[s.status] ?? s.status,
    href:     `/shipments/${s.id}`,
    status:   s.status,
    mode:     s.mode,
  }))

  const clientResults: SearchResult[] = clients.map(c => ({
    id:       c.id,
    type:     'client',
    title:    c.companyName ?? c.name,
    subtitle: c.email ?? c.country ?? '',
    meta:     `${c._count.shipments} shipment`,
    href:     `/clients/${c.id}`,
  }))

  const documentResults: SearchResult[] = documents.map(d => ({
    id:       d.id,
    type:     'document',
    title:    d.name,
    subtitle: `Shipment: ${d.shipment.referenceNo}`,
    meta:     d.status,
    href:     `/shipments/${d.shipment.id}?tab=docs`,
  }))

  return NextResponse.json({
    success: true,
    data: {
      pages:     matchedPages.slice(0, 3),
      shipments: shipmentResults,
      clients:   clientResults,
      documents: documentResults,
      total:     matchedPages.length + shipmentResults.length + clientResults.length + documentResults.length,
    },
  })
}
