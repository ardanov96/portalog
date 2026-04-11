'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import {
  CheckCircle2, Circle, X, Rocket, Sparkles,
  Building2, Users, Ship, FileText, Globe, Receipt,
  ArrowRight, ChevronRight, Trophy, Star,
} from 'lucide-react'

interface Step {
  id: string; title: string; description: string
  done: boolean; href?: string; cta: string; points: number
}

interface OnboardingData {
  completed: boolean; totalPoints: number; earnedPoints: number
  steps: Step[]; orgName: string; userName: string
}

const STEP_ICONS: Record<string, any> = {
  org_profile:    Building2,
  add_client:     Users,
  create_shipment: Ship,
  upload_document: FileText,
  activate_portal: Globe,
  create_invoice:  Receipt,
}

const STEP_COLORS: Record<string, { bg: string; icon: string; ring: string }> = {
  org_profile:    { bg: 'bg-blue-50',    icon: 'text-blue-600',   ring: 'ring-blue-200'   },
  add_client:     { bg: 'bg-violet-50',  icon: 'text-violet-600', ring: 'ring-violet-200' },
  create_shipment: { bg: 'bg-brand-50',  icon: 'text-brand-600',  ring: 'ring-brand-200'  },
  upload_document: { bg: 'bg-amber-50',  icon: 'text-amber-600',  ring: 'ring-amber-200'  },
  activate_portal: { bg: 'bg-teal-50',   icon: 'text-teal-600',   ring: 'ring-teal-200'   },
  create_invoice:  { bg: 'bg-green-50',  icon: 'text-green-600',  ring: 'ring-green-200'  },
}

// ─── Milestone badges ──────────────────────────────────────────────────────────

function MilestoneBadge({ pct }: { pct: number }) {
  if (pct < 33)  return null
  if (pct < 66)  return (
    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-full">
      <Star className="w-3.5 h-3.5 text-amber-500" />
      <span className="text-xs font-semibold text-amber-700">Pemula</span>
    </div>
  )
  if (pct < 100) return (
    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-full">
      <Star className="w-3.5 h-3.5 text-blue-500" />
      <span className="text-xs font-semibold text-blue-700">Profesional</span>
    </div>
  )
  return (
    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 border border-green-200 rounded-full">
      <Trophy className="w-3.5 h-3.5 text-green-600" />
      <span className="text-xs font-semibold text-green-700">Expert</span>
    </div>
  )
}

// ─── Single step card ──────────────────────────────────────────────────────────

