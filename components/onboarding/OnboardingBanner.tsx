'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import {
  CheckCircle2, Circle, ChevronDown, ChevronUp,
  X, Sparkles, ArrowRight, Rocket,
} from 'lucide-react'

interface Step {
  id: string; title: string; description: string
  done: boolean; href?: string; cta: string; points: number
}

interface OnboardingData {
  completed: boolean; totalPoints: number; earnedPoints: number
  steps: Step[]; orgName: string; userName: string
}

const DISMISS_KEY = 'Portalog_onboarding_dismissed'

export function OnboardingBanner() {
  const [data, setData]         = useState<OnboardingData | null>(null)
  const [expanded, setExpanded] = useState(true)
  const [dismissed, setDismissed] = useState(false)
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    const wasDismissed = localStorage.getItem(DISMISS_KEY) === 'true'
    if (wasDismissed) { setDismissed(true); setLoading(false); return }

    fetch('/api/onboarding').then(r => r.json()).then(d => {
      if (d.success) {
        setData(d.data)
        // Auto-collapse kalau sudah >50% done
        if (d.data.earnedPoints / d.data.totalPoints > 0.5) setExpanded(false)
      }
    }).finally(() => setLoading(false))
  }, [])

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, 'true')
    setDismissed(true)
  }

  if (loading || dismissed || !data) return null
  if (data.completed) return <CompletedBanner name={data.userName} onDismiss={dismiss} />

  const doneCount = data.steps.filter(s => s.done).length
  const pct       = Math.round((data.earnedPoints / data.totalPoints) * 100)
  const nextStep  = data.steps.find(s => !s.done)

  return (
    <div className="bg-gradient-to-r from-brand-600 to-indigo-600 rounded-2xl overflow-hidden shadow-sm">
      {/* Header */}
      <div className="px-5 py-4 flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
          <Rocket className="w-4.5 h-4.5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-white">
            Setup Portalog — {doneCount}/{data.steps.length} langkah selesai
          </p>
          {/* Progress bar */}
          <div className="flex items-center gap-2 mt-1.5">
            <div className="flex-1 h-1.5 bg-white/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-white rounded-full transition-all duration-700"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-xs text-white/70 shrink-0">{pct}%</span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setExpanded(p => !p)}
            className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-all"
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          <button onClick={dismiss} className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Steps */}
      {expanded && (
        <div className="px-5 pb-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {data.steps.map((step, i) => (
              <StepCard key={step.id} step={step} index={i + 1} isNext={step.id === nextStep?.id} />
            ))}
          </div>
          {nextStep && (
            <div className="mt-3 flex items-center gap-2">
              <span className="text-xs text-white/60">Langkah berikutnya:</span>
              {nextStep.href ? (
                <Link href={nextStep.href}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-white hover:text-white/80 transition-colors">
                  {nextStep.title} <ArrowRight className="w-3 h-3" />
                </Link>
              ) : (
                <span className="text-xs font-semibold text-white">{nextStep.title}</span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function StepCard({ step, index, isNext }: { step: Step; index: number; isNext: boolean }) {
  const content = (
    <div className={cn(
      'flex items-start gap-3 px-3.5 py-3 rounded-xl border transition-all',
      step.done
        ? 'bg-white/10 border-white/10'
        : isNext
        ? 'bg-white border-white shadow-sm'
        : 'bg-white/5 border-white/10 hover:bg-white/10'
    )}>
      <div className={cn('w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5',
        step.done ? 'bg-white/20' : isNext ? 'bg-brand-600' : 'bg-white/10')}>
        {step.done
          ? <CheckCircle2 className="w-5 h-5 text-white" />
          : <span className={cn('text-[10px] font-bold', isNext ? 'text-white' : 'text-white/50')}>{index}</span>
        }
      </div>
      <div className="flex-1 min-w-0">
        <p className={cn('text-xs font-semibold leading-snug',
          step.done ? 'text-white/60 line-through' : isNext ? 'text-brand-700' : 'text-white/80')}>
          {step.title}
        </p>
        {!step.done && (
          <p className={cn('text-[10px] mt-0.5 leading-relaxed',
            isNext ? 'text-brand-500' : 'text-white/40')}>
            +{step.points} pts
          </p>
        )}
      </div>
      {step.done && <CheckCircle2 className="w-4 h-4 text-white/40 shrink-0 mt-0.5" />}
    </div>
  )

  if (!step.done && step.href) {
    return <Link href={step.href}>{content}</Link>
  }
  return content
}

function CompletedBanner({ name, onDismiss }: { name: string; onDismiss: () => void }) {
  return (
    <div className="bg-gradient-to-r from-green-600 to-emerald-600 rounded-2xl px-5 py-4 flex items-center gap-4">
      <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
        <Sparkles className="w-5 h-5 text-white" />
      </div>
      <div className="flex-1">
        <p className="text-sm font-bold text-white">🎉 Setup selesai, {name.split(' ')[0]}!</p>
        <p className="text-xs text-white/70 mt-0.5">Portalog sudah siap dipakai sepenuhnya. Selamat bekerja!</p>
      </div>
      <button onClick={onDismiss} className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-all shrink-0">
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}
