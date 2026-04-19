// app/api/log/client-error/route.ts
// ─── Client Error Receiver ────────────────────────────────────────────────────
// Menerima error dari browser (logClientError) dan forward ke Better Stack

import { NextResponse }           from 'next/server'
import { logger }                 from '@/lib/logger'
import { rateLimit, getIdentifier } from '@/lib/rate-limit'

export async function POST(req: Request) {
  // Rate limit — cegah abuse endpoint ini
  const rl = await rateLimit(
    getIdentifier(req as any),
    'api_public',
  )
  if (!rl.success) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  try {
    const body = await req.json()

    logger.error('Client-side error', undefined, {
      ...body,
      source: 'client',
    })

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }
}
