import type { Metadata } from 'next'
import { ShipmentsPageClient } from './ShipmentsPageClient'

export const metadata: Metadata = { title: 'Shipments' }

export default function ShipmentsPage() {
  return <ShipmentsPageClient />
}