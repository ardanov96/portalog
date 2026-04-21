'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Users, Plus, X, Building2, Hash, MapPin, Phone, Mail,
  User, ChevronDown, Loader2, CheckCircle2, Search,
  MoreHorizontal, Pencil, Trash2, Ship,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ─── Types ─────────────────────────────────────────────────────────────────────

interface Client {
  id:          string
  name:        string
  companyName: string | null
  npwp:        string | null
  email:       string | null
  phone:       string | null
  address:     string | null
  city:        string | null
  notes:       string | null
  isActive:    boolean
  createdAt:   string
  _count?:     { shipments: number }
}

interface ClientForm {
  companyName:   string
  npwp:          string
  type:          'IMPORTER' | 'EXPORTER' | 'BOTH' | ''
  address:       string
  city:          string
  contactPerson: string
  phone:         string
  email:         string
}

type FormErrors = Partial<Record<keyof ClientForm, string>>

const EMPTY_FORM: ClientForm = {
  companyName: '', npwp: '', type: '',
  address: '', city: '', contactPerson: '', phone: '', email: '',
}

const CLIENT_TYPES = [
  { value: 'IMPORTER', label: 'Importir'            },
  { value: 'EXPORTER', label: 'Eksportir'           },
  { value: 'BOTH',     label: 'Importir & Eksportir'},
]

function getTypeFromNotes(notes: string | null) {
  if (!notes) return null
  if (notes.includes('BOTH'))     return { label: 'Importir & Eksportir', color: 'bg-purple-100 text-purple-700' }
  if (notes.includes('EXPORTER')) return { label: 'Eksportir',            color: 'bg-blue-100 text-blue-700'   }
  if (notes.includes('IMPORTER')) return { label: 'Importir',             color: 'bg-green-100 text-green-700' }
  return null
}

// ─── Reusable Field & Input ────────────────────────────────────────────────────

function Field({ label, required, error, children }: {
  label: string; required?: boolean; error?: string; children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
        {label}{required && <span className="text-red-500">*</span>}
      </label>
      {children}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}

function Input({ icon: Icon, error, ...props }: React.InputHTMLAttributes<HTMLInputElement> & {
  icon?: React.ElementType; error?: boolean
}) {
  return (
    <div className="relative">
      {Icon && <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />}
      <input {...props} className={cn(
        'w-full text-sm bg-slate-50 border rounded-xl px-3 py-2.5 text-slate-800 placeholder:text-slate-400',
        'focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400 focus:bg-white transition-all',
        Icon && 'pl-9',
        error ? 'border-red-300 bg-red-50' : 'border-slate-200',
      )} />
    </div>
  )
}

// ─── Shared form body ──────────────────────────────────────────────────────────

function ClientFormBody({ form, errors, onChange, onNpwp }: {
  form:     ClientForm
  errors:   FormErrors
  onChange: (field: keyof ClientForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void
  onNpwp:   (e: React.ChangeEvent<HTMLInputElement>) => void
}) {
  return (
    <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
      {/* Data Perusahaan */}
      <div>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Data Perusahaan</p>
        <div className="space-y-3">
          <Field label="Nama Perusahaan" required error={errors.companyName}>
            <Input icon={Building2} placeholder="PT. Contoh Maju Jaya"
              value={form.companyName} onChange={onChange('companyName')} error={!!errors.companyName} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="NPWP" error={errors.npwp}>
              <Input icon={Hash} placeholder="XX.XXX.XXX.X-XXX.XXX"
                value={form.npwp} onChange={onNpwp} error={!!errors.npwp} />
            </Field>
            <Field label="Jenis Klien" required error={errors.type}>
              <div className="relative">
                <select value={form.type} onChange={onChange('type')} className={cn(
                  'w-full text-sm bg-slate-50 border rounded-xl px-3 py-2.5 appearance-none transition-all',
                  'focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400 focus:bg-white',
                  !form.type ? 'text-slate-400' : 'text-slate-800',
                  errors.type ? 'border-red-300 bg-red-50' : 'border-slate-200',
                )}>
                  <option value="" disabled>Pilih jenis...</option>
                  {CLIENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
              </div>
            </Field>
          </div>
          <Field label="Alamat Perusahaan">
            <div className="relative">
              <MapPin className="absolute left-3 top-3 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
              <textarea rows={2} placeholder="Jl. Sudirman No. 1, Jakarta Pusat"
                value={form.address} onChange={onChange('address')}
                className="w-full text-sm bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 pl-9 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400 focus:bg-white transition-all resize-none" />
            </div>
          </Field>
          <Field label="Kota">
            <Input icon={MapPin} placeholder="Jakarta, Surabaya, Medan..."
              value={form.city} onChange={onChange('city')} />
          </Field>
        </div>
      </div>

      <div className="border-t border-slate-100" />

      {/* Contact Person */}
      <div>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Contact Person</p>
        <div className="space-y-3">
          <Field label="Nama Contact Person" required error={errors.contactPerson}>
            <Input icon={User} placeholder="Budi Santoso"
              value={form.contactPerson} onChange={onChange('contactPerson')} error={!!errors.contactPerson} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="No. Telepon / WA" required error={errors.phone}>
              <Input icon={Phone} type="tel" placeholder="08xxxxxxxxxx"
                value={form.phone} onChange={onChange('phone')} error={!!errors.phone} />
            </Field>
            <Field label="Email" error={errors.email}>
              <Input icon={Mail} type="email" placeholder="nama@perusahaan.com"
                value={form.email} onChange={onChange('email')} error={!!errors.email} />
            </Field>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Add Modal ─────────────────────────────────────────────────────────────────

function AddClientModal({ open, onClose, onSuccess }: {
  open: boolean; onClose: () => void; onSuccess: (name: string) => void
}) {
  const [form, setForm]       = useState<ClientForm>(EMPTY_FORM)
  const [errors, setErrors]   = useState<FormErrors>({})
  const [loading, setLoading] = useState(false)
  const [step, setStep]       = useState<'form' | 'success'>('form')

  const set = (field: keyof ClientForm) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      setForm(p => ({ ...p, [field]: e.target.value }))
      setErrors(p => ({ ...p, [field]: '' }))
    }

  const handleNpwp = (e: React.ChangeEvent<HTMLInputElement>) => {
    const d = e.target.value.replace(/\D/g, '').slice(0, 15)
    const fmt = d
      .replace(/^(\d{2})(\d)/, '$1.$2')
      .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/^(\d{2})\.(\d{3})\.(\d{3})(\d)/, '$1.$2.$3.$4')
      .replace(/^(\d{2})\.(\d{3})\.(\d{3})\.(\d)(\d{3})(\d)/, '$1.$2.$3.$4-$5.$6')
    setForm(p => ({ ...p, npwp: fmt }))
    setErrors(p => ({ ...p, npwp: '' }))
  }

  const validate = () => {
    const e: FormErrors = {}
    if (!form.companyName.trim())   e.companyName   = 'Nama perusahaan wajib diisi'
    if (!form.type)                 e.type          = 'Pilih jenis klien'
    if (!form.contactPerson.trim()) e.contactPerson = 'Contact person wajib diisi'
    if (!form.phone.trim())         e.phone         = 'Nomor telepon wajib diisi'
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Format email tidak valid'
    if (form.npwp && form.npwp.replace(/\D/g, '').length !== 15)      e.npwp  = 'NPWP harus 15 digit'
    setErrors(e); return Object.keys(e).length === 0
  }

  const handleSubmit = async () => {
    if (!validate()) return
    setLoading(true)
    try {
      const res = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error()
      setStep('success')
    } catch {
      setErrors({ companyName: 'Gagal menyimpan. Coba lagi.' })
    } finally { setLoading(false) }
  }

  const handleClose = () => {
    if (step === 'success') onSuccess(form.companyName)
    setForm(EMPTY_FORM); setErrors({}); setStep('form'); onClose()
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={handleClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden"
        style={{ boxShadow: '0 24px 64px rgba(0,0,0,0.18)' }}>

        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-brand-50 flex items-center justify-center">
              <Building2 className="w-4 h-4 text-brand-600" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Tambah Klien Baru</h2>
              <p className="text-xs text-slate-400">Importir & eksportir</p>
            </div>
          </div>
          <button onClick={handleClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>

        {step === 'success' ? (
          <div className="flex-1 flex flex-col items-center justify-center p-10 text-center gap-4">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 mb-1">Klien Berhasil Ditambahkan!</h3>
              <p className="text-sm text-slate-500">
                <span className="font-semibold text-slate-700">{form.companyName}</span> telah disimpan.
              </p>
            </div>
            <button onClick={handleClose} className="mt-2 px-6 py-2.5 bg-brand-600 text-white rounded-xl text-sm font-semibold hover:bg-brand-700 transition-colors">
              Selesai
            </button>
          </div>
        ) : (
          <>
            <ClientFormBody form={form} errors={errors} onChange={set} onNpwp={handleNpwp} />
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-3 shrink-0">
              <p className="text-[10px] text-slate-400"><span className="text-red-400">*</span> wajib diisi</p>
              <div className="flex items-center gap-2.5">
                <button onClick={handleClose} className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors">Batal</button>
                <button onClick={handleSubmit} disabled={loading}
                  className="inline-flex items-center gap-2 px-5 py-2 bg-brand-600 text-white rounded-xl text-sm font-semibold hover:bg-brand-700 disabled:opacity-60 transition-all active:scale-[0.98]">
                  {loading ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Menyimpan...</> : <><Plus className="w-3.5 h-3.5" /> Simpan Klien</>}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ─── Edit Modal ────────────────────────────────────────────────────────────────

function EditClientModal({ client, onClose, onSuccess }: {
  client: Client; onClose: () => void; onSuccess: (updated: Client) => void
}) {
  // Parse existing data back into form shape
  const typeValue = (() => {
    const n = client.notes ?? ''
    if (n.includes('BOTH'))     return 'BOTH'
    if (n.includes('EXPORTER')) return 'EXPORTER'
    if (n.includes('IMPORTER')) return 'IMPORTER'
    return ''
  })() as ClientForm['type']

  const [form, setForm]       = useState<ClientForm>({
    companyName:   client.companyName ?? '',
    npwp:          client.npwp        ?? '',
    type:          typeValue,
    address:       client.address     ?? '',
    city:          client.city        ?? '',
    contactPerson: client.name,
    phone:         client.phone       ?? '',
    email:         client.email       ?? '',
  })
  const [errors, setErrors]   = useState<FormErrors>({})
  const [loading, setLoading] = useState(false)

  const set = (field: keyof ClientForm) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      setForm(p => ({ ...p, [field]: e.target.value }))
      setErrors(p => ({ ...p, [field]: '' }))
    }

  const handleNpwp = (e: React.ChangeEvent<HTMLInputElement>) => {
    const d = e.target.value.replace(/\D/g, '').slice(0, 15)
    const fmt = d
      .replace(/^(\d{2})(\d)/, '$1.$2')
      .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/^(\d{2})\.(\d{3})\.(\d{3})(\d)/, '$1.$2.$3.$4')
      .replace(/^(\d{2})\.(\d{3})\.(\d{3})\.(\d)(\d{3})(\d)/, '$1.$2.$3.$4-$5.$6')
    setForm(p => ({ ...p, npwp: fmt }))
    setErrors(p => ({ ...p, npwp: '' }))
  }

  const validate = () => {
    const e: FormErrors = {}
    if (!form.companyName.trim())   e.companyName   = 'Nama perusahaan wajib diisi'
    if (!form.type)                 e.type          = 'Pilih jenis klien'
    if (!form.contactPerson.trim()) e.contactPerson = 'Contact person wajib diisi'
    if (!form.phone.trim())         e.phone         = 'Nomor telepon wajib diisi'
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Format email tidak valid'
    if (form.npwp && form.npwp.replace(/\D/g, '').length !== 15)      e.npwp  = 'NPWP harus 15 digit'
    setErrors(e); return Object.keys(e).length === 0
  }

  const handleSubmit = async () => {
    if (!validate()) return
    setLoading(true)
    try {
      const res = await fetch(`/api/clients/${client.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name:        form.contactPerson,
          companyName: form.companyName,
          npwp:        form.npwp    || '',
          phone:       form.phone,
          email:       form.email   || '',
          address:     form.address || '',
          city:        form.city    || '',
          notes:       form.type    ? `Jenis: ${form.type}` : '',
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Gagal menyimpan')
      onSuccess(data.data)
    } catch (err: any) {
      setErrors({ companyName: err.message || 'Gagal menyimpan. Coba lagi.' })
    } finally { setLoading(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden"
        style={{ boxShadow: '0 24px 64px rgba(0,0,0,0.18)' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center">
              <Pencil className="w-4 h-4 text-amber-600" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Edit Klien</h2>
              <p className="text-xs text-slate-400 truncate max-w-[200px]">{client.companyName || client.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>

        <ClientFormBody form={form} errors={errors} onChange={set} onNpwp={handleNpwp} />

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-3 shrink-0">
          <p className="text-[10px] text-slate-400"><span className="text-red-400">*</span> wajib diisi</p>
          <div className="flex items-center gap-2.5">
            <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors">Batal</button>
            <button onClick={handleSubmit} disabled={loading}
              className="inline-flex items-center gap-2 px-5 py-2 bg-amber-500 text-white rounded-xl text-sm font-semibold hover:bg-amber-600 disabled:opacity-60 transition-all active:scale-[0.98]">
              {loading ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Menyimpan...</> : <><CheckCircle2 className="w-3.5 h-3.5" /> Simpan Perubahan</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Client Row ────────────────────────────────────────────────────────────────

function ClientRow({ client, onDeleted, onEdited }: {
  client:    Client
  onDeleted: (id: string) => void
  onEdited:  (updated: Client) => void
}) {
  const [menuOpen, setMenuOpen]   = useState(false)
  const [deleting, setDeleting]   = useState(false)
  const [showEdit, setShowEdit]   = useState(false)

  const type     = getTypeFromNotes(client.notes)
  const initials = (client.companyName || client.name)
    .split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()

  const handleDelete = async () => {
    if (!confirm(`Nonaktifkan klien "${client.companyName || client.name}"?`)) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/clients/${client.id}`, { method: 'DELETE' })
      if (!res.ok) { const d = await res.json(); alert(d.error || 'Gagal menonaktifkan.'); return }
      onDeleted(client.id)
    } catch { alert('Gagal menonaktifkan klien.') }
    finally { setDeleting(false); setMenuOpen(false) }
  }

  return (
    <>
      <tr className="hover:bg-slate-50 transition-colors group">
        {/* Avatar + company */}
        <td className="px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-brand-100 flex items-center justify-center text-brand-700 text-xs font-bold shrink-0">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-800 truncate">{client.companyName || '—'}</p>
              <p className="text-xs text-slate-400 truncate">{client.name}</p>
            </div>
          </div>
        </td>

        {/* Type */}
        <td className="px-4 py-4">
          {type
            ? <span className={cn('text-[11px] font-semibold px-2.5 py-1 rounded-full', type.color)}>{type.label}</span>
            : <span className="text-xs text-slate-400">—</span>
          }
        </td>

        {/* Contact */}
        <td className="px-4 py-4">
          <div className="space-y-0.5">
            {client.phone && <p className="text-xs text-slate-600 flex items-center gap-1.5"><Phone className="w-3 h-3 text-slate-400" />{client.phone}</p>}
            {client.email && <p className="text-xs text-slate-600 flex items-center gap-1.5"><Mail  className="w-3 h-3 text-slate-400" />{client.email}</p>}
          </div>
        </td>

        {/* City */}
        <td className="px-4 py-4"><p className="text-xs text-slate-600">{client.city || '—'}</p></td>

        {/* Shipments */}
        <td className="px-4 py-4">
          <div className="flex items-center gap-1.5">
            <Ship className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-sm font-semibold text-slate-700">{client._count?.shipments ?? 0}</span>
          </div>
        </td>

        {/* Status */}
        <td className="px-4 py-4">
          <span className={cn('text-[11px] font-semibold px-2.5 py-1 rounded-full',
            client.isActive ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500')}>
            {client.isActive ? 'Aktif' : 'Nonaktif'}
          </span>
        </td>

        {/* Actions */}
        <td className="px-4 py-4">
          <div className="relative">
            <button onClick={() => setMenuOpen(p => !p)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all opacity-0 group-hover:opacity-100">
              <MoreHorizontal className="w-4 h-4" />
            </button>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 top-8 z-20 bg-white rounded-xl border border-slate-200 shadow-lg py-1 min-w-[150px]">
                  <button
                    onClick={() => { setShowEdit(true); setMenuOpen(false) }}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors">
                    <Pencil className="w-3.5 h-3.5 text-slate-400" /> Edit
                  </button>
                  <button onClick={handleDelete} disabled={deleting}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50">
                    {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                    Nonaktifkan
                  </button>
                </div>
              </>
            )}
          </div>
        </td>
      </tr>

      {/* Edit modal per row */}
      {showEdit && (
        <EditClientModal
          client={client}
          onClose={() => setShowEdit(false)}
          onSuccess={(updated) => { onEdited(updated); setShowEdit(false) }}
        />
      )}
    </>
  )
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function ClientsPage() {
  const [clients, setClients]     = useState<Client[]>([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [showModal, setShowModal] = useState(false)
  const [toast, setToast]         = useState<string | null>(null)

  const fetchClients = useCallback(async () => {
    setLoading(true)
    try {
      const res  = await fetch('/api/clients')
      const data = await res.json()
      if (data.success) setClients(data.data)
    } catch {} finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchClients() }, [fetchClients])

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3500)
  }

  const filtered = clients.filter(c => {
    const q = search.toLowerCase()
    return (
      c.companyName?.toLowerCase().includes(q) ||
      c.name.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      c.city?.toLowerCase().includes(q)
    )
  })

  const handleAdded = (name: string) => {
    setShowModal(false); fetchClients(); showToast(`${name} berhasil ditambahkan`)
  }

  const handleDeleted = (id: string) => {
    setClients(p => p.map(c => c.id === id ? { ...c, isActive: false } : c))
    showToast('Klien berhasil dinonaktifkan')
  }

  const handleEdited = (updated: Client) => {
    setClients(p => p.map(c => c.id === updated.id ? { ...c, ...updated } : c))
    showToast(`${updated.companyName || updated.name} berhasil diperbarui`)
  }

  return (
    <div className="max-w-7xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Klien</h1>
          <p className="text-slate-500 text-sm">{loading ? 'Memuat...' : `${clients.length} klien terdaftar`}</p>
        </div>
        <button onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand-600 text-white rounded-xl text-sm font-semibold hover:bg-brand-700 transition-colors active:scale-[0.98]">
          <Plus className="w-4 h-4" /> Tambah Klien
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        <input type="text" placeholder="Cari nama, email, kota..." value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 text-sm bg-white border border-slate-200 rounded-xl text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400 transition-all" />
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="p-16 flex flex-col items-center gap-3 text-slate-400">
            <Loader2 className="w-7 h-7 animate-spin text-brand-500" />
            <p className="text-sm">Memuat data klien...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-16 flex flex-col items-center gap-3 text-center">
            <Users className="w-10 h-10 text-slate-300" />
            <p className="text-slate-500 font-medium">
              {search ? `Tidak ada hasil untuk "${search}"` : 'Belum ada klien'}
            </p>
            {!search && (
              <button onClick={() => setShowModal(true)}
                className="mt-1 inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-brand-600 hover:bg-brand-50 rounded-xl transition-colors">
                <Plus className="w-4 h-4" /> Tambah klien sekarang
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  {['Perusahaan','Jenis','Kontak','Kota','Shipments','Status',''].map((h, i) => (
                    <th key={i} className="px-4 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider first:px-5">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(c => (
                  <ClientRow key={c.id} client={c} onDeleted={handleDeleted} onEdited={handleEdited} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AddClientModal open={showModal} onClose={() => setShowModal(false)} onSuccess={handleAdded} />

      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 bg-slate-900 text-white rounded-xl shadow-xl text-sm font-medium">
          <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
          {toast}
        </div>
      )}
    </div>
  )
}
