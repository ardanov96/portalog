// app/api/billing/status/route.ts
import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  try {
    const subscription = await prisma.subscription.findUnique({
      where:   { organizationId: user.organizationId },
      include: {
        billingHistory: {
          orderBy: { createdAt: 'desc' },
          take:    10,
        },
      },
    })

    const org = await prisma.organization.findUnique({
      where:  { id: user.organizationId },
      select: { referralCredits: true },
    })

    return NextResponse.json({
      success: true,
      data: {
        subscription,
        referralCredits: org?.referralCredits ?? 0,
      },
    })
  } catch (err) {
    console.error('[GET /api/billing/status]', err)
    return NextResponse.json({ success: false, error: 'Kesalahan server' }, { status: 500 })
  }
}
