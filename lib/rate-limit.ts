// ─── Rate Limiting — Upstash Redis + In-memory fallback ──────────────────────
//
// Setup Upstash Redis:
//   1. Daftar di console.upstash.com (gratis 10K req/hari)
//   2. Buat database Redis → copy REST URL dan token
//   3. Isi .env:
//      UPSTASH_REDIS_REST_URL="https://xxx.upstash.io"
//      UPSTASH_REDIS_REST_TOKEN="xxx"
//
// Kalau env tidak di-set → otomatis pakai in-memory (untuk dev lokal)
// In-memory TIDAK persistent antar request di serverless — hanya untuk dev

import type { NextRequest } from 'next/server'

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface RateLimitConfig {
  /** Jumlah request maksimal */
  limit:       number
  /** Window dalam detik */
  windowSec:   number
  /** Prefix key untuk grouping */
  prefix?:     string
}

export interface RateLimitResult {
  success:     boolean
  limit:       number
  remaining:   number
  reset:       number    // Unix timestamp (detik) kapan window reset
  retryAfter?: number    // Detik sampai bisa retry (ada jika success=false)
}

// ─── Rate limit configs per endpoint category ──────────────────────────────────

export const RATE_LIMITS = {
  // Auth routes — ketat, cegah brute force
  auth_login:    { limit: 10,  windowSec: 60  * 15 }, // 10 per 15 menit
  auth_register: { limit: 5,   windowSec: 60  * 60 }, // 5 per jam
  auth_misc:     { limit: 20,  windowSec: 60  * 15 }, // 20 per 15 menit

  // AI route — mahal, batasi lebih ketat
  ai_suggest:    { limit: 30,  windowSec: 60  * 60 }, // 30 per jam per user

  // Invite — cegah spam
  invite_send:   { limit: 10,  windowSec: 60  * 60 }, // 10 per jam

  // Upload — limit by size & count
  upload:        { limit: 50,  windowSec: 60  * 60 }, // 50 per jam

  // Billing / webhook — lebih longgar, butuh headroom
  billing:       { limit: 20,  windowSec: 60       }, // 20 per menit
  webhook:       { limit: 200, windowSec: 60       }, // 200 per menit (Midtrans bisa burst)

  // Portal routes — klien bisa banyak cek
  portal:        { limit: 120, windowSec: 60       }, // 120 per menit

  // General authenticated routes
  api_authed:    { limit: 300, windowSec: 60       }, // 300 per menit
  api_read:      { limit: 600, windowSec: 60       }, // GET lebih longgar

  // Public / unauthenticated
  api_public:    { limit: 60,  windowSec: 60       }, // 60 per menit per IP
} as const

export type RateLimitKey = keyof typeof RATE_LIMITS

// ─── In-memory fallback (dev only) ────────────────────────────────────────────

interface MemEntry { count: number; resetAt: number }
const memStore = new Map<string, MemEntry>()

function memRateLimit(key: string, cfg: RateLimitConfig): RateLimitResult {
  const now     = Math.floor(Date.now() / 1000)
  const entry   = memStore.get(key)

  if (!entry || now >= entry.resetAt) {
    memStore.set(key, { count: 1, resetAt: now + cfg.windowSec })
    return { success: true, limit: cfg.limit, remaining: cfg.limit - 1, reset: now + cfg.windowSec }
  }

  entry.count++
  memStore.set(key, entry)

  const remaining = Math.max(0, cfg.limit - entry.count)
  const success   = entry.count <= cfg.limit

  return {
    success,
    limit:     cfg.limit,
    remaining,
    reset:     entry.resetAt,
    retryAfter: success ? undefined : entry.resetAt - now,
  }
}

// ─── Upstash Redis rate limiter ───────────────────────────────────────────────

let _redis: any = null
let _rl: Map<string, any> = new Map()

async function getRedis() {
  if (_redis) return _redis
  const url   = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) return null

  const { Redis } = await import('@upstash/redis')
  _redis = new Redis({ url, token })
  return _redis
}

async function getRateLimiter(key: string, cfg: RateLimitConfig) {
  const cacheKey = `${key}:${cfg.limit}:${cfg.windowSec}`
  if (_rl.has(cacheKey)) return _rl.get(cacheKey)

  const redis = await getRedis()
  if (!redis) return null

  const { Ratelimit } = await import('@upstash/ratelimit')
  const limiter = new Ratelimit({
    redis,
    limiter:   Ratelimit.slidingWindow(cfg.limit, `${cfg.windowSec} s`),
    analytics: true,
    prefix:    `rl:forwarderos:${cfg.prefix ?? key}`,
  })

  _rl.set(cacheKey, limiter)
  return limiter
}

// ─── Core rate limit function ──────────────────────────────────────────────────

export async function rateLimit(
  identifier: string,
  limitKey:   RateLimitKey,
): Promise<RateLimitResult> {
  const cfg = RATE_LIMITS[limitKey]

  try {
    const limiter = await getRateLimiter(limitKey, cfg)

    if (!limiter) {
      // Dev mode — in-memory
      return memRateLimit(`${limitKey}:${identifier}`, cfg)
    }

    const result = await limiter.limit(identifier)
    const now    = Math.floor(Date.now() / 1000)

    return {
      success:    result.success,
      limit:      result.limit,
      remaining:  result.remaining,
      reset:      Math.floor(result.reset / 1000),
      retryAfter: result.success ? undefined : Math.max(0, Math.floor(result.reset / 1000) - now),
    }
  } catch (err) {
    // Jangan block request kalau Redis down — fail open dengan log
    console.error('[RATE-LIMIT] Error, allowing request:', err)
    return { success: true, limit: cfg.limit, remaining: cfg.limit, reset: 0 }
  }
}

// ─── Helper: extract identifier from request ───────────────────────────────────

export function getIdentifier(req: NextRequest, userId?: string): string {
  if (userId) return `user:${userId}`

  // Try various IP headers (Vercel, Cloudflare, nginx)
  const ip =
    req.headers.get('x-real-ip') ??
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('cf-connecting-ip') ??
    '127.0.0.1'

  return `ip:${ip}`
}

// ─── Helper: build rate limit response headers ─────────────────────────────────

export function rateLimitHeaders(result: RateLimitResult): Record<string, string> {
  const headers: Record<string, string> = {
    'X-RateLimit-Limit':     String(result.limit),
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset':     String(result.reset),
  }
  if (result.retryAfter !== undefined) {
    headers['Retry-After'] = String(result.retryAfter)
  }
  return headers
}

// ─── Helper: return 429 response ──────────────────────────────────────────────

export function tooManyRequests(result: RateLimitResult) {
  const { NextResponse } = require('next/server')
  return NextResponse.json(
    {
      success: false,
      error:   'Terlalu banyak permintaan. Coba lagi beberapa saat.',
      retryAfter: result.retryAfter,
    },
    {
      status:  429,
      headers: rateLimitHeaders(result),
    },
  )
}
