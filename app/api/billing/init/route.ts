import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { TRIAL_DAYS } from '@/lib/billing'

// POST /api/billing/init — dipanggil saat user pertama login atau register
// Membuat subscription trial otomatis jika belum ada
export async function POST() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  const existing = await prisma.subscription.findUnique({
    where: { organizationId: user.organizationId },
  })

  if (existing) return NextResponse.json({ success: true, data: existing })

  const trialEndsAt = new Date()
  trialEndsAt.setDate(trialEndsAt.getDate() + TRIAL_DAYS)

  const sub = await prisma.subscription.create({
    data: {
      organizationId: user.organizationId,
      plan:           'TRIAL',
      status:         'TRIALING',
      trialEndsAt,
    },
  })

  return NextResponse.json({ success: true, data: sub })
}
