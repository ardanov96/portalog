import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const schema = z.object({
  name:        z.string().min(2),
  companyName: z.string().optional(),
  npwp:        z.string().optional(),
  email:       z.string().email().optional().or(z.literal('')),
  phone:       z.string().optional(),
  address:     z.string().optional(),
  city:        z.string().optional(),
  country:     z.string().default('ID'),
  notes:       z.string().optional(),
})

export async function GET(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  const search = new URL(req.url).searchParams.get('search') ?? undefined
  const clients = await prisma.client.findMany({
    where: {
      organizationId: user.organizationId, isActive: true,
      ...(search && { OR: [
        { name:        { contains: search, mode: 'insensitive' } },
        { companyName: { contains: search, mode: 'insensitive' } },
        { email:       { contains: search, mode: 'insensitive' } },
      ]}),
    },
    orderBy: { name: 'asc' },
    include: { _count: { select: { shipments: true } } },
  })

  return NextResponse.json({ success: true, data: clients })
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  try {
    const parsed = schema.parse(await req.json())
    const client = await prisma.client.create({ data: { organizationId: user.organizationId, ...parsed } })
    return NextResponse.json({ success: true, data: client }, { status: 201 })
  } catch (e) {
    if (e instanceof z.ZodError) return NextResponse.json({ success: false, error: e.errors[0].message }, { status: 400 })
    return NextResponse.json({ success: false, error: 'Kesalahan server' }, { status: 500 })
  }
}
