'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import {
  Clock, Play, Check, AlertTriangle, Loader2,
  Bell, CreditCard, Trash2, ChevronDown, ChevronUp,
  Calendar, Timer, Activity,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface CronResult {
  job:        string
  startedAt:  string
  finishedAt: string
  durationMs: number
  success:    boolean
  stats:      Record<string, number | string>
  errors?:    string[]
}

interface CronJob {
  id:            string
  name:          string
  description:   string
  schedule:      string
  scheduleLabel: string
  endpoint:      string
  icon:          any
  color:         string
  bg:            string
  lastRun?:      CronResult
  running:       boolean
}

// ─── Cron job definitions ─────────────────────────────────────────────────────

const CRON_JOBS: Omit<CronJob, 'lastRun' | 'running'>[] = [
  {
    id:            'deadline-reminder',
    name:          'Deadline Reminder',
    description:   'Kirim WA + email ke klien dengan deadline bea cukai atau ETA ≤ 3 hari. Jalan otomatis jam 08:00 WIB.',
    schedule:      '0 1 * * *',
    scheduleLabel: 'Setiap hari 08:00 WIB',
    endpoint:      '/api/cron/deadline-reminder',
    icon:          Bell,
    color:         'text-amber-600',
    bg:            'bg-amber-50',
  },
  {
    id:            'subscription-check',
    name:          'Subscription Check',
    description:   'Cek trial dan subscription yang expired, kirim email pengingat perpanjangan. Jalan jam 07:00 WIB.',
    schedule:      '0 0 * * *',
    scheduleLabel: 'Setiap hari 07:00 WIB',
    endpoint:      '/api/cron/subscription-check',
    icon:          CreditCard,
    color:         'text-brand-600',
    bg:            'bg-brand-50',
  },
  {
    id:            'cleanup',
    name:          'Weekly Cleanup',
    description:   'Hapus invite expired, activity log > 90 hari, dan notifikasi dibaca > 30 hari. Jalan Minggu jam 09:00 WIB.',
    schedule:      '0 2 * * 0',
    scheduleLabel: 'Setiap Minggu 09:00 WIB',
    endpoint:      '/api/cron/cleanup',
    icon:          Trash2,
    color:         'text-slate-600',
    bg:            'bg-slate-100',
  },
]

// ─── Result detail ────────────────────────────────────────────────────────────

