// ─── Cron job utilities ───────────────────────────────────────────────────────
// Vercel memanggil endpoint cron dengan header `Authorization: Bearer CRON_SECRET`
// Setup: tambahkan CRON_SECRET ke env Vercel dan .env lokal

import { NextRequest, NextResponse } from 'next/server'

// ─── Auth ─────────────────────────────────────────────────────────────────────

/**
 * Verifikasi bahwa request berasal dari Vercel Cron scheduler.
 * Vercel mengirim header: `Authorization: Bearer <CRON_SECRET>`
 * Di lokal bisa di-test dengan header yang sama.
 */
export function verifyCronAuth(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    // Di dev tanpa CRON_SECRET → izinkan dari localhost saja
    const host = req.headers.get('host') ?? ''
    const isLocal = host.startsWith('localhost') || host.startsWith('127.0.0.1')
    if (isLocal) return true
    console.warn('[CRON] CRON_SECRET tidak di-set, akses ditolak dari non-localhost')
    return false
  }

  const authHeader = req.headers.get('authorization')
  if (!authHeader) return false
  const [scheme, token] = authHeader.split(' ')
  return scheme === 'Bearer' && token === secret
}

export function cronUnauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}

// ─── Result types ──────────────────────────────────────────────────────────────

export interface CronResult {
  job:        string
  startedAt:  string
  finishedAt: string
  durationMs: number
  success:    boolean
  stats:      Record<string, number | string>
  errors?:    string[]
}

export function buildResult(
  job:       string,
  startTime: number,
  stats:     Record<string, number | string>,
  errors:    string[] = [],
): CronResult {
  const now = Date.now()
  return {
    job,
    startedAt:  new Date(startTime).toISOString(),
    finishedAt: new Date(now).toISOString(),
    durationMs: now - startTime,
    success:    errors.length === 0,
    stats,
    errors:     errors.length > 0 ? errors : undefined,
  }
}

// ─── Logging ──────────────────────────────────────────────────────────────────

export function cronLog(job: string, message: string, data?: unknown) {
  const ts = new Date().toISOString()
  console.log(`[CRON:${job}] ${ts} — ${message}`, data ? JSON.stringify(data) : '')
}
