import type { Metadata } from 'next'
import { FileText } from 'lucide-react'

export const metadata: Metadata = { title: 'Dokumen' }

export default function DocumentsPage() {
  return (
    <div className="max-w-7xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dokumen</h1>
        <p className="text-slate-500 text-sm">Semua dokumen lintas shipment</p>
      </div>
      <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
        <FileText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
        <p className="text-slate-500 font-medium">Dokumen akan tampil di sini</p>
      </div>
    </div>
  )
}
