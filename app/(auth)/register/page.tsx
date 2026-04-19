import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { RegisterForm } from '@/components/forms/RegisterForm'

export const metadata: Metadata = { title: 'Daftar' }

export default function RegisterPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center mb-4">
            <Image
              src="/logo.png"
              alt="Portalog Logo"
              width={250}
              height={154}
              className="h-8 w-auto object-contain transition-all duration-200 hover:opacity-80"
              priority
            />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Buat akun baru</h1>
          <p className="text-slate-500 text-sm mt-1">Gratis selama masa uji coba</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
          <RegisterForm />
          <p className="text-center text-sm text-slate-500 mt-6">
            Sudah punya akun?{' '}
            <Link href="/login" className="text-brand-600 font-semibold hover:underline">Masuk</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
