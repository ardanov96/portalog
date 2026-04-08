import type { Metadata } from 'next'
import { Settings } from 'lucide-react'

export const metadata: Metadata = { title: 'Pengaturan' }

export default function SettingsPage() {
  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Pengaturan</h1>
        <p className="text-slate-500 text-sm">Kelola akun dan organisasi Anda</p>
      </div>
      <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
        <Settings className="w-10 h-10 text-slate-300 mx-auto mb-3" />
        <p className="text-slate-500 font-medium">Pengaturan akan tersedia di sini</p>
      </div>
    </div>
  )
}
