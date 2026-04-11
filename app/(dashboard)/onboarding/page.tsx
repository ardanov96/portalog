import type { Metadata } from 'next'
import { OnboardingChecklist } from '@/components/onboarding/OnboardingChecklist'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'

export const metadata: Metadata = { title: 'Setup & Onboarding' }

export default function OnboardingPage() {
  return (
    <div className="max-w-xl mx-auto space-y-4">
      <div>
        <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-brand-600 transition-colors mb-4">
          <ChevronLeft className="w-4 h-4" /> Dashboard
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">Setup &amp; Onboarding</h1>
        <p className="text-slate-500 text-sm mt-1">Ikuti langkah-langkah berikut untuk mulai menggunakan ForwarderOS</p>
      </div>
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <OnboardingChecklist />
      </div>
    </div>
  )
}