function StepItem({ step, isActive, onExpand }: {
  step: Step; isActive: boolean; onExpand: () => void
}) {
  const Icon   = STEP_ICONS[step.id] ?? Ship
  const colors = STEP_COLORS[step.id] ?? STEP_COLORS.create_shipment

  return (
    <div
      className={cn(
        'border rounded-2xl overflow-hidden transition-all duration-200',
        step.done
          ? 'border-green-100 bg-green-50/30'
          : isActive
          ? `border-brand-200 bg-white ring-1 ring-brand-100 shadow-sm`
          : 'border-slate-200 bg-white hover:border-slate-300'
      )}
    >
      <button
        className="w-full flex items-center gap-4 px-4 py-4 text-left"
        onClick={onExpand}
      >
        {/* Icon / check */}
        <div className={cn(
          'w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all',
          step.done
            ? 'bg-green-100'
            : isActive
            ? `${colors.bg} ring-2 ${colors.ring}`
            : colors.bg
        )}>
          {step.done
            ? <CheckCircle2 className="w-5 h-5 text-green-600" />
            : <Icon className={cn('w-5 h-5', colors.icon)} />
          }
        </div>

        {/* Title + progress */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className={cn('text-sm font-semibold',
              step.done ? 'text-slate-400 line-through' : 'text-slate-800')}>
              {step.title}
            </p>
            {!step.done && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500">
                +{step.points} pts
              </span>
            )}
          </div>
          {!isActive && !step.done && (
            <p className="text-xs text-slate-400 mt-0.5 truncate">{step.description}</p>
          )}
        </div>

        {/* Status */}
        <div className="shrink-0">
          {step.done
            ? <span className="text-xs font-bold text-green-600 bg-green-50 px-2.5 py-1 rounded-full border border-green-100">✓ Selesai</span>
            : <ChevronRight className={cn('w-4 h-4 text-slate-400 transition-transform', isActive && 'rotate-90')} />
          }
        </div>
      </button>

      {/* Expanded detail */}
      {isActive && !step.done && (
        <div className="px-4 pb-4 pt-0">
          <div className="ml-14">
            <p className="text-sm text-slate-600 leading-relaxed mb-3">{step.description}</p>
            {step.href ? (
              <Link
                href={step.href}
                className={cn(
                  'inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all',
                  'bg-brand-600 text-white hover:bg-brand-700 active:scale-[0.98]'
                )}
              >
                {step.cta} <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            ) : (
              <span className="text-xs text-slate-400 italic">
                Selesaikan langkah sebelumnya terlebih dahulu
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Main component ────────────────────────────────────────────────────────────

export function OnboardingChecklist({ onClose }: { onClose?: () => void }) {
  const [data, setData]       = useState<OnboardingData | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeId, setActiveId] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/onboarding').then(r => r.json()).then(d => {
      if (d.success) {
        setData(d.data)
        // Auto-expand step berikutnya yang belum done
        const next = d.data.steps.find((s: Step) => !s.done)
        if (next) setActiveId(next.id)
      }
    }).finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="p-8 text-center">
      <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto" />
    </div>
  )

  if (!data) return null

  const doneCount  = data.steps.filter(s => s.done).length
  const pct        = Math.round((data.earnedPoints / data.totalPoints) * 100)
  const isComplete = data.completed

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-start gap-4">
        <div className={cn(
          'w-12 h-12 rounded-2xl flex items-center justify-center shrink-0',
          isComplete ? 'bg-green-100' : 'bg-brand-50'
        )}>
          {isComplete
            ? <Sparkles className="w-6 h-6 text-green-600" />
            : <Rocket className="w-6 h-6 text-brand-600" />
          }
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-base font-bold text-slate-900">
              {isComplete ? '🎉 Setup Selesai!' : 'Setup ForwarderOS'}
            </h2>
            <MilestoneBadge pct={pct} />
          </div>
          <p className="text-sm text-slate-500 mt-0.5">
            {isComplete
              ? `Selamat, ${data.userName.split(' ')[0]}! Semua langkah setup berhasil diselesaikan.`
              : `Selamat datang, ${data.userName.split(' ')[0]}! Selesaikan setup untuk memaksimalkan ForwarderOS.`
            }
          </p>
        </div>
        {onClose && (
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all shrink-0">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Progress */}
      <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-slate-700">{doneCount} dari {data.steps.length} langkah</span>
            <span className="text-xs text-slate-400">selesai</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-lg font-bold text-brand-600">{data.earnedPoints}</span>
            <span className="text-xs text-slate-400">/ {data.totalPoints} pts</span>
          </div>
        </div>
        <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
          <div
            className={cn('h-full rounded-full transition-all duration-700',
              isComplete ? 'bg-green-500' : 'bg-brand-500')}
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="flex justify-between mt-1.5">
          <span className="text-[10px] text-slate-400">0%</span>
          <span className="text-[10px] font-semibold text-brand-600">{pct}% selesai</span>
          <span className="text-[10px] text-slate-400">100%</span>
        </div>
      </div>

      {/* Steps */}
      <div className="space-y-2">
        {data.steps.map(step => (
          <StepItem
            key={step.id}
            step={step}
            isActive={activeId === step.id}
            onExpand={() => setActiveId(activeId === step.id ? null : step.id)}
          />
        ))}
      </div>

      {/* Completion message */}
      {isComplete && (
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-2xl p-5 text-center">
          <Trophy className="w-8 h-8 text-green-600 mx-auto mb-2" />
          <p className="text-sm font-bold text-green-800 mb-1">Anda sudah Expert! 🏆</p>
          <p className="text-xs text-green-600">ForwarderOS siap membantu operasional freight forwarding Anda sehari-hari.</p>
        </div>
      )}

      {/* Tips */}
      {!isComplete && (
        <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
          <p className="text-xs font-semibold text-blue-700 mb-1">💡 Tips</p>
          <p className="text-xs text-blue-600 leading-relaxed">
            Selesaikan semua langkah untuk mendapatkan {data.totalPoints} poin dan badge Expert.
            Setiap langkah membuka fitur yang membantu efisiensi operasional Anda.
          </p>
        </div>
      )}
    </div>
  )
}
