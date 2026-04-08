import type { Metadata } from 'next'
import { Users, Plus } from 'lucide-react'

export const metadata: Metadata = { title: 'Klien' }

export default function ClientsPage() {
  return (
    <div className="max-w-7xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Klien</h1>
          <p className="text-slate-500 text-sm">Daftar importir & eksportir</p>
        </div>
        <button className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand-600 text-white rounded-xl text-sm font-semibold hover:bg-brand-700 transition-colors">
          <Plus className="w-4 h-4" /> Tambah Klien
        </button>
      </div>
      <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
        <Users className="w-10 h-10 text-slate-300 mx-auto mb-3" />
        <p className="text-slate-500 font-medium">Daftar klien akan tampil di sini</p>
      </div>
    </div>
  )
}
