import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export type OnboardingStep = {
  id:          string
  title:       string
  description: string
  done:        boolean
  href?:       string
  cta:         string
  points:      number
}

export type OnboardingStatus = {
  completed:   boolean
  dismissed:   boolean
  totalPoints: number
  earnedPoints: number
  steps:       OnboardingStep[]
}

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  const orgId = user.organizationId

  // Check semua kondisi secara paralel
  const [org, clientCount, shipmentCount, documentCount, portalClient, invoicedShipment] =
    await Promise.all([
      prisma.organization.findUnique({ where: { id: orgId } }),
      prisma.client.count({ where: { organizationId: orgId } }),
      prisma.shipment.count({ where: { organizationId: orgId } }),
      prisma.document.count({ where: { shipment: { organizationId: orgId } } }),
      prisma.client.findFirst({ where: { organizationId: orgId, portalEmail: { not: null } } }),
      prisma.shipment.findFirst({ where: { organizationId: orgId, invoiceNo: { not: null } } }),
    ])

  const orgComplete = !!(org?.phone || org?.email || org?.npwp || org?.city)

  const steps: OnboardingStep[] = [
    {
      id:          'org_profile',
      title:       'Lengkapi profil organisasi',
      description: 'Tambahkan nomor telepon, email, NPWP, dan kota untuk profil perusahaan yang profesional.',
      done:        orgComplete,
      href:        '/settings',
      cta:         'Buka Pengaturan',
      points:      15,
    },
    {
      id:          'add_client',
      title:       'Tambahkan klien pertama',
      description: 'Daftarkan importir atau eksportir pertama Anda. Data klien dipakai untuk shipment dan invoice.',
      done:        clientCount > 0,
      href:        '/clients',
      cta:         'Tambah Klien',
      points:      20,
    },
    {
      id:          'create_shipment',
      title:       'Buat shipment pertama',
      description: 'Rekam pengiriman pertama Anda — ekspor atau impor, sea atau air.',
      done:        shipmentCount > 0,
      href:        '/shipments/new',
      cta:         'Buat Shipment',
      points:      25,
    },
    {
      id:          'upload_document',
      title:       'Upload dokumen shipment',
      description: 'Upload BL, Commercial Invoice, atau Packing List untuk shipment yang sudah dibuat.',
      done:        documentCount > 0,
      href:        shipmentCount > 0 ? '/shipments' : undefined,
      cta:         'Buka Shipment',
      points:      20,
    },
    {
      id:          'activate_portal',
      title:       'Aktifkan portal klien',
      description: 'Beri akses portal tracking ke salah satu klien agar mereka bisa pantau status sendiri.',
      done:        !!portalClient,
      href:        clientCount > 0 ? '/clients' : undefined,
      cta:         'Setup Portal',
      points:      10,
    },
    {
      id:          'create_invoice',
      title:       'Buat invoice pertama',
      description: 'Generate invoice PDF profesional dari halaman detail shipment.',
      done:        !!invoicedShipment,
      href:        shipmentCount > 0 ? '/shipments' : undefined,
      cta:         'Buat Invoice',
      points:      10,
    },
  ]

  const earnedPoints = steps.filter(s => s.done).reduce((sum, s) => sum + s.points, 0)
  const totalPoints  = steps.reduce((sum, s) => sum + s.points, 0)
  const allDone      = steps.every(s => s.done)

  // Check apakah onboarding sudah pernah di-dismiss (simpan di localStorage di client)
  // API ini hanya return status real dari DB

  return NextResponse.json({
    success: true,
    data: {
      completed:    allDone,
      totalPoints,
      earnedPoints,
      steps,
      orgName:      org?.name ?? '',
      userName:     user.name,
    },
  })
}
