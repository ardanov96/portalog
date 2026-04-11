'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { cn, getInitials, formatDate } from '@/lib/utils'
import {
  Building2, User, Shield, Save, Loader2,
  AlertCircle, Check, Eye, EyeOff, Crown, UserCheck,
  UserPlus, Mail, Clock, X, Send, Copy, ExternalLink,
  Trash2, RefreshCw,
} from 'lucide-react'

// ─── Schemas ──────────────────────────────────────────────────────────────────
const orgSchema = z.object({
  name:    z.string().min(2, 'Nama minimal 2 karakter'),
  npwp:    z.string().optional(),
  phone:   z.string().optional(),
  email:   z.string().email().optional().or(z.literal('')),
  address: z.string().optional(),
  city:    z.string().optional(),
})
const profileSchema = z.object({
  name:            z.string().min(2),
  phone:           z.string().optional(),
  currentPassword: z.string().optional(),
  newPassword:     z.string().min(8).optional().or(z.literal('')),
})

const inviteSchema = z.object({
  email: z.string().email('Email tidak valid'),
  name:  z.string().optional(),
  role:  z.enum(['STAFF', 'OWNER']),
})

type OrgForm     = z.infer<typeof orgSchema>
type ProfileForm = z.infer<typeof profileSchema>
type InviteForm  = z.infer<typeof inviteSchema>

// ─── Helpers ──────────────────────────────────────────────────────────────────
const inp = (err?: string) => cn(
  'w-full px-3.5 py-2.5 text-sm border rounded-xl focus:outline-none focus:ring-2 transition-all',
  err ? 'border-red-300 focus:ring-red-500/20' : 'border-slate-200 focus:ring-brand-500/20 focus:border-brand-400'
)

function Field({ label, err, hint, children }: { label: string; err?: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">{label}</label>
      {children}
      {hint && !err && <p className="text-[11px] text-slate-400 mt-1">{hint}</p>}
      {err && <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{err}</p>}
    </div>
  )
}

