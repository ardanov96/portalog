import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { generateVerifyToken, invalidateBrandingCache } from '@/lib/white-label'

const updateSchema = z.object({
  // Branding
  brandName:       z.string().max(80).optional(),
  logoUrl:         z.string().url().optional().nullable(),
  faviconUrl:      z.string().url().optional().nullable(),
  primaryColor:    z.string().regex(/^[0-9A-Fa-f]{6}$/, 'Harus 6 digit hex').optional(),
  accentColor:     z.string().regex(/^[0-9A-Fa-f]{6}$/, 'Harus 6 digit hex').optional(),
  fontFamily:      z.string().optional(),
  backgroundColor: z.string().regex(/^[0-9A-Fa-f]{6}$/).optional().nullable(),
  backgroundStyle: z.enum(['solid', 'gradient']).optional(),

  // Custom domain
  customDomain:    z.string().max(253).optional().nullable(),

  // Portal text
  portalTitle:     z.string().max(100).optional(),
  portalWelcome:   z.string().max(300).optional(),
  portalFooter:    z.string().max(200).optional().nullable(),
  supportEmail:    z.string().email().optional().nullable(),
  supportPhone:    z.string().max(30).optional().nullable(),
  supportWhatsapp: z.string().max(30).optional().nullable(),

  // Feature flags
  showPoweredBy:    z.boolean().optional(),
  showChatbot:      z.boolean().optional(),
  showDocuments:    z.boolean().optional(),
  showTimeline:     z.boolean().optional(),
  allowClientLogin: z.boolean().optional(),
})

// GET — get white-label config
export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  const wl = await prisma.whiteLabel.findUnique({
    where: { organizationId: user.organizationId },
  })

  const appUrl   = process.env.NEXT_PUBLIC_APP_URL ?? 'https://forwarderos.id'
  const previewUrl = `${appUrl}/wl-portal?preview=${user.organization.slug}`

  return NextResponse.json({
    success: true,
    data:    { ...wl, previewUrl },
  })
}

// POST — create or update white-label config
export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  if (user.role !== 'OWNER') return NextResponse.json({ success: false, error: 'Hanya Owner yang bisa mengubah konfigurasi white-label' }, { status: 403 })

  const body = await req.json()
  let parsed: any
  try { parsed = updateSchema.parse(body) }
  catch (e: any) {
    return NextResponse.json({ success: false, error: e.errors?.[0]?.message ?? 'Data tidak valid' }, { status: 400 })
  }

  // Jika domain berubah, reset verifikasi
  const existing = await prisma.whiteLabel.findUnique({ where: { organizationId: user.organizationId } })
  const domainChanged = parsed.customDomain !== undefined && parsed.customDomain !== existing?.customDomain

  if (domainChanged && parsed.customDomain) {
    // Cek domain tidak dipakai org lain
    const taken = await prisma.whiteLabel.findFirst({
      where: { customDomain: parsed.customDomain, organizationId: { not: user.organizationId } },
    })
    if (taken) return NextResponse.json({ success: false, error: 'Domain ini sudah digunakan oleh organisasi lain' }, { status: 409 })
  }

  const updateData: any = { ...parsed }
  if (domainChanged) {
    updateData.status           = 'PENDING'
    updateData.domainVerifiedAt = null
    updateData.domainVerifyToken = parsed.customDomain ? generateVerifyToken() : null
  }

  const wl = await prisma.whiteLabel.upsert({
    where:  { organizationId: user.organizationId },
    create: {
      organizationId:   user.organizationId,
      status:           'PENDING',
      domainVerifyToken: parsed.customDomain ? generateVerifyToken() : null,
      ...parsed,
    },
    update: updateData,
  })

  // Invalidate branding cache
  invalidateBrandingCache(user.organizationId)

  return NextResponse.json({ success: true, data: wl })
}

// DELETE — remove white-label config
export async function DELETE() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  if (user.role !== 'OWNER') return NextResponse.json({ success: false, error: 'Hanya Owner' }, { status: 403 })

  await prisma.whiteLabel.deleteMany({ where: { organizationId: user.organizationId } })
  invalidateBrandingCache(user.organizationId)

  return NextResponse.json({ success: true })
}
