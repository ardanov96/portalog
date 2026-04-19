import { NextRequest, NextResponse } from 'next/server'
import { prisma } from './prisma'
import { createHash, randomBytes } from 'crypto'

// ─── Types ────────────────────────────────────────────────────────────────────

export type ApiScope =
  | 'shipments:read'  | 'shipments:write'
  | 'clients:read'    | 'clients:write'
  | 'documents:read'  | 'documents:write'
  | 'analytics:read'
  | '*'

export interface ApiContext {
  organizationId: string
  apiKeyId:       string
  scopes:         ApiScope[]
  keyName:        string
}

// ─── Key generation ───────────────────────────────────────────────────────────

export function generateApiKey(): { raw: string; prefix: string; hash: string } {
  const secret = randomBytes(32).toString('hex')
  const raw    = `fos_live_${secret}`
  const prefix = `fos_live_${secret.slice(0, 8)}...`
  const hash   = hashApiKey(raw)
  return { raw, prefix, hash }
}

export function hashApiKey(raw: string): string {
  return createHash('sha256').update(raw).digest('hex')
}

// ─── Scope mapping ────────────────────────────────────────────────────────────

const SCOPE_MAP: Record<string, ApiScope> = {
  SHIPMENTS_READ:  'shipments:read',
  SHIPMENTS_WRITE: 'shipments:write',
  CLIENTS_READ:    'clients:read',
  CLIENTS_WRITE:   'clients:write',
  DOCUMENTS_READ:  'documents:read',
  DOCUMENTS_WRITE: 'documents:write',
  ALL_READ:        '*',
  ALL_WRITE:       '*',
}

export function hasScope(ctx: ApiContext, required: ApiScope): boolean {
  if (ctx.scopes.includes('*')) return true
  return ctx.scopes.includes(required)
}

// ─── Rate limits per plan ─────────────────────────────────────────────────────

const RATE_LIMITS: Record<string, { perMinute: number; perMonth: number }> = {
  TRIAL:      { perMinute: 10,  perMonth: 1_000   },
  STARTER:    { perMinute: 30,  perMonth: 10_000  },
  GROWTH:     { perMinute: 60,  perMonth: 50_000  },
  ENTERPRISE: { perMinute: 300, perMonth: 500_000 },
}

// In-memory per-minute rate limit window
const minuteWindow = new Map<string, { count: number; resetAt: number }>()

function checkMinuteRateLimit(keyId: string, limit: number): boolean {
  const now = Date.now()
  const win = minuteWindow.get(keyId)
  if (!win || now > win.resetAt) {
    minuteWindow.set(keyId, { count: 1, resetAt: now + 60_000 })
    return true
  }
  if (win.count >= limit) return false
  win.count++
  return true
}

// ─── Main authenticator ───────────────────────────────────────────────────────

export async function authenticateApiKey(
  req: NextRequest,
  requiredScope: ApiScope,
): Promise<{ ctx: ApiContext } | { error: NextResponse }> {
  const auth = req.headers.get('authorization') ?? ''
  if (!auth.startsWith('Bearer fos_')) {
    return { error: apiError(401, 'UNAUTHORIZED',
      'Sertakan header: Authorization: Bearer fos_live_...') }
  }

  const rawKey  = auth.slice('Bearer '.length).trim()
  const keyHash = hashApiKey(rawKey)

  const apiKey = await prisma.apiKey.findUnique({
    where:   { keyHash },
    include: {
      organization: {
        select: { id: true, subscription: { select: { plan: true, status: true } } },
      },
    },
  })

  if (!apiKey)      return { error: apiError(401, 'INVALID_API_KEY',  'API key tidak valid') }
  if (!apiKey.isActive)  return { error: apiError(401, 'API_KEY_INACTIVE', 'API key dinonaktifkan') }
  if (apiKey.expiresAt && new Date() > apiKey.expiresAt)
    return { error: apiError(401, 'API_KEY_EXPIRED', 'API key kadaluarsa') }

  const sub = apiKey.organization.subscription
  if (!sub || !['ACTIVE', 'TRIALING'].includes(sub.status))
    return { error: apiError(403, 'SUBSCRIPTION_INACTIVE', 'Subscription tidak aktif') }

  const planLimits = RATE_LIMITS[sub.plan] ?? RATE_LIMITS.STARTER

  if (!checkMinuteRateLimit(apiKey.id, planLimits.perMinute))
    return { error: apiError(429, 'RATE_LIMIT_EXCEEDED',
      `Batas: ${planLimits.perMinute} req/menit untuk paket ${sub.plan}`) }

  if (apiKey.monthlyCount >= (apiKey.monthlyLimit ?? planLimits.perMonth))
    return { error: apiError(429, 'MONTHLY_LIMIT_EXCEEDED',
      `Batas bulanan tercapai (${apiKey.monthlyLimit} request)`) }

  const mappedScopes = apiKey.scopes.map(s => SCOPE_MAP[s] ?? s as ApiScope)
  const ctx: ApiContext = {
    organizationId: apiKey.organizationId,
    apiKeyId:       apiKey.id,
    scopes:         mappedScopes,
    keyName:        apiKey.name,
  }

  if (!hasScope(ctx, requiredScope))
    return { error: apiError(403, 'INSUFFICIENT_SCOPE',
      `Scope yang dibutuhkan: ${requiredScope}`) }

  // Update usage stats (fire-and-forget)
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0] ?? null
  prisma.apiKey.update({
    where: { id: apiKey.id },
    data: {
      lastUsedAt:   new Date(),
      lastUsedIp:   ip,
      requestCount: { increment: 1 },
      monthlyCount: { increment: 1 },
    },
  }).catch(() => {})

  return { ctx }
}

// ─── Request logging ──────────────────────────────────────────────────────────

export async function logApiRequest(opts: {
  apiKeyId: string; endpoint: string; method: string
  status: number; ip?: string | null; userAgent?: string | null; durationMs?: number
}) {
  await prisma.apiKeyLog.create({ data: {
    apiKeyId: opts.apiKeyId, endpoint: opts.endpoint, method: opts.method,
    status: opts.status, ipAddress: opts.ip, userAgent: opts.userAgent, durationMs: opts.durationMs,
  }}).catch(() => {})
}

// ─── Standard responses ───────────────────────────────────────────────────────

export function apiError(status: number, code: string, message: string, details?: any): NextResponse {
  return NextResponse.json(
    { success: false, error: { code, message, ...(details && { details }) }, docs: 'https://Portalog.id/docs/api' },
    { status, headers: { 'Content-Type': 'application/json', 'X-API-Version': 'v1' } }
  )
}

export function apiSuccess<T>(data: T, meta?: any, status = 200): NextResponse {
  return NextResponse.json(
    { success: true, data, ...(meta && { meta }) },
    { status, headers: { 'Content-Type': 'application/json', 'X-API-Version': 'v1' } }
  )
}

export function parsePagination(req: NextRequest) {
  const sp    = new URL(req.url).searchParams
  const page  = Math.max(1, parseInt(sp.get('page') ?? '1'))
  const limit = Math.min(100, Math.max(1, parseInt(sp.get('limit') ?? '20')))
  return { page, limit, skip: (page - 1) * limit }
}

export function paginationMeta(total: number, page: number, limit: number) {
  return { total, page, limit, totalPages: Math.ceil(total / limit), hasNext: page * limit < total, hasPrev: page > 1 }
}
