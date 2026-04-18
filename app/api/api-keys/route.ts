import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { generateApiKey } from '@/lib/api-auth'
import { z } from 'zod'

const createSchema = z.object({
  name:        z.string().min(3).max(80),
  description: z.string().max(200).optional(),
  scopes:      z.array(z.enum(['SHIPMENTS_READ','SHIPMENTS_WRITE','CLIENTS_READ','CLIENTS_WRITE','DOCUMENTS_READ','DOCUMENTS_WRITE','ALL_READ','ALL_WRITE'])).min(1),
  monthlyLimit:z.number().int().min(100).max(1_000_000).default(10000),
  expiresAt:   z.string().datetime().optional().nullable(),
})

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  const keys = await prisma.apiKey.findMany({
    where:   { organizationId: user.organizationId },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true, name: true, description: true, keyPrefix: true, scopes: true,
      isActive: true, lastUsedAt: true, lastUsedIp: true, expiresAt: true,
      requestCount: true, monthlyCount: true, monthlyLimit: true,
      createdAt: true, updatedAt: true,
    },
  })

  return NextResponse.json({ success: true, data: keys })
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  if (user.role !== 'OWNER') return NextResponse.json({ success: false, error: 'Hanya Owner yang bisa membuat API key' }, { status: 403 })

  // Plan gating — hanya GROWTH/ENTERPRISE bisa buat API key
  const sub = await prisma.subscription.findUnique({ where: { organizationId: user.organizationId } })
  if (!sub || !['GROWTH', 'ENTERPRISE', 'TRIALING'].includes(sub.plan === 'TRIAL' ? 'TRIALING' : sub.plan)) {
    if (sub?.plan === 'STARTER') {
      return NextResponse.json({ success: false, error: 'API access tersedia di paket Growth atau Enterprise. Upgrade paket Anda.' }, { status: 403 })
    }
  }

  // Max 10 keys per org
  const existing = await prisma.apiKey.count({ where: { organizationId: user.organizationId } })
  if (existing >= 10) return NextResponse.json({ success: false, error: 'Batas maksimum 10 API key per organisasi' }, { status: 400 })

  let body: any
  try { body = createSchema.parse(await req.json()) }
  catch (e: any) { return NextResponse.json({ success: false, error: e.errors?.[0]?.message ?? 'Data tidak valid' }, { status: 400 }) }

  const { raw, prefix, hash } = generateApiKey()

  const key = await prisma.apiKey.create({
    data: {
      organizationId: user.organizationId,
      name:           body.name,
      description:    body.description,
      keyHash:        hash,
      keyPrefix:      prefix,
      scopes:         body.scopes,
      monthlyLimit:   body.monthlyLimit,
      expiresAt:      body.expiresAt ? new Date(body.expiresAt) : null,
    },
    select: { id: true, name: true, keyPrefix: true, scopes: true, monthlyLimit: true, expiresAt: true, createdAt: true },
  })

  // Return raw key HANYA sekali ini — setelah ini tidak bisa dilihat lagi
  return NextResponse.json({ success: true, data: { ...key, key: raw, warning: 'Simpan API key ini sekarang. Tidak akan ditampilkan lagi.' } }, { status: 201 })
}
