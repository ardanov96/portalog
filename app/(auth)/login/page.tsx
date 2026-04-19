import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { Suspense } from 'react'
import { LoginForm } from '@/components/forms/LoginForm'

export const metadata: Metadata = { title: 'Login' }

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
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
          <h1 className="text-2xl font-bold text-slate-900">Portalog</h1>
          <p className="text-slate-500 text-sm mt-1">Masuk ke akun Anda</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
          <Suspense fallback={null}>
            <LoginForm />
          </Suspense>
          <p className="text-center text-sm text-slate-500 mt-6">
            Belum punya akun?{' '}
            <Link href="/register" className="text-brand-600 font-semibold hover:underline">Daftar gratis</Link>
          </p>
        </div>
      </div>
    </div>
  )
}