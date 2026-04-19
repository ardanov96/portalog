// lib/logger-client.ts
// ─── Client-side logger ───────────────────────────────────────────────────────
// HANYA untuk dipakai di Client Components ('use client')
// Tidak ada import Node.js — aman di browser

export async function logClientError(
  error: unknown,
  context?: Record<string, unknown>,
): Promise<void> {
  try {
    const errMeta =
      error instanceof Error
        ? { errorName: error.name, errorMessage: error.message, errorStack: error.stack }
        : { errorRaw: String(error) }

    await fetch('/api/log/client-error', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        ...errMeta,
        ...context,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString(),
      }),
      keepalive: true,
    })
  } catch {
    console.error('[LOGGER] Gagal kirim client error:', error)
  }
}
