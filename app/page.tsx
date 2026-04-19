import LandingPage from '@/components/landing/LandingPage'

export const metadata = {
  title: 'Portalog — Platform Manajemen Ekspedisi & PPJK',
  description: 'Platform manajemen end-to-end untuk perusahaan freight forwarder dan PPJK Indonesia.',
  icons: {
    icon: '/logo.png',
    apple: '/logo.png',
  },
}

export default function Page() {
  return <LandingPage />
}
