// GET /api/cron/cleanup
// Dijadwalkan: setiap Minggu jam 09:00 WIB (= 02:00 UTC)
// Schedule Vercel: "0 2 * * 0"
//
// Yang dilakukan:
// 1. Hapus invite staff yang expired dan belum diterima (> 7 hari)
// 2. Hapus activity log yang lebih dari 90 hari
// 3. Hapus notifikasi yang sudah dibaca dan lebih dari 30 hari

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyCronAuth, cronUnauthorized, buildResult, cronLog } from '@/lib/cron'

const JOB = 'cleanup'

export async function GET(req: NextRequest) {
  if (!verifyCronAuth(req)) return cronUnauthorized()

  const startTime = Date.now()
  const now       = new Date()
  const errors:   string[] = []
  const stats     = {
    invitesDeleted:       0,
    activityLogsDeleted:  0,
    notificationsDeleted: 0,
  }

  cronLog(JOB, 'Mulai weekly cleanup')

  try {
    // ── 1. Hapus expired invites ──────────────────────────────────────────────
    const expiredInvites = await prisma.staffInvite.deleteMany({
      where: {
        acceptedAt: null,
        expiresAt:  { lt: now },
      },
    })
    stats.invitesDeleted = expiredInvites.count

    // ── 2. Hapus activity logs > 90 hari ─────────────────────────────────────
    const ninetyDaysAgo = new Date(now)
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)

    const oldLogs = await prisma.activityLog.deleteMany({
      where: { createdAt: { lt: ninetyDaysAgo } },
    })
    stats.activityLogsDeleted = oldLogs.count

    // ── 3. Hapus notifikasi dibaca > 30 hari ──────────────────────────────────
    const thirtyDaysAgo = new Date(now)
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const oldNotifs = await prisma.notification.deleteMany({
      where: {
        isRead:    true,
        createdAt: { lt: thirtyDaysAgo },
      },
    })
    stats.notificationsDeleted = oldNotifs.count

    const result = buildResult(JOB, startTime, stats, errors)
    cronLog(JOB, `Selesai dalam ${result.durationMs}ms`, stats)
    return NextResponse.json(result)

  } catch (e: any) {
    const msg = `Fatal: ${e.message}`
    cronLog(JOB, 'FATAL:', msg)
    return NextResponse.json(buildResult(JOB, startTime, stats, [msg]), { status: 500 })
  }
}
