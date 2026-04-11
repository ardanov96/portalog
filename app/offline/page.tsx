export default function OfflinePage() {
  return (
    <html lang="id">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Offline — ForwarderOS</title>
      </head>
      <body style={{ margin: 0, fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif', background: '#f8fafc', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        <div style={{ background: 'white', borderRadius: '1.5rem', border: '1px solid #e2e8f0', padding: '3rem 2.5rem', maxWidth: 400, width: '100%', textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1.25rem' }}>📡</div>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.75rem' }}>
            Tidak Ada Koneksi
          </h1>
          <p style={{ fontSize: '0.875rem', color: '#64748b', lineHeight: 1.6, marginBottom: '1.75rem' }}>
            ForwarderOS membutuhkan koneksi internet untuk menampilkan data terbaru. Periksa koneksi Anda dan coba lagi.
          </p>
          <button
            onClick={() => location.reload()}
            style={{ background: '#3b82f6', color: 'white', border: 'none', padding: '0.75rem 2rem', borderRadius: '0.75rem', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer', width: '100%' }}
          >
            Coba Lagi
          </button>
        </div>
      </body>
    </html>
  )
}
