// GET /api/cron/subscription-check
// Dijadwalkan: setiap hari jam 07:00 WIB (= 00:00 UTC)
// Schedule Vercel: "0 0 * * *"
//
// Yang dilakukan:
// 1. Tandai trial yang sudah expired sebagai EXPIRED
// 2. Tandai subscription aktif yang sudah lewat period_end sebagai PAST_DUE
// 3. Kirim email pengingat ke trial yang akan expired besok
// 4. Kirim email ke subscription yang akan expired besok

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyCronAuth, cronUnauthorized, buildResult, cronLog } from '@/lib/cron'

const JOB = 'subscription-check'

export async function GET(req: NextRequest) {
  if (!verifyCronAuth(req)) return cronUnauthorized()

  const startTime = Date.now()
  const now       = new Date()
  const errors:   string[] = []
  const stats = {
    trialsExpired:       0,
    subscriptionsExpired: 0,
    trialEndingTomorrow: 0,
    subEndingTomorrow:   0,
  }

  cronLog(JOB, 'Mulai subscription check')

  try {
    // ── 1. Expire trial yang sudah lewat ──────────────────────────────────────
    const expiredTrials = await prisma.subscription.updateMany({
      where: {
        status:      'TRIALING',
        trialEndsAt: { lt: now },
      },
      data: { status: 'EXPIRED' },
    })
    stats.trialsExpired = expiredTrials.count
    if (expiredTrials.count > 0) cronLog(JOB, `${expiredTrials.count} trial expired`)

    // ── 2. Expire subscription aktif yang sudah lewat period_end ─────────────
    const expiredSubs = await prisma.subscription.updateMany({
      where: {
        status:          'ACTIVE',
        currentPeriodEnd: { lt: now },
        cancelAtPeriodEnd: false,
      },
      data: { status: 'PAST_DUE' },
    })
    stats.subscriptionsExpired = expiredSubs.count

    // Tandai yang cancelAtPeriodEnd=true sebagai CANCELLED
    await prisma.subscription.updateMany({
      where: {
        status:            'ACTIVE',
        currentPeriodEnd:  { lt: now },
        cancelAtPeriodEnd: true,
      },
      data: { status: 'CANCELLED' },
    })

    // ── 3. Cari trial yang expires besok → kirim email peringatan ─────────────
    const tomorrow     = new Date(now)
    tomorrow.setDate(tomorrow.getDate() + 1)
    const dayAfter     = new Date(tomorrow)
    dayAfter.setDate(dayAfter.getDate() + 1)

    const trialsEndingTomorrow = await prisma.subscription.findMany({
      where: {
        status:      'TRIALING',
        trialEndsAt: { gte: tomorrow, lt: dayAfter },
      },
      include: {
        organization: {
          include: { users: { where: { role: 'OWNER', isActive: true }, take: 1 } },
        },
      },
    })

    stats.trialEndingTomorrow = trialsEndingTomorrow.length

    // Kirim email ke Owner untuk setiap org yang trial-nya akan berakhir
    for (const sub of trialsEndingTomorrow) {
      const owner = sub.organization.users[0]
      if (!owner?.email) continue

      try {
        const { sendViaResend } = await getEmailSender()
        if (sendViaResend) {
          await sendViaResend({
            to:      owner.email,
            subject: `⚠️ Trial ForwarderOS Anda berakhir besok`,
            html:    buildTrialEndingEmail(sub.organization.name, owner.name),
          })
        }
      } catch (e: any) {
        errors.push(`Email trial ending ke ${owner.email}: ${e.message}`)
      }
    }

    // ── 4. Cari subscription yang akan expired besok ───────────────────────────
    const subsEndingTomorrow = await prisma.subscription.findMany({
      where: {
        status:           'ACTIVE',
        currentPeriodEnd: { gte: tomorrow, lt: dayAfter },
        cancelAtPeriodEnd: false,
      },
      include: {
        organization: {
          include: { users: { where: { role: 'OWNER', isActive: true }, take: 1 } },
        },
      },
    })

    stats.subEndingTomorrow = subsEndingTomorrow.length

    for (const sub of subsEndingTomorrow) {
      const owner = sub.organization.users[0]
      if (!owner?.email) continue

      try {
        const { sendViaResend } = await getEmailSender()
        if (sendViaResend) {
          await sendViaResend({
            to:      owner.email,
            subject: `🔔 Langganan ForwarderOS diperpanjang besok`,
            html:    buildSubRenewalEmail(sub.organization.name, owner.name, sub.plan),
          })
        }
      } catch (e: any) {
        errors.push(`Email renewal ke ${owner.email}: ${e.message}`)
      }
    }

    const result = buildResult(JOB, startTime, stats, errors)
    cronLog(JOB, `Selesai dalam ${result.durationMs}ms`, stats)
    return NextResponse.json(result)

  } catch (e: any) {
    const msg = `Fatal: ${e.message}`
    cronLog(JOB, 'FATAL:', msg)
    return NextResponse.json(buildResult(JOB, startTime, stats, [msg]), { status: 500 })
  }
}

// ─── Email helpers ────────────────────────────────────────────────────────────

async function getEmailSender() {
  const apiKey = process.env.RESEND_API_KEY
  const from   = process.env.EMAIL_FROM ?? 'noreply@resend.dev'
  if (!apiKey) return { sendViaResend: null }

  return {
    sendViaResend: async (opts: { to: string; subject: string; html: string }) => {
      const res = await fetch('https://api.resend.com/emails', {
        method:  'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body:    JSON.stringify({ from, to: [opts.to], subject: opts.subject, html: opts.html }),
      })
      if (!res.ok) throw new Error(await res.text())
    },
  }
}

function buildTrialEndingEmail(orgName: string, userName: string): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://yourdomain.com'
  return `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 20px;">
      <h2 style="color:#0f172a;font-size:18px;margin:0 0 12px;">⚠️ Trial Anda Berakhir Besok</h2>
      <p style="color:#64748b;font-size:14px;line-height:1.6;">Halo <strong>${userName}</strong>,</p>
      <p style="color:#64748b;font-size:14px;line-height:1.6;">
        Trial ForwarderOS untuk <strong>${orgName}</strong> akan berakhir besok.
        Pilih paket berlangganan untuk terus menggunakan semua fitur tanpa gangguan.
      </p>
      <div style="text-align:center;margin:28px 0;">
        <a href="${appUrl}/billing" style="background:#3b82f6;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px;">
          Pilih Paket Sekarang
        </a>
      </div>
      <p style="color:#94a3b8;font-size:12px;text-align:center;">ForwarderOS · ${orgName}</p>
    </div>
  `
}

function buildSubRenewalEmail(orgName: string, userName: string, plan: string): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://yourdomain.com'
  return `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 20px;">
      <h2 style="color:#0f172a;font-size:18px;margin:0 0 12px;">🔔 Langganan Akan Diperpanjang</h2>
      <p style="color:#64748b;font-size:14px;line-height:1.6;">Halo <strong>${userName}</strong>,</p>
      <p style="color:#64748b;font-size:14px;line-height:1.6;">
        Langganan ForwarderOS <strong>${plan}</strong> untuk <strong>${orgName}</strong>
        akan diperpanjang otomatis besok. Pastikan metode pembayaran Anda aktif.
      </p>
      <div style="text-align:center;margin:28px 0;">
        <a href="${appUrl}/billing" style="background:#3b82f6;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px;">
          Kelola Langganan
        </a>
      </div>
      <p style="color:#94a3b8;font-size:12px;text-align:center;">ForwarderOS · ${orgName}</p>
    </div>
  `
}
