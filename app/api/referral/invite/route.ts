import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sendReferralInviteEmail } from '@/lib/email'

// ─── POST /api/referral/invite ─────────────────────────────────────────────────
// Creates a Referral record when user invites someone by email

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  try {
    const { email } = await req.json()
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ success: false, error: 'Email tidak valid' }, { status: 400 })
    }

    // Get org referral code
    const org = await prisma.organization.findUnique({
      where:  { id: user.organizationId },
      select: { referralCode: true, name: true },
    })
    if (!org?.referralCode) {
      return NextResponse.json({ success: false, error: 'Kode referral belum dibuat' }, { status: 400 })
    }

    // Check duplicate invite
    const existing = await prisma.referral.findFirst({
      where: { referrerOrgId: user.organizationId, referredEmail: email, status: 'PENDING' },
    })
    if (existing) {
      return NextResponse.json({ success: false, error: 'Email ini sudah pernah diundang' }, { status: 409 })
    }

    const referral = await prisma.referral.create({
      data: {
        referrerOrgId: user.organizationId,
        code:          org.referralCode,
        referredEmail: email,
        status:        'PENDING',
        rewardMonths:  1,
        expiresAt:     new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 hari
      },
    })

    // TODO: kirim email undangan ke `email` dengan kode referral org.referralCode

    await sendReferralInviteEmail({
        to:           email,
        referralCode: org.referralCode,
        orgName:      org.name,
        inviterName:  user.name,
    })

    return NextResponse.json({ success: true, data: referral })
  } catch (err) {
    console.error('[POST /api/referral/invite]', err)
    return NextResponse.json({ success: false, error: 'Kesalahan server' }, { status: 500 })
  }
}
