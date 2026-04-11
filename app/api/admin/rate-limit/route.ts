import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { RATE_LIMITS, rateLimit, getIdentifier } from '@/lib/rate-limit'

// GET /api/admin/rate-limit — cek sisa quota untuk semua limit key
// Hanya bisa diakses Owner. Berguna untuk monitoring dan debugging.
export async function GET(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user)              return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  if (user.role !== 'OWNER') return NextResponse.json({ success: false, error: 'Owner only' }, { status: 403 })

  const identifier = getIdentifier(req, user.id)

  // Probe semua limit keys tanpa menambah counter (read-only check)
  // Catatan: Upstash sliding window tidak support read-only — kita tampilkan config saja
  const configs = Object.entries(RATE_LIMITS).map(([key, cfg]) => ({
    key,
    limit:       cfg.limit,
    windowSec:   cfg.windowSec,
    windowLabel: cfg.windowSec >= 3600
      ? `${cfg.windowSec / 3600} jam`
      : cfg.windowSec >= 60
      ? `${cfg.windowSec / 60} menit`
      : `${cfg.windowSec} detik`,
    requestsPerMin: Math.round((cfg.limit / cfg.windowSec) * 60),
  }))

  const isRedisConfigured = !!(
    process.env.UPSTASH_REDIS_REST_URL &&
    process.env.UPSTASH_REDIS_REST_TOKEN
  )

  return NextResponse.json({
    success: true,
    data: {
      backend:    isRedisConfigured ? 'upstash-redis' : 'in-memory-dev',
      identifier,
      configs,
      note:       isRedisConfigured
        ? 'Menggunakan Upstash Redis (persistent across requests)'
        : 'Menggunakan in-memory fallback — counter reset saat server restart. Isi UPSTASH_REDIS_REST_URL dan UPSTASH_REDIS_REST_TOKEN untuk production.',
    },
  })
}
