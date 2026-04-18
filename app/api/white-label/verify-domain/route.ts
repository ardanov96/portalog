import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { verifyDomainDns, invalidateBrandingCache } from '@/lib/white-label'

export async function POST() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  const wl = await prisma.whiteLabel.findUnique({
    where: { organizationId: user.organizationId },
  })

  if (!wl?.customDomain || !wl.domainVerifyToken) {
    return NextResponse.json({ success: false, error: 'Belum ada domain yang perlu diverifikasi' }, { status: 400 })
  }

  if (wl.domainVerifiedAt) {
    return NextResponse.json({ success: true, data: { alreadyVerified: true } })
  }

  // Cek TXT record di DNS
  const verified = await verifyDomainDns(wl.customDomain, wl.domainVerifyToken)

  if (!verified) {
    return NextResponse.json({
      success: false,
      error:   'TXT record belum ditemukan di DNS. Pastikan sudah ditambahkan dan tunggu propagasi (1-48 jam).',
      data:    { domain: wl.customDomain, token: wl.domainVerifyToken },
    })
  }

  await prisma.whiteLabel.update({
    where: { id: wl.id },
    data:  { status: 'ACTIVE', domainVerifiedAt: new Date() },
  })

  invalidateBrandingCache(user.organizationId)

  return NextResponse.json({ success: true, data: { verified: true, domain: wl.customDomain } })
}
