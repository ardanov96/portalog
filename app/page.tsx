// app/page.tsx — Server Component, JANGAN tambah 'use client'
import LandingPage from '@/components/landing/LandingPage'

export const metadata = {
  title: 'ForwarderOS — Platform Manajemen Ekspedisi & PPJK',
  description: 'Platform manajemen end-to-end untuk perusahaan freight forwarder dan PPJK Indonesia.',
}

export default function Page() {
  return <LandingPage />
}
