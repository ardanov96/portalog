import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/referral/verify?code=XXXXXXXX
// Publik — tidak perlu auth, dipanggil saat user ketik kode di form register

export async function GET(req: NextRequest) {
  const code = new URL(req.url).searchParams.get('code')?.toUpperCase()
  if (!code) return NextResponse.json({ valid: false })

  const org = await prisma.organization.findFirst({
    where:  { referralCode: code },
    select: { name: true, referralCode: true },
  })

  return NextResponse.json({ valid: !!org, orgName: org?.name ?? null })
}
