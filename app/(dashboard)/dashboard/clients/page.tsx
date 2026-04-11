import type { Metadata } from 'next'
import { ClientsPageClient } from './ClientsPageClient'

export const metadata: Metadata = { title: 'Klien' }

export default function ClientsPage() {
  return <ClientsPageClient />
}
