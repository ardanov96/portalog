import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// ─── GET /api/clients ──────────────────────────────────────────────────────────

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const clients = await prisma.client.findMany({
      where:   { organizationId: user.organizationId },
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { shipments: true } } },
    })
    return NextResponse.json({ success: true, data: clients })
  } catch (err) {
    console.error('[GET /api/clients]', err)
    return NextResponse.json({ error: 'Gagal mengambil data' }, { status: 500 })
  }
}

// ─── POST /api/clients ─────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { companyName, npwp, type, address, city, contactPerson, phone, email } = body

  if (!companyName || !contactPerson || !phone) {
    return NextResponse.json({ error: 'Field wajib tidak lengkap' }, { status: 400 })
  }

  try {
    const client = await prisma.client.create({
      data: {
        organizationId: user.organizationId,
        name:           contactPerson,
        companyName:    companyName,
        npwp:           npwp    || null,
        phone:          phone,
        email:          email   || null,
        address:        address || null,
        city:           city    || null,
        notes:          type    ? `Jenis: ${type}` : null,
      },
    })
    return NextResponse.json({ success: true, data: client })
  } catch (err) {
    console.error('[POST /api/clients]', err)
    return NextResponse.json({ error: 'Gagal menyimpan' }, { status: 500 })
  }
}
