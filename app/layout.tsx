import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { PWAProvider, PWAInstallPrompt } from '@/components/pwa/PWAProvider'

const inter = Inter({ subsets: ['latin'] })

export const viewport: Viewport = {
  themeColor:       '#3b82f6',
  width:            'device-width',
  initialScale:     1,
  maximumScale:     1,
  userScalable:     false,
  viewportFit:      'cover',
}

export const metadata: Metadata = {
  title:       { default: 'ForwarderOS', template: '%s | ForwarderOS' },
  description: 'Sistem manajemen operasional Freight Forwarder & PPJK',
  manifest:    '/manifest.json',
  appleWebApp: {
    capable:         true,
    statusBarStyle:  'black-translucent',
    title:           'ForwarderOS',
    startupImage:    '/icons/icon-512x512.png',
  },
  formatDetection: { telephone: false },
  icons: {
    icon:    [
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple:   [
      { url: '/icons/icon-152x152.png', sizes: '152x152', type: 'image/png' },
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
    ],
    shortcut: '/icons/icon-192x192.png',
  },
  other: {
    'mobile-web-app-capable': 'yes',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="ForwarderOS" />
        <meta name="application-name" content="ForwarderOS" />
        <meta name="msapplication-TileColor" content="#3b82f6" />
        <meta name="msapplication-TileImage" content="/icons/icon-144x144.png" />
      </head>
      <body className={`${inter.className} antialiased`}>
        <PWAProvider>
          {children}
          <PWAInstallPrompt />
        </PWAProvider>
      </body>
    </html>
  )
}