function Result({ ok, msg }: { ok: boolean; msg: string }) {
  return (
    <div className={cn('flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border',
      ok ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700')}>
      {ok ? <Check className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
      {msg}
    </div>
  )
}

// ─── Invite Modal ─────────────────────────────────────────────────────────────
interface InviteResult {
  email: string; name: string | null; role: string
  expiresAt: string; emailSent: boolean; inviteUrl: string
}

function InviteModal({ orgName, onClose, onSuccess }: {
  orgName: string; onClose: () => void; onSuccess: () => void
}) {
  const [sending, setSending] = useState(false)
  const [result, setResult]   = useState<InviteResult | null>(null)
  const [error, setError]     = useState('')
  const [copied, setCopied]   = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm<InviteForm>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { role: 'STAFF' },
  })

  const onSubmit = async (values: InviteForm) => {
    setSending(true); setError('')
    try {
      const res  = await fetch('/api/invite', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(values),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)
      setResult(data.data)
      onSuccess()
    } catch (e: any) { setError(e.message || 'Gagal mengirim undangan') }
    finally { setSending(false) }
  }

  const copyLink = async () => {
    if (!result?.inviteUrl) return
    await navigator.clipboard.writeText(result.inviteUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.45)' }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-brand-50 flex items-center justify-center">
              <UserPlus className="w-4 h-4 text-brand-600" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Undang Staff Baru</h2>
              <p className="text-xs text-slate-400">{orgName}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>

        {!result ? (
          <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
            <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
              <p className="text-xs text-blue-700 leading-relaxed">
                Staff yang diundang akan menerima email dengan link untuk membuat akun. Link berlaku <strong>48 jam</strong>.
              </p>
            </div>

            <Field label="Email *" err={errors.email?.message}>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <input {...register('email')} type="email" placeholder="staff@email.com"
                  className={cn(inp(errors.email?.message), 'pl-9')} />
              </div>
            </Field>

            <Field label="Nama (opsional)" err={errors.name?.message} hint="Akan ditampilkan di email undangan">
              <input {...register('name')} placeholder="Nama lengkap staff" className={inp(errors.name?.message)} />
            </Field>

            <Field label="Peran">
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: 'STAFF', label: 'Staff', desc: 'Akses terbatas' },
                  { value: 'OWNER', label: 'Owner', desc: 'Akses penuh' },
                ].map(opt => (
                  <label key={opt.value}
                    className="flex items-center gap-2.5 p-3 rounded-xl border-2 cursor-pointer transition-all has-[:checked]:border-brand-400 has-[:checked]:bg-brand-50 border-slate-200 hover:border-slate-300">
                    <input type="radio" {...register('role')} value={opt.value} className="w-4 h-4 accent-brand-600" />
                    <div>
                      <p className="text-xs font-bold text-slate-800">{opt.label}</p>
                      <p className="text-[10px] text-slate-400">{opt.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </Field>

            {error && <Result ok={false} msg={error} />}

            <div className="flex gap-3 pt-1">
              <button type="button" onClick={onClose}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-all">
                Batal
              </button>
              <button type="submit" disabled={sending}
                className="flex-1 py-2.5 rounded-xl bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 disabled:opacity-60 flex items-center justify-center gap-2 transition-all">
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Kirim Undangan
              </button>
            </div>
          </form>
        ) : (
          <div className="p-6 space-y-4">
            <div className="text-center">
              <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
                <Check className="w-7 h-7 text-green-600" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">Undangan Terkirim!</h3>
              <p className="text-xs text-slate-500 mt-1">
                {result.emailSent
                  ? `Email undangan dikirim ke ${result.email}`
                  : `Undangan dibuat untuk ${result.email} — email gagal terkirim, bagikan link manual`}
              </p>
            </div>

            <div className="bg-slate-50 rounded-xl p-4 space-y-2 border border-slate-200">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-slate-600">Link Undangan</p>
                <div className="flex items-center gap-1">
                  <button onClick={copyLink} className="p-1.5 rounded-lg text-slate-400 hover:text-brand-600 hover:bg-brand-50 transition-all">
                    {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                  <a href={result.inviteUrl} target="_blank" rel="noopener noreferrer"
                    className="p-1.5 rounded-lg text-slate-400 hover:text-brand-600 hover:bg-brand-50 transition-all">
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
              <p className="text-[10px] text-slate-500 font-mono break-all bg-white border border-slate-200 rounded-lg px-3 py-2">
                {result.inviteUrl}
              </p>
              <p className="text-[10px] text-amber-600 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Berlaku hingga {new Date(result.expiresAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>

            <button onClick={onClose}
              className="w-full py-2.5 rounded-xl bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 transition-all">
              Selesai
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Main Settings Page ───────────────────────────────────────────────────────
export default function SettingsPage() {
  const [tab, setTab]         = useState<'org' | 'profile' | 'team'>('org')
  const [loading, setLoading] = useState(true)
  const [org, setOrg]         = useState<any>(null)
  const [staff, setStaff]     = useState<any[]>([])
  const [me, setMe]           = useState<any>(null)
  const [orgRes, setOrgRes]   = useState<{ ok: boolean; msg: string } | null>(null)
  const [profRes, setProfRes] = useState<{ ok: boolean; msg: string } | null>(null)
  const [showPwd, setShowPwd] = useState(false)
  const [savOrg, setSavOrg]   = useState(false)
  const [savProf, setSavProf] = useState(false)
  const [showInvite, setShowInvite]     = useState(false)
  const [pendingInvites, setPendingInvites] = useState<any[]>([])
  const [removingId, setRemovingId]     = useState<string | null>(null)

  const orgF  = useForm<OrgForm>({ resolver: zodResolver(orgSchema) })
  const profF = useForm<ProfileForm>({ resolver: zodResolver(profileSchema) })

  const fetchSettings = async () => {
    const res  = await fetch('/api/settings')
    const data = await res.json()
    if (!data.success) return
    setOrg(data.data.org)
    setStaff(data.data.staff)
    setMe(data.data.currentUser)
    orgF.reset({
      name: data.data.org?.name ?? '', npwp: data.data.org?.npwp ?? '',
      phone: data.data.org?.phone ?? '', email: data.data.org?.email ?? '',
      address: data.data.org?.address ?? '', city: data.data.org?.city ?? '',
    })
    profF.reset({ name: data.data.currentUser?.name ?? '' })
  }

  const fetchInvites = async () => {
    const res  = await fetch('/api/invite')
    const data = await res.json()
    if (data.success) setPendingInvites(data.data)
  }

  useEffect(() => {
    Promise.all([fetchSettings(), fetchInvites()]).finally(() => setLoading(false))
  }, [])

  const saveOrg = async (v: OrgForm) => {
    setSavOrg(true); setOrgRes(null)
    try {
      const res = await fetch('/api/settings', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'org', ...v }) })
      const d   = await res.json()
      if (!d.success) throw new Error(d.error)
      setOrg(d.data); setOrgRes({ ok: true, msg: 'Profil organisasi berhasil disimpan' })
    } catch (e: any) { setOrgRes({ ok: false, msg: e.message }) }
    finally { setSavOrg(false) }
  }

  const saveProfile = async (v: ProfileForm) => {
    setSavProf(true); setProfRes(null)
    try {
      const payload: any = { type: 'profile', name: v.name, phone: v.phone }
      if (v.newPassword) { payload.currentPassword = v.currentPassword; payload.newPassword = v.newPassword }
      const res = await fetch('/api/settings', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const d   = await res.json()
      if (!d.success) throw new Error(d.error)
      setProfRes({ ok: true, msg: 'Profil berhasil diperbarui' })
      profF.setValue('currentPassword', '')
      profF.setValue('newPassword', '')
    } catch (e: any) { setProfRes({ ok: false, msg: e.message }) }
    finally { setSavProf(false) }
  }

  const cancelInvite = async (inviteId: string) => {
    if (!confirm('Batalkan undangan ini?')) return
    setRemovingId(inviteId)
    await fetch('/api/invite', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ inviteId }) })
    setPendingInvites(prev => prev.filter(i => i.id !== inviteId))
    setRemovingId(null)
  }

  const isOwner = me?.role === 'OWNER'

  if (loading) return (
    <div className="max-w-2xl animate-pulse space-y-4">
      <div className="h-8 bg-slate-100 rounded w-40" />
      <div className="h-64 bg-slate-100 rounded-2xl" />
    </div>
  )

  return (
    <div className="max-w-2xl space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Pengaturan</h1>
        <p className="text-slate-500 text-sm">Kelola akun dan organisasi Anda</p>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        {([
          { key: 'org',     label: 'Organisasi', Icon: Building2 },
          { key: 'profile', label: 'Profil Saya', Icon: User },
          { key: 'team',    label: 'Tim',         Icon: Shield },
        ] as const).map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={cn('inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
              tab === t.key ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700')}>
            <t.Icon className="w-4 h-4" />{t.label}
          </button>
        ))}
      </div>

      {/* ── Org tab ── */}
      {tab === 'org' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-brand-50 flex items-center justify-center text-brand-700 text-lg font-bold">
              {org?.name ? getInitials(org.name) : 'O'}
            </div>
            <div>
              <p className="font-bold text-slate-900">{org?.name}</p>
              <p className="text-xs text-slate-400 font-mono">/{org?.slug}</p>
            </div>
          </div>
          {!isOwner && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" /> Hanya Owner yang dapat mengedit profil organisasi
            </div>
          )}
          <form onSubmit={orgF.handleSubmit(saveOrg)} className="space-y-4">
            <Field label="Nama Organisasi *" err={orgF.formState.errors.name?.message}>
              <input {...orgF.register('name')} disabled={!isOwner} className={cn(inp(orgF.formState.errors.name?.message), !isOwner && 'opacity-60 cursor-not-allowed')} />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="NPWP">
                <input {...orgF.register('npwp')} disabled={!isOwner} placeholder="01.234.567.8-901.000" className={cn(inp(), !isOwner && 'opacity-60 cursor-not-allowed')} />
              </Field>
              <Field label="Telepon">
                <input {...orgF.register('phone')} disabled={!isOwner} placeholder="+62-21-..." className={cn(inp(), !isOwner && 'opacity-60 cursor-not-allowed')} />
              </Field>
            </div>
            <Field label="Email Operasional" err={orgF.formState.errors.email?.message}>
              <input {...orgF.register('email')} type="email" disabled={!isOwner} placeholder="ops@perusahaan.com" className={cn(inp(orgF.formState.errors.email?.message), !isOwner && 'opacity-60 cursor-not-allowed')} />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Kota">
                <input {...orgF.register('city')} disabled={!isOwner} placeholder="Jakarta" className={cn(inp(), !isOwner && 'opacity-60 cursor-not-allowed')} />
              </Field>
              <Field label="Alamat">
                <input {...orgF.register('address')} disabled={!isOwner} placeholder="Jl. ..." className={cn(inp(), !isOwner && 'opacity-60 cursor-not-allowed')} />
              </Field>
            </div>
            {orgRes && <Result ok={orgRes.ok} msg={orgRes.msg} />}
            {isOwner && (
              <button type="submit" disabled={savOrg}
                className="w-full py-2.5 rounded-xl bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 disabled:opacity-60 flex items-center justify-center gap-2 transition-all">
                {savOrg ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Simpan Perubahan
              </button>
            )}
          </form>
        </div>
      )}

      {/* ── Profile tab ── */}
      {tab === 'profile' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 text-lg font-bold">
              {me ? getInitials(me.name) : '?'}
            </div>
            <div>
              <p className="font-bold text-slate-900">{me?.name}</p>
              <p className="text-xs text-slate-500">{me?.email}</p>
              <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full mt-0.5 inline-block',
                me?.role === 'OWNER' ? 'bg-amber-50 text-amber-700' : 'bg-blue-50 text-blue-700')}>
                {me?.role}
              </span>
            </div>
          </div>
          <form onSubmit={profF.handleSubmit(saveProfile)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Nama Lengkap *" err={profF.formState.errors.name?.message}>
                <input {...profF.register('name')} className={inp(profF.formState.errors.name?.message)} />
              </Field>
              <Field label="Telepon">
                <input {...profF.register('phone')} placeholder="+628..." className={inp()} />
              </Field>
            </div>
            <div className="border-t border-slate-100 pt-4">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Ganti Password</p>
              <div className="space-y-3">
                <Field label="Password Lama" hint="Wajib diisi jika ingin ganti password">
                  <div className="relative">
                    <input {...profF.register('currentPassword')} type={showPwd ? 'text' : 'password'} placeholder="Password lama..." className={cn(inp(), 'pr-10')} />
                    <button type="button" onClick={() => setShowPwd(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                      {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </Field>
                <Field label="Password Baru" err={profF.formState.errors.newPassword?.message} hint="Minimal 8 karakter">
                  <input {...profF.register('newPassword')} type={showPwd ? 'text' : 'password'} placeholder="Password baru..." className={inp(profF.formState.errors.newPassword?.message)} />
                </Field>
              </div>
            </div>
            {profRes && <Result ok={profRes.ok} msg={profRes.msg} />}
            <button type="submit" disabled={savProf}
              className="w-full py-2.5 rounded-xl bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 disabled:opacity-60 flex items-center justify-center gap-2 transition-all">
              {savProf ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Simpan Perubahan
            </button>
          </form>
        </div>
      )}

      {/* ── Team tab ── */}
      {tab === 'team' && (
        <div className="space-y-4">
          {/* Active staff */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-800">Anggota Tim ({staff.length})</h3>
              {isOwner && (
                <button onClick={() => setShowInvite(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 text-white rounded-lg text-xs font-semibold hover:bg-brand-700 transition-all">
                  <UserPlus className="w-3.5 h-3.5" /> Undang Staff
                </button>
              )}
            </div>
            <div className="divide-y divide-slate-50">
              {staff.map(s => (
                <div key={s.id} className="flex items-center gap-4 px-5 py-4">
                  <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 text-xs font-bold shrink-0">
                    {getInitials(s.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-slate-800">{s.name}</p>
                      {s.id === me?.id && <span className="text-[10px] bg-brand-50 text-brand-600 px-1.5 py-0.5 rounded font-bold">Saya</span>}
                    </div>
                    <p className="text-xs text-slate-400">{s.email}</p>
                  </div>
                  <span className={cn('text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1 shrink-0',
                    s.role === 'OWNER' ? 'bg-amber-50 text-amber-700' : 'bg-blue-50 text-blue-700')}>
                    {s.role === 'OWNER' ? <Crown className="w-3 h-3" /> : <UserCheck className="w-3 h-3" />}{s.role}
                  </span>
                  <div className="text-right shrink-0">
                    <p className="text-[10px] text-slate-400">Login terakhir</p>
                    <p className="text-[10px] text-slate-500 font-medium">{s.lastLoginAt ? formatDate(s.lastLoginAt) : 'Belum pernah'}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Pending invites */}
          {pendingInvites.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-500" />
                  Undangan Pending ({pendingInvites.length})
                </h3>
                <button onClick={fetchInvites} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all">
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="divide-y divide-slate-50">
                {pendingInvites.map(inv => (
                  <div key={inv.id} className="flex items-center gap-4 px-5 py-3.5">
                    <div className="w-8 h-8 rounded-full bg-amber-50 flex items-center justify-center shrink-0">
                      <Mail className="w-4 h-4 text-amber-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">{inv.email}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded-full',
                          inv.role === 'OWNER' ? 'bg-amber-50 text-amber-700' : 'bg-blue-50 text-blue-700')}>
                          {inv.role}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          Exp: {new Date(inv.expiresAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                    {isOwner && (
                      <button onClick={() => cancelInvite(inv.id)} disabled={removingId === inv.id}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all disabled:opacity-50"
                        title="Batalkan undangan">
                        {removingId === inv.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Invite Modal */}
      {showInvite && (
        <InviteModal
          orgName={org?.name ?? ''}
          onClose={() => setShowInvite(false)}
          onSuccess={() => { fetchInvites(); fetchSettings() }}
        />
      )}
    </div>
  )
}