import type { Metadata } from 'next'
import { Ship, Plus } from 'lucide-react'
import Link from 'next/link'

export const metadata: Metadata = { title: 'Shipments' }

export default function ShipmentsPage() {
  return (
    <div className="max-w-7xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Shipments</h1>
          <p className="text-slate-500 text-sm">Kelola semua pengiriman</p>
        </div>
        <button className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand-600 text-white rounded-xl text-sm font-semibold hover:bg-brand-700 transition-colors">
          <Plus className="w-4 h-4" /> Shipment Baru
        </button>
      </div>
      <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
        <Ship className="w-10 h-10 text-slate-300 mx-auto mb-3" />
        <p className="text-slate-500 font-medium">Daftar shipment akan tampil di sini</p>
        <p className="text-slate-400 text-sm mt-1">Data tersedia via <code className="bg-slate-100 px-1 rounded">/api/shipments</code></p>
      </div>
    </div>
  )
}
