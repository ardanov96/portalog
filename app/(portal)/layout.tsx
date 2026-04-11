import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import '../globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: { default: 'Tracking Portal', template: '%s | Tracking Portal' },
  description: 'Portal tracking pengiriman',
}

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body className={`${inter.className} antialiased bg-slate-50 min-h-screen`}>
        {children}
      </body>
    </html>
  )
}
