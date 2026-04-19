'use client'

import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { Download, X, Smartphone, Chrome, Share } from 'lucide-react'

// ─── Service Worker Registration ──────────────────────────────────────────────

export function PWAProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!('serviceWorker' in navigator)) return

    const register = async () => {
      try {
        const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' })
        console.log('[PWA] Service worker registered:', reg.scope)

        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing
          if (!newWorker) return
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // Ada update tersedia — trigger refresh otomatis setelah 3 detik
              console.log('[PWA] Update tersedia, refresh dalam 3 detik...')
              setTimeout(() => window.location.reload(), 3000)
            }
          })
        })
      } catch (err) {
        console.warn('[PWA] Service worker registration gagal:', err)
      }
    }

    if (document.readyState === 'complete') register()
    else window.addEventListener('load', register)
  }, [])

  return <>{children}</>
}

// ─── Install Prompt Banner ─────────────────────────────────────────────────────

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const DISMISSED_KEY = 'fos_pwa_install_dismissed'

function getIOSInstructions() {
  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold text-slate-900">Install di iPhone / iPad:</p>
      <ol className="space-y-1.5 text-sm text-slate-600">
        <li className="flex items-start gap-2">
          <span className="w-5 h-5 rounded-full bg-brand-100 text-brand-700 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">1</span>
          <span>Tap tombol <strong>Share</strong> (<Share className="inline w-4 h-4" />) di bawah Safari</span>
        </li>
        <li className="flex items-start gap-2">
          <span className="w-5 h-5 rounded-full bg-brand-100 text-brand-700 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">2</span>
          <span>Pilih <strong>"Add to Home Screen"</strong></span>
        </li>
        <li className="flex items-start gap-2">
          <span className="w-5 h-5 rounded-full bg-brand-100 text-brand-700 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">3</span>
          <span>Tap <strong>Add</strong> di pojok kanan atas</span>
        </li>
      </ol>
    </div>
  )
}

export function PWAInstallPrompt() {
  const [prompt, setPrompt]     = useState<BeforeInstallPromptEvent | null>(null)
  const [isIOS, setIsIOS]       = useState(false)
  const [showIOS, setShowIOS]   = useState(false)
  const [installed, setInstalled] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const [installing, setInstalling] = useState(false)

  useEffect(() => {
    // Cek apakah sudah diinstall
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setInstalled(true)
      return
    }

    // Cek apakah sudah pernah dismiss
    if (localStorage.getItem(DISMISSED_KEY) === 'true') {
      setDismissed(true)
      return
    }

    // Deteksi iOS (tidak support beforeinstallprompt)
    const isIOSDevice = /iphone|ipad|ipod/i.test(navigator.userAgent) && !(window as any).MSStream
    setIsIOS(isIOSDevice)

    // Tangkap install prompt (Chrome/Android)
    const handler = (e: Event) => {
      e.preventDefault()
      setPrompt(e as BeforeInstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', handler)

    // Deteksi setelah diinstall
    window.addEventListener('appinstalled', () => setInstalled(true))

    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const install = async () => {
    if (!prompt) return
    setInstalling(true)
    await prompt.prompt()
    const { outcome } = await prompt.userChoice
    if (outcome === 'accepted') setInstalled(true)
    else dismiss()
    setInstalling(false)
    setPrompt(null)
  }

  const dismiss = () => {
    localStorage.setItem(DISMISSED_KEY, 'true')
    setDismissed(true)
    setShowIOS(false)
  }

  // Jangan tampilkan jika: sudah install, sudah dismiss, tidak ada prompt, bukan iOS
  if (installed || dismissed) return null
  if (!prompt && !isIOS) return null

  // Banner untuk Android/Chrome
  if (prompt) {
    return (
      <div className="fixed bottom-0 left-0 right-0 z-50 p-4 safe-area-bottom">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl p-4 max-w-md mx-auto">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-brand-600 flex items-center justify-center shrink-0">
              <img src="/icons/icon-96x96.png" alt="Portalog" className="w-8 h-8 rounded-lg" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-slate-900">Install Portalog</p>
              <p className="text-xs text-slate-500">Akses lebih cepat dari home screen</p>
            </div>
            <button onClick={dismiss} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all shrink-0">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex gap-2.5 mt-3.5">
            <button onClick={dismiss} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-all">
              Nanti
            </button>
            <button
              onClick={install}
              disabled={installing}
              className="flex-1 py-2.5 rounded-xl bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 disabled:opacity-70 transition-all flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" />
              {installing ? 'Menginstall...' : 'Install'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Banner untuk iOS
  if (isIOS) {
    return (
      <>
        <div className="fixed bottom-0 left-0 right-0 z-50 p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl p-4 max-w-md mx-auto">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-brand-600 flex items-center justify-center shrink-0">
                <Smartphone className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-slate-900">Install Portalog</p>
                <p className="text-xs text-slate-500">Tambahkan ke Home Screen</p>
              </div>
              <button onClick={dismiss} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all">
                <X className="w-4 h-4" />
              </button>
            </div>
            <button
              onClick={() => setShowIOS(true)}
              className="w-full py-2.5 rounded-xl bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 transition-all"
            >
              Lihat Cara Install
            </button>
          </div>
        </div>

        {/* iOS instructions modal */}
        {showIOS && (
          <div className="fixed inset-0 z-50 flex items-end justify-center p-4 bg-black/40">
            <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm">
              {getIOSInstructions()}
              <button
                onClick={() => { setShowIOS(false); dismiss() }}
                className="w-full mt-5 py-2.5 rounded-xl bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 transition-all"
              >
                OK, Mengerti
              </button>
            </div>
          </div>
        )}
      </>
    )
  }

  return null
}
