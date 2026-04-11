// GET /api/cron/deadline-reminder
// Dijadwalkan: setiap hari jam 08:00 WIB (= 01:00 UTC)
// Schedule Vercel: "0 1 * * *"
//
// Yang dilakukan:
// 1. Cari semua shipment aktif yang memiliki deadline ≤ 3 hari ke depan
// 2. Kirim reminder WA via Fonnte ke nomor klien
// 3. Kirim reminder email via Resend ke email klien
// 4. Simpan log ke database (Notification model)
// 5. Skip klien yang sudah dapat reminder hari ini (dedup)

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendDeadlineReminders } from '@/lib/whatsapp'
import { sendBulkDeadlineEmailReminders } from '@/lib/email'
import { verifyCronAuth, cronUnauthorized, buildResult, cronLog } from '@/lib/cron'

const JOB = 'deadline-reminder'

const ACTIVE_STATUSES = [
  'BOOKING_CONFIRMED', 'DOCS_IN_PROGRESS', 'CUSTOMS_PROCESSING',
  'CARGO_RELEASED', 'IN_TRANSIT', 'ARRIVED',
]

export async function GET(req: NextRequest) {
  if (!verifyCronAuth(req)) return cronUnauthorized()

  const startTime = Date.now()
  const now       = new Date()
  const in3Days   = new Date(now.getTime() + 3 * 86_400_000)
  const errors:   string[] = []
  const stats = {
    organizationsChecked: 0,
    shipmentsFound:       0,
    waReminders:          0,
    emailReminders:       0,
    skippedAlreadySent:   0,
  }

  cronLog(JOB, 'Mulai — mencari shipment dengan deadline mendekat')

  try {
    // Ambil semua shipment aktif yang punya deadline dalam 3 hari
    const shipments = await prisma.shipment.findMany({
      where: {
        status: { in: ACTIVE_STATUSES as any[] },
        OR: [
          { customsDeadline: { gte: now, lte: in3Days } },
          { eta:             { gte: now, lte: in3Days } },
        ],
      },
      include: {
        client:       { select: { id: true, name: true, phone: true, email: true } },
        organization: { select: { id: true, name: true } },
      },
      orderBy: { eta: 'asc' },
    })

    stats.shipmentsFound = shipments.length
    cronLog(JOB, `Ditemukan ${shipments.length} shipment dengan deadline mendekat`)

    if (shipments.length === 0) {
      return NextResponse.json(buildResult(JOB, startTime, stats))
    }

    // Dedup: skip shipment yang sudah dapat notifikasi hari ini
    const todayStart = new Date(now)
    todayStart.setHours(0, 0, 0, 0)

    const alreadySentToday = await prisma.notification.findMany({
      where: {
        type:      { in: ['DEADLINE_REMINDER_WA', 'DEADLINE_REMINDER_EMAIL'] },
        createdAt: { gte: todayStart },
        shipmentId: { in: shipments.map(s => s.id) },
      },
      select: { shipmentId: true, type: true },
    })

    const sentSet = new Set(alreadySentToday.map(n => `${n.shipmentId}:${n.type}`))

    // Filter shipment yang belum dapat reminder WA hari ini
    const needsWa    = shipments.filter(s =>
      s.client.phone && !sentSet.has(`${s.id}:DEADLINE_REMINDER_WA`)
    )
    const needsEmail = shipments.filter(s =>
      s.client.email && !sentSet.has(`${s.id}:DEADLINE_REMINDER_EMAIL`)
    )

    stats.skippedAlreadySent = shipments.length - Math.max(needsWa.length, needsEmail.length)

    cronLog(JOB, `WA: ${needsWa.length} akan dikirim, Email: ${needsEmail.length} akan dikirim`)

    // ── Kirim WA ──────────────────────────────────────────────────────────────
    if (needsWa.length > 0) {
      try {
        await sendDeadlineReminders(needsWa as any)
        stats.waReminders = needsWa.length

        // Simpan log notifikasi
        await prisma.notification.createMany({
          data: needsWa.map(s => ({
            shipmentId: s.id,
            type:       'DEADLINE_REMINDER_WA',
            title:      `Reminder deadline: ${s.referenceNo}`,
            message:    `WA reminder dikirim ke ${s.client.phone}`,
            sentViaWa:  true,
          })),
          skipDuplicates: true,
        })
      } catch (e: any) {
        const msg = `WA batch gagal: ${e.message}`
        errors.push(msg)
        cronLog(JOB, 'ERROR WA:', msg)
      }
    }

    // ── Kirim Email ───────────────────────────────────────────────────────────
    if (needsEmail.length > 0) {
      try {
        await sendBulkDeadlineEmailReminders(needsEmail as any)
        stats.emailReminders = needsEmail.length

        await prisma.notification.createMany({
          data: needsEmail.map(s => ({
            shipmentId:   s.id,
            type:         'DEADLINE_REMINDER_EMAIL',
            title:        `Email reminder deadline: ${s.referenceNo}`,
            message:      `Email reminder dikirim ke ${s.client.email}`,
            sentViaEmail: true,
          })),
          skipDuplicates: true,
        })
      } catch (e: any) {
        const msg = `Email batch gagal: ${e.message}`
        errors.push(msg)
        cronLog(JOB, 'ERROR Email:', msg)
      }
    }

    const result = buildResult(JOB, startTime, stats, errors)
    cronLog(JOB, `Selesai dalam ${result.durationMs}ms`, stats)
    return NextResponse.json(result)

  } catch (e: any) {
    const msg = `Fatal error: ${e.message}`
    cronLog(JOB, 'FATAL:', msg)
    return NextResponse.json(
      buildResult(JOB, startTime, stats, [msg]),
      { status: 500 }
    )
  }
}
