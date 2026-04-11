import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getSubscription } from '@/lib/billing'

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  const [sub, history] = await Promise.all([
    getSubscription(user.organizationId),
    prisma.billingHistory.findMany({
      where:   { subscription: { organizationId: user.organizationId } },
      orderBy: { createdAt: 'desc' },
      take:    12,
    }),
  ])

  return NextResponse.json({ success: true, data: { subscription: sub, history } })
}

// PATCH — cancel atau reactivate
export async function PATCH(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  if (user.role !== 'OWNER') return NextResponse.json({ success: false, error: 'Hanya Owner' }, { status: 403 })

  const { action } = await req.json()

  if (action === 'cancel') {
    await prisma.subscription.updateMany({
      where: { organizationId: user.organizationId },
      data:  { cancelAtPeriodEnd: true },
    })
    return NextResponse.json({ success: true, message: 'Langganan akan dibatalkan di akhir periode' })
  }

  if (action === 'reactivate') {
    await prisma.subscription.updateMany({
      where: { organizationId: user.organizationId },
      data:  { cancelAtPeriodEnd: false },
    })
    return NextResponse.json({ success: true, message: 'Langganan diaktifkan kembali' })
  }

  return NextResponse.json({ success: false, error: 'Action tidak valid' }, { status: 400 })
}
