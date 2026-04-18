import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { generateApiKey } from '@/lib/api-auth'

type Ctx = { params: Promise<{ id: string }> }

export async function POST(_: NextRequest, { params }: Ctx) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  if (user.role !== 'OWNER') return NextResponse.json({ success: false, error: 'Hanya Owner' }, { status: 403 })
  const { id } = await params

  const key = await prisma.apiKey.findFirst({ where: { id, organizationId: user.organizationId } })
  if (!key) return NextResponse.json({ success: false, error: 'Tidak ditemukan' }, { status: 404 })

  const { raw, prefix, hash } = generateApiKey()
  await prisma.apiKey.update({ where: { id }, data: { keyHash: hash, keyPrefix: prefix, monthlyCount: 0, lastUsedAt: null } })

  return NextResponse.json({ success: true, data: { id, key: raw, keyPrefix: prefix, warning: 'API key lama sekarang tidak berlaku. Simpan key baru ini — tidak akan ditampilkan lagi.' } })
}