function RunResult({ result }: { result: CronResult }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className={cn(
      'rounded-xl border p-3.5 mt-3',
      result.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
    )}>
      <button
        onClick={() => setExpanded(p => !p)}
        className="w-full flex items-center gap-2 text-left"
      >
        {result.success
          ? <Check className="w-4 h-4 text-green-600 shrink-0" />
          : <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
        }
        <span className={cn('text-xs font-semibold', result.success ? 'text-green-700' : 'text-red-700')}>
          {result.success ? 'Berhasil' : 'Ada error'}
        </span>
        <span className="text-xs text-slate-400 ml-auto flex items-center gap-1">
          <Timer className="w-3 h-3" />{result.durationMs}ms
        </span>
        {expanded
          ? <ChevronUp   className="w-3.5 h-3.5 text-slate-400" />
          : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
        }
      </button>

      {expanded && (
        <div className="mt-3 space-y-2 pt-3 border-t border-current/10">
          <div className="grid grid-cols-2 gap-1.5">
            {Object.entries(result.stats).map(([key, val]) => (
              <div key={key} className="bg-white/60 rounded-lg px-2.5 py-1.5">
                <p className="text-[10px] text-slate-500 uppercase tracking-wide">
                  {key.replace(/([A-Z])/g, ' $1').trim()}
                </p>
                <p className="text-sm font-bold text-slate-800">{val}</p>
              </div>
            ))}
          </div>
          {result.errors && result.errors.length > 0 && (
            <div className="bg-red-100 rounded-lg p-2.5">
              <p className="text-[10px] font-bold text-red-700 uppercase tracking-wide mb-1">Errors</p>
              {result.errors.map((e, i) => (
                <p key={i} className="text-xs text-red-600">• {e}</p>
              ))}
            </div>
          )}
          <p className="text-[10px] text-slate-400">
            Mulai: {new Date(result.startedAt).toLocaleString('id-ID')} ·
            Selesai: {new Date(result.finishedAt).toLocaleString('id-ID')}
          </p>
        </div>
      )}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function CronPage() {
  const [jobs, setJobs] = useState<CronJob[]>(
    CRON_JOBS.map(j => ({ ...j, running: false, lastRun: undefined }))
  )

  // ── Panggil proxy /api/cron/run — CRON_SECRET tidak pernah ke browser ──────
  const runJob = async (jobId: string, endpoint: string) => {
    setJobs(prev => prev.map(j =>
      j.id === jobId ? { ...j, running: true, lastRun: undefined } : j
    ))

    try {
      const res  = await fetch('/api/cron/run', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ endpoint }),
      })
      const data: CronResult = await res.json()
      setJobs(prev => prev.map(j =>
        j.id === jobId ? { ...j, running: false, lastRun: data } : j
      ))
    } catch (e: any) {
      setJobs(prev => prev.map(j =>
        j.id === jobId ? {
          ...j,
          running: false,
          lastRun: {
            job:        jobId,
            startedAt:  new Date().toISOString(),
            finishedAt: new Date().toISOString(),
            durationMs: 0,
            success:    false,
            stats:      {},
            errors:     [e.message ?? 'Gagal menghubungi server'],
          },
        } : j
      ))
    }
  }

  const runAll = async () => {
    for (const job of jobs) {
      await runJob(job.id, job.endpoint)
    }
  }

  return (
    <div className="max-w-3xl space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Cron Jobs</h1>
          <p className="text-slate-500 text-sm">Monitor dan jalankan scheduled tasks secara manual</p>
        </div>
        <button
          onClick={runAll}
          disabled={jobs.some(j => j.running)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50 transition-all"
        >
          {jobs.some(j => j.running)
            ? <Loader2 className="w-4 h-4 animate-spin" />
            : <Play    className="w-4 h-4" />
          }
          Jalankan Semua
        </button>
      </div>

      {/* Schedule overview */}
      <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5" /> Jadwal Harian (WIB)
        </p>
        <div className="flex items-center gap-0">
          {[
            { time: '07:00', label: 'Sub Check', color: 'bg-brand-500' },
            { time: '08:00', label: 'Reminder',  color: 'bg-amber-500' },
            { time: '09:00*', label: 'Cleanup',  color: 'bg-slate-500', note: '*Minggu' },
          ].map((item, i) => (
            <div key={i} className="flex-1 text-center">
              <div className={cn('h-2 rounded-full mx-1', item.color)} />
              <p className="text-[10px] font-bold text-slate-700 mt-1">{item.time}</p>
              <p className="text-[9px] text-slate-400">{item.label}</p>
              {item.note && <p className="text-[8px] text-slate-300">{item.note}</p>}
            </div>
          ))}
        </div>
      </div>

      {/* Job cards */}
      <div className="space-y-4">
        {jobs.map(job => {
          const Icon = job.icon
          return (
            <div key={job.id} className="bg-white rounded-2xl border border-slate-200 p-5">
              <div className="flex items-start gap-4">
                <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0', job.bg)}>
                  <Icon className={cn('w-5 h-5', job.color)} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h3 className="text-sm font-bold text-slate-900">{job.name}</h3>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 font-mono">
                      {job.schedule}
                    </span>
                    {job.running && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 flex items-center gap-1">
                        <Loader2 className="w-2.5 h-2.5 animate-spin" /> Running...
                      </span>
                    )}
                    {job.lastRun && !job.running && (
                      <span className={cn(
                        'text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1',
                        job.lastRun.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'
                      )}>
                        {job.lastRun.success
                          ? <Check         className="w-2.5 h-2.5" />
                          : <AlertTriangle className="w-2.5 h-2.5" />
                        }
                        {job.lastRun.success ? 'OK' : 'Error'}
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-500 leading-relaxed mb-1">{job.description}</p>

                  <div className="flex items-center gap-3 text-[10px] text-slate-400">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />{job.scheduleLabel}
                    </span>
                    <span className="font-mono">{job.endpoint}</span>
                  </div>

                  {job.lastRun && <RunResult result={job.lastRun} />}
                </div>

                <button
                  onClick={() => runJob(job.id, job.endpoint)}
                  disabled={job.running}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 hover:border-slate-300 disabled:opacity-50 transition-all shrink-0"
                >
                  {job.running
                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    : <Play    className="w-3.5 h-3.5" />
                  }
                  Run
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Setup guide */}
      <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5">
        <p className="text-xs font-bold text-blue-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
          <Activity className="w-3.5 h-3.5" /> Setup di Vercel
        </p>
        <ol className="space-y-2 text-xs text-blue-700 leading-relaxed">
          <li><strong>1.</strong> Pastikan file <code className="bg-blue-100 px-1.5 py-0.5 rounded font-mono text-[11px]">vercel.json</code> sudah ada di root project</li>
          <li><strong>2.</strong> Di Vercel Dashboard → Settings → Environment Variables → tambahkan <code className="bg-blue-100 px-1.5 py-0.5 rounded font-mono text-[11px]">CRON_SECRET</code></li>
          <li><strong>3.</strong> Deploy ulang project → Vercel otomatis membaca jadwal dari <code className="bg-blue-100 px-1.5 py-0.5 rounded font-mono text-[11px]">vercel.json</code></li>
          <li><strong>4.</strong> Cek di Vercel Dashboard → tab <strong>Cron Jobs</strong> untuk melihat log eksekusi</li>
        </ol>
        <div className="mt-3 bg-blue-100 rounded-lg px-3 py-2">
          <p className="text-[10px] font-mono text-blue-600">
            # Generate CRON_SECRET:<br />
            openssl rand -hex 32
          </p>
        </div>
      </div>
    </div>
  )
}
