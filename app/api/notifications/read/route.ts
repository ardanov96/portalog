// app/api/notifications/read/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// ─── PATCH /api/notifications/read ───────────────────────────────────────────
// Body: { id?: string } — jika tidak ada id, tandai semua sebagai dibaca

export async function PATCH(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json().catch(() => ({}))
    const { id } = body

    if (id) {
      // Tandai satu notifikasi
      await prisma.notification.updateMany({
        where: { id, userId: user.id },
        data:  { isRead: true },
      })
    } else {
      // Tandai semua
      await prisma.notification.updateMany({
        where: { userId: user.id, isRead: false },
        data:  { isRead: true },
      })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[PATCH /api/notifications/read]', err)
    return NextResponse.json({ success: false, error: 'Kesalahan server' }, { status: 500 })
  }
}
