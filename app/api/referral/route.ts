import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { nanoid } from 'nanoid'

// ─── GET /api/referral ─────────────────────────────────────────────────────────
// Returns referral code, stats, and history for current org

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  try {
    const org = await prisma.organization.findUnique({
      where:  { id: user.organizationId },
      select: { referralCode: true, referralCredits: true, name: true },
    })
    if (!org) return NextResponse.json({ success: false, error: 'Org not found' }, { status: 404 })

    // Auto-generate code if not exists
    let referralCode = org.referralCode
    if (!referralCode) {
      referralCode = nanoid(8).toUpperCase()
      await prisma.organization.update({
        where: { id: user.organizationId },
        data:  { referralCode },
      })
    }

    // Fetch referral history
    const referrals = await prisma.referral.findMany({
      where:   { referrerOrgId: user.organizationId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, code: true, status: true,
        referredEmail: true, referredOrgName: true,
        rewardMonths: true, rewardAppliedAt: true,
        qualifiedAt: true, expiresAt: true, createdAt: true,
      },
    })

    // Stats
    const total     = referrals.length
    const qualified = referrals.filter(r => ['QUALIFIED', 'REWARDED'].includes(r.status)).length
    const rewarded  = referrals.filter(r => r.status === 'REWARDED').length
    const pending   = referrals.filter(r => r.status === 'PENDING').length
    const totalMonthsEarned = referrals
      .filter(r => r.status === 'REWARDED')
      .reduce((sum, r) => sum + r.rewardMonths, 0)

    return NextResponse.json({
      success: true,
      data: {
        referralCode,
        referralCredits: org.referralCredits,
        stats: { total, qualified, rewarded, pending, totalMonthsEarned },
        referrals,
      },
    })
  } catch (err) {
    console.error('[GET /api/referral]', err)
    return NextResponse.json({ success: false, error: 'Kesalahan server' }, { status: 500 })
  }
}
