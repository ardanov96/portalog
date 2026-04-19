// ─── Logger — Better Stack (Logtail) ─────────────────────────────────────────
//
// Covers:
//   ✅ Structured logs (info / warn / error)
//   ✅ Uncaught server errors
//   ✅ Slow API route detection
//   ✅ Client-side errors (via logClientError)
//
// Setup:
//   1. Daftar di logs.betterstack.com (gratis, no CC)
//   2. New Source → pilih "Node.js"
//   3. Copy "Source Token" → isi .env:
//        BETTERSTACK_TOKEN="xxxxx"
//   4. npm install @logtail/node @logtail/next
//
// Kalau BETTERSTACK_TOKEN tidak di-set → log ke console saja (dev mode)

import { Logtail } from '@logtail/node'

// ─── Singleton Logtail instance ───────────────────────────────────────────────

let _logtail: Logtail | null = null

function getLogtail(): Logtail | null {
  if (_logtail) return _logtail
  const token = process.env.BETTERSTACK_TOKEN
  if (!token) return null
  _logtail = new Logtail(token)
  return _logtail
}

// ─── Context type ─────────────────────────────────────────────────────────────

export interface LogContext {
  [key: string]: unknown
  userId?:     string
  orgId?:      string
  requestId?:  string
  path?:       string
  method?:     string
  statusCode?: number
  durationMs?: number
}

// ─── Core logger ──────────────────────────────────────────────────────────────

export const logger = {

  info(message: string, context?: LogContext) {
    const logtail = getLogtail()
    if (logtail) {
      logtail.info(message, context)
    } else {
      console.info(`[INFO] ${message}`, context ?? '')
    }
  },

  warn(message: string, context?: LogContext) {
    const logtail = getLogtail()
    if (logtail) {
      logtail.warn(message, context)
    } else {
      console.warn(`[WARN] ${message}`, context ?? '')
    }
  },

  error(message: string, error?: unknown, context?: LogContext) {
    const logtail  = getLogtail()
    const errMeta  = serializeError(error)

    const payload = { ...errMeta, ...context }

    if (logtail) {
      logtail.error(message, payload)
    } else {
      console.error(`[ERROR] ${message}`, payload)
    }
  },

  // Khusus untuk uncaught / unhandled errors di API route
  fatal(message: string, error?: unknown, context?: LogContext) {
    const logtail = getLogtail()
    const errMeta = serializeError(error)
    const payload = { level: 'fatal', ...errMeta, ...context }

    if (logtail) {
      logtail.error(message, payload)   // Logtail pakai error level, kita tag manual
    } else {
      console.error(`[FATAL] ${message}`, payload)
    }
  },

  // Flush — panggil di akhir API route kalau perlu pastikan log terkirim
  async flush() {
    const logtail = getLogtail()
    if (logtail) await logtail.flush()
  },
}

// ─── Error serializer ─────────────────────────────────────────────────────────

function serializeError(error: unknown): Record<string, unknown> {
  if (!error) return {}
  if (error instanceof Error) {
    return {
      errorName:    error.name,
      errorMessage: error.message,
      errorStack:   error.stack,
    }
  }
  return { errorRaw: String(error) }
}

// ─── API Route wrapper — auto log + slow route detection ─────────────────────
//
// Pakai ini untuk wrap handler di app/api/**/route.ts:
//
//   export const GET = withLogger('GET /api/shipments', async (req) => {
//     ...
//   })

type RouteHandler = (req: Request, ctx?: any) => Promise<Response>

const SLOW_THRESHOLD_MS = 2000   // 2 detik → warning

export function withLogger(routeName: string, handler: RouteHandler): RouteHandler {
  return async (req: Request, ctx?: any) => {
    const start     = Date.now()
    const requestId = crypto.randomUUID()

    try {
      const res        = await handler(req, ctx)
      const durationMs = Date.now() - start
      const url        = new URL(req.url)

      const logCtx: LogContext = {
        requestId,
        path:       url.pathname,
        method:     req.method,
        statusCode: res.status,
        durationMs,
      }

      if (durationMs > SLOW_THRESHOLD_MS) {
        logger.warn(`Slow route: ${routeName} (${durationMs}ms)`, logCtx)
      } else {
        logger.info(`${routeName} ${res.status}`, logCtx)
      }

      return res
    } catch (err) {
      const durationMs = Date.now() - start
      const url        = new URL(req.url)

      logger.fatal(`Unhandled error in ${routeName}`, err, {
        requestId,
        path:      url.pathname,
        method:    req.method,
        durationMs,
      })

      // Re-throw supaya Next.js tetap return 500 default
      throw err
    }
  }
}

// ─── Client-side error logger ─────────────────────────────────────────────────
//
// Pakai di app/global-error.tsx atau Error Boundary:
//
//   logClientError(error, { path: window.location.pathname })

export async function logClientError(
  error: unknown,
  context?: LogContext,
): Promise<void> {
  try {
    await fetch('/api/log/client-error', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        ...serializeError(error),
        ...context,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString(),
      }),
      keepalive: true,   // penting — tetap kirim meski user navigasi pergi
    })
  } catch {
    // Jangan throw di error handler
    console.error('[LOGGER] Gagal kirim client error:', error)
  }
}
