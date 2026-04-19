'use client'
// app/global-error.tsx
// ─── Global Error Boundary ────────────────────────────────────────────────────
// Menangkap semua uncaught error di sisi client dan forward ke Better Stack

import { useEffect }       from 'react'
import { logClientError }  from '@/lib/logger-client'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    logClientError(error, {
      path:   window.location.pathname,
      digest: error.digest,
    } as any)
  }, [error])

  return (
    <html>
      <body>
        <div style={{
          display:        'flex',
          flexDirection:  'column',
          alignItems:     'center',
          justifyContent: 'center',
          minHeight:      '100vh',
          fontFamily:     'system-ui, sans-serif',
          gap:            '16px',
          padding:        '32px',
          textAlign:      'center',
        }}>
          <div style={{ fontSize: '48px' }}>⚠️</div>
          <h2 style={{ margin: 0, fontSize: '20px', color: '#0f172a' }}>
            Terjadi kesalahan
          </h2>
          <p style={{ margin: 0, fontSize: '14px', color: '#64748b', maxWidth: '400px' }}>
            Mohon maaf atas ketidaknyamanan ini. Tim kami sudah mendapat notifikasi.
          </p>
          <button
            onClick={reset}
            style={{
              background:   '#3b82f6',
              color:        '#fff',
              border:       'none',
              borderRadius: '8px',
              padding:      '10px 24px',
              fontSize:     '14px',
              fontWeight:   600,
              cursor:       'pointer',
            }}
          >
            Coba lagi
          </button>
        </div>
      </body>
    </html>
  )
}
