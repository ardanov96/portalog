import type { Metadata } from 'next'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { ShipmentForm } from '@/components/shipments/ShipmentForm'

export const metadata: Metadata = { title: 'Shipment Baru' }

export default function NewShipmentPage() {
  return (
    <div className="max-w-3xl space-y-6">

      {/* Header */}
      <div>
        <Link
          href="/shipments"
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-4 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" /> Kembali ke Shipments
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">Buat Shipment Baru</h1>
        <p className="text-slate-500 text-sm mt-1">
          Isi detail pengiriman ekspor atau impor
        </p>
      </div>

      {/* Form card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
        <ShipmentForm />
      </div>

    </div>
  )
}
