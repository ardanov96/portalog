// ─── Rate Limiting — In-memory (lru-cache) ───────────────────────────────────
//
// Menggunakan lru-cache sebagai pengganti Upstash Redis.
//
// ⚠️  Catatan serverless (Vercel):
//     State in-memory hidup selama satu "warm instance". Di production dengan
//     banyak traffic, Vercel bisa spawn beberapa instance paralel sehingga
//     counter tidak shared. Untuk MVP / traffic rendah ini cukup — attacker
//     butuh hit instance yang sama berulang kali untuk bypass.
//
//     Upgrade path ke persistent: ganti `memRateLimit()` dengan Vercel KV
//     (built-in Upstash, tanpa signup terpisah) kapanpun siap.
//
// Setup: npm install lru-cache

import { LRUCache }      from 'lru-cache'
import type { NextRequest } from 'next/server'

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface RateLimitConfig {
  /** Jumlah request maksimal */
  limit:       number
  /** Window dalam detik */
  windowSec:   number
  /** Prefix key untuk grouping (opsional) */
  prefix?:     string
}

export interface RateLimitResult {
  success:     boolean
  limit:       number
  remaining:   number
  reset:       number     // Unix timestamp (detik) kapan window reset
  retryAfter?: number     // Detik sampai bisa retry (ada jika success=false)
}

// ─── Rate limit configs per endpoint category ──────────────────────────────────

export const RATE_LIMITS = {
  // Auth routes — ketat, cegah brute force
  auth_login:    { limit: 10,  windowSec: 60 * 15 }, // 10 per 15 menit
  auth_register: { limit: 5,   windowSec: 60 * 60 }, // 5 per jam
  auth_misc:     { limit: 20,  windowSec: 60 * 15 }, // 20 per 15 menit

  // AI route — mahal, batasi lebih ketat
  ai_suggest:    { limit: 30,  windowSec: 60 * 60 }, // 30 per jam per user

  // Invite — cegah spam
  invite_send:   { limit: 10,  windowSec: 60 * 60 }, // 10 per jam

  // Upload
  upload:        { limit: 50,  windowSec: 60 * 60 }, // 50 per jam

  // Billing / webhook
  billing:       { limit: 20,  windowSec: 60      }, // 20 per menit
  webhook:       { limit: 200, windowSec: 60      }, // 200 per menit (Midtrans burst)

  // Portal routes
  portal:        { limit: 120, windowSec: 60      }, // 120 per menit

  // General authenticated routes
  api_authed:    { limit: 300, windowSec: 60      }, // 300 per menit
  api_read:      { limit: 600, windowSec: 60      }, // GET lebih longgar

  // Public / unauthenticated
  api_public:    { limit: 60,  windowSec: 60      }, // 60 per menit per IP
} as const

export type RateLimitKey = keyof typeof RATE_LIMITS

// ─── LRU-cache store ──────────────────────────────────────────────────────────
//
// Satu cache global per instance. TTL di-set ke window terpanjang (1 jam)
// supaya entry tidak expire prematur. Counter sendiri yang track resetAt.

interface TokenEntry {
  count:   number
  resetAt: number   // Unix timestamp detik
}

const cache = new LRUCache<string, TokenEntry>({
  max: 10_000,              // max unique keys per instance
  ttl: 1000 * 60 * 60,     // TTL 1 jam (ms) — bersih otomatis
})

// ─── Core rate limit function ──────────────────────────────────────────────────

export async function rateLimit(
  identifier: string,
  limitKey:   RateLimitKey,
): Promise<RateLimitResult> {
  const cfg = RATE_LIMITS[limitKey]

  try {
    const key = `${limitKey}:${identifier}`
    const now = Math.floor(Date.now() / 1000)

    let entry = cache.get(key)

    // Window baru atau belum ada entry
    if (!entry || now >= entry.resetAt) {
      entry = { count: 1, resetAt: now + cfg.windowSec }
      cache.set(key, entry)
      return {
        success:   true,
        limit:     cfg.limit,
        remaining: cfg.limit - 1,
        reset:     entry.resetAt,
      }
    }

    // Increment dalam window yang sama
    entry.count++
    cache.set(key, entry)   // update supaya TTL di-refresh

    const remaining = Math.max(0, cfg.limit - entry.count)
    const success   = entry.count <= cfg.limit

    return {
      success,
      limit:      cfg.limit,
      remaining,
      reset:      entry.resetAt,
      retryAfter: success ? undefined : entry.resetAt - now,
    }
  } catch (err) {
    // Fail open — jangan block request kalau ada error tak terduga
    console.error('[RATE-LIMIT] Error, allowing request:', err)
    const cfg2 = RATE_LIMITS[limitKey]
    return { success: true, limit: cfg2.limit, remaining: cfg2.limit, reset: 0 }
  }
}

// ─── Helper: extract identifier from request ───────────────────────────────────

export function getIdentifier(req: NextRequest, userId?: string): string {
  if (userId) return `user:${userId}`

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
      success:    false,
      error:      'Terlalu banyak permintaan. Coba lagi beberapa saat.',
      retryAfter: result.retryAfter,
    },
    {
      status:  429,
      headers: rateLimitHeaders(result),
    },
  )
}
