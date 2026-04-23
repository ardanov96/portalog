import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { PWAProvider, PWAInstallPrompt } from '@/components/pwa/PWAProvider'

const inter = Inter({ subsets: ['latin'] })

export const viewport: Viewport = {
  themeColor:    '#3b82f6',
  width:         'device-width',
  initialScale:  1,
  maximumScale:  1,
  userScalable:  false,
  viewportFit:   'cover',
}

export const metadata: Metadata = {
  title:       { default: 'Portalog', template: '%s | Portalog' },
  description: 'Sistem manajemen operasional Freight Forwarder & PPJK',
  manifest:    '/manifest.json',
  appleWebApp: {
    capable:        true,
    statusBarStyle: 'black-translucent',
    title:          'Portalog',
  },
  formatDetection: { telephone: false },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body className={`${inter.className} antialiased`}>
        <PWAProvider>
          {children}
          <PWAInstallPrompt />
        </PWAProvider>
      </body>
    </html>
  )
}