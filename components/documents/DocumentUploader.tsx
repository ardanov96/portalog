'use client'

import { useState, useCallback, useRef } from 'react'
import { useDropzone } from 'react-dropzone'
import { cn, formatDate } from '@/lib/utils'
import { ALLOWED_MIME_TYPES, MAX_FILE_SIZE, formatFileSize, getFileIcon } from '@/lib/storage'
import {
  Upload, X, FileText, File, FileSpreadsheet, Image,
  Check, AlertCircle, Loader2, ChevronDown, Eye, EyeOff,
  ExternalLink, Trash2, RefreshCw,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

export const DOC_TYPE_OPTIONS = [
  { value: 'BILL_OF_LADING',        label: 'Bill of Lading (B/L)' },
  { value: 'AIRWAY_BILL',           label: 'Airway Bill (AWB)' },
  { value: 'COMMERCIAL_INVOICE',    label: 'Commercial Invoice' },
  { value: 'PACKING_LIST',          label: 'Packing List' },
  { value: 'CERTIFICATE_OF_ORIGIN', label: 'Certificate of Origin (COO)' },
  { value: 'PIB',                   label: 'PIB – Pemberitahuan Impor' },
  { value: 'PEB',                   label: 'PEB – Pemberitahuan Ekspor' },
  { value: 'CUSTOMS_RELEASE',       label: 'Surat Pengeluaran Barang (SPPB)' },
  { value: 'INSURANCE_POLICY',      label: 'Insurance Policy' },
  { value: 'OTHER',                 label: 'Dokumen Lain' },
] as const

export const DOC_STATUS_CFG = {
  PENDING:      { label: 'Menunggu',  color: 'text-slate-500',  bg: 'bg-slate-50',   dot: 'bg-slate-400'  },
  UPLOADED:     { label: 'Terupload', color: 'text-blue-600',   bg: 'bg-blue-50',    dot: 'bg-blue-500'   },
  UNDER_REVIEW: { label: 'Review',    color: 'text-amber-600',  bg: 'bg-amber-50',   dot: 'bg-amber-500'  },
  APPROVED:     { label: 'Disetujui', color: 'text-green-600',  bg: 'bg-green-50',   dot: 'bg-green-500'  },
  REJECTED:     { label: 'Ditolak',   color: 'text-red-600',    bg: 'bg-red-50',     dot: 'bg-red-500'    },
} as const

const DOC_TYPE_LABEL: Record<string, string> = Object.fromEntries(DOC_TYPE_OPTIONS.map(o => [o.value, o.label]))

// ─── File icon helper ─────────────────────────────────────────────────────────

function FileIcon({ mimeType, className }: { mimeType: string; className?: string }) {
  const type = getFileIcon(mimeType)
  const cls  = cn('w-5 h-5 shrink-0', className)
  if (type === 'pdf')   return <FileText className={cn(cls, 'text-red-500')} />
  if (type === 'image') return <Image    className={cn(cls, 'text-blue-500')} />
  if (type === 'excel') return <FileSpreadsheet className={cn(cls, 'text-green-600')} />
  if (type === 'word')  return <FileText className={cn(cls, 'text-blue-700')} />
  return <File className={cn(cls, 'text-slate-400')} />
}

// ─── Upload queue item ────────────────────────────────────────────────────────

interface QueueItem {
  id:          string
  file:        File
  docType:     string
  name:        string
  notes:       string
  visible:     boolean
  state:       'pending' | 'uploading' | 'done' | 'error'
  progress:    number
  error?:      string
  resultDoc?:  any
}

function QueueCard({
  item, onRemove, onUpdate,
}: {
  item: QueueItem
  onRemove: (id: string) => void
  onUpdate: (id: string, patch: Partial<QueueItem>) => void
}) {
  return (
    <div className={cn(
      'border rounded-xl p-4 transition-all',
      item.state === 'done'     ? 'border-green-200 bg-green-50/40' :
      item.state === 'error'    ? 'border-red-200   bg-red-50/40'   :
      item.state === 'uploading'? 'border-brand-200 bg-brand-50/40' :
      'border-slate-200 bg-white'
    )}>
      <div className="flex items-start gap-3">
        {/* File icon */}
        <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
          <FileIcon mimeType={item.file.type} />
        </div>

        <div className="flex-1 min-w-0">
          {/* File name + size */}
          <p className="text-xs font-semibold text-slate-700 truncate">{item.file.name}</p>
          <p className="text-[10px] text-slate-400">{formatFileSize(item.file.size)}</p>

          {/* Fields — only show when pending */}
          {item.state === 'pending' && (
            <div className="mt-2.5 space-y-2">
              {/* Doc type */}
              <div className="relative">
                <select
                  value={item.docType}
                  onChange={e => onUpdate(item.id, { docType: e.target.value })}
                  className="w-full pl-3 pr-8 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-400 appearance-none bg-white"
                >
                  {DOC_TYPE_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
              </div>

              {/* Custom name */}
              <input
                type="text"
                value={item.name}
                onChange={e => onUpdate(item.id, { name: e.target.value })}
                placeholder="Nama dokumen (opsional)"
                className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-400"
              />

              {/* Notes */}
              <input
                type="text"
                value={item.notes}
                onChange={e => onUpdate(item.id, { notes: e.target.value })}
                placeholder="Catatan (opsional)"
                className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-400"
              />

              {/* Visible to client */}
              <label className="flex items-center gap-2 cursor-pointer">
                <div
                  onClick={() => onUpdate(item.id, { visible: !item.visible })}
                  className={cn('w-8 h-4 rounded-full transition-colors relative shrink-0',
                    item.visible ? 'bg-brand-600' : 'bg-slate-300')}
                >
                  <div className={cn('absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-transform',
                    item.visible ? 'left-4.5 translate-x-0.5' : 'left-0.5')} />
                </div>
                <span className="text-[11px] text-slate-500">
                  {item.visible ? <><Eye className="w-3 h-3 inline mr-1 text-brand-500" />Klien dapat melihat</> : <><EyeOff className="w-3 h-3 inline mr-1" />Hanya internal</>}
                </span>
              </label>
            </div>
          )}

          {/* Progress bar */}
          {item.state === 'uploading' && (
            <div className="mt-2">
              <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                <div className="h-full bg-brand-500 rounded-full transition-all duration-300" style={{ width: `${item.progress}%` }} />
              </div>
              <p className="text-[10px] text-brand-600 mt-1">Mengupload... {item.progress}%</p>
            </div>
          )}

          {/* Done */}
          {item.state === 'done' && (
            <div className="flex items-center gap-1.5 mt-1.5">
              <Check className="w-3.5 h-3.5 text-green-600" />
              <span className="text-xs text-green-700 font-semibold">Berhasil diupload</span>
              {item.resultDoc?.fileUrl && (
                <a href={item.resultDoc.fileUrl} target="_blank" rel="noopener noreferrer"
                  className="ml-1 text-[10px] text-brand-600 hover:underline flex items-center gap-0.5">
                  Buka <ExternalLink className="w-2.5 h-2.5" />
                </a>
              )}
            </div>
          )}

          {/* Error */}
          {item.state === 'error' && (
            <div className="flex items-center gap-1.5 mt-1.5">
              <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
              <span className="text-xs text-red-600">{item.error}</span>
            </div>
          )}
        </div>

        {/* Remove button */}
        {item.state !== 'uploading' && (
          <button onClick={() => onRemove(item.id)}
            className="p-1 rounded-lg text-slate-300 hover:text-slate-500 hover:bg-slate-100 transition-colors shrink-0">
            <X className="w-4 h-4" />
          </button>
        )}
        {item.state === 'uploading' && <Loader2 className="w-4 h-4 text-brand-500 animate-spin shrink-0 mt-1" />}
      </div>
    </div>
  )
}

// ─── Document list item ───────────────────────────────────────────────────────

function DocumentItem({
  doc, onStatusChange, onDelete,
}: {
  doc: any
  onStatusChange: (id: string, status: string) => void
  onDelete: (id: string) => void
}) {
  const [updating, setUpdating]   = useState(false)
  const [deleting, setDeleting]   = useState(false)
  const [showActions, setShowActions] = useState(false)
  const statusCfg = DOC_STATUS_CFG[doc.status as keyof typeof DOC_STATUS_CFG] ?? DOC_STATUS_CFG.PENDING

  const updateStatus = async (newStatus: string) => {
    setUpdating(true)
    try {
      const res  = await fetch(`/api/documents/${doc.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      const data = await res.json()
      if (data.success) onStatusChange(doc.id, newStatus)
    } finally { setUpdating(false); setShowActions(false) }
  }

  const deleteDoc = async () => {
    if (!confirm(`Hapus dokumen "${doc.name}"?`)) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/documents/${doc.id}`, { method: 'DELETE' })
      if (res.ok) onDelete(doc.id)
    } finally { setDeleting(false) }
  }

  return (
    <div className="flex items-center gap-3 px-4 py-3.5 hover:bg-slate-50/60 transition-colors group">
      <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center shrink-0', statusCfg.bg)}>
        {doc.mimeType
          ? <FileIcon mimeType={doc.mimeType} />
          : <FileText className="w-4 h-4 text-slate-400" />
        }
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-semibold text-slate-800 truncate">{doc.name}</p>
          {doc.isRequired && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-50 text-red-600 border border-red-100 shrink-0">Wajib</span>
          )}
          {doc.isVisibleToClient && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 border border-blue-100 shrink-0 flex items-center gap-0.5">
              <Eye className="w-2.5 h-2.5" /> Klien
            </span>
          )}
          {doc.version > 1 && (
            <span className="text-[10px] text-slate-400">v{doc.version}</span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <p className="text-xs text-slate-400">
            {DOC_TYPE_LABEL[doc.type] || doc.type}
            {doc.fileSize ? ` · ${formatFileSize(doc.fileSize)}` : ''}
            {` · ${formatDate(doc.createdAt)}`}
          </p>
        </div>
        {doc.notes && <p className="text-[11px] text-slate-400 italic mt-0.5">{doc.notes}</p>}
      </div>

      {/* Status badge + actions */}
      <div className="shrink-0 flex items-center gap-2">
        <span className={cn('text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1.5', statusCfg.bg, statusCfg.color)}>
          <span className={cn('w-1.5 h-1.5 rounded-full', statusCfg.dot)} />
          {statusCfg.label}
        </span>

        {/* Quick approve/reject */}
        {(doc.status === 'UPLOADED' || doc.status === 'UNDER_REVIEW') && (
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={() => updateStatus('APPROVED')} disabled={updating}
              className="p-1.5 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 transition-colors" title="Setujui">
              {updating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
            </button>
            <button onClick={() => updateStatus('REJECTED')} disabled={updating}
              className="p-1.5 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-colors" title="Tolak">
              <X className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* Review button */}
        {doc.status === 'UPLOADED' && (
          <button onClick={() => updateStatus('UNDER_REVIEW')} disabled={updating}
            className="text-[10px] font-semibold text-amber-600 hover:underline opacity-0 group-hover:opacity-100 transition-opacity">
            Review
          </button>
        )}

        {/* Open file */}
        {doc.fileUrl && (
          <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer"
            className="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:text-brand-600 hover:border-brand-200 transition-colors opacity-0 group-hover:opacity-100">
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        )}

        {/* Delete */}
        <button onClick={deleteDoc} disabled={deleting}
          className="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:text-red-500 hover:border-red-200 transition-colors opacity-0 group-hover:opacity-100">
          {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
        </button>
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

interface DocumentUploaderProps {
  shipmentId: string
  initialDocs?: any[]
  onDocsChange?: (docs: any[]) => void
}

export function DocumentUploader({ shipmentId, initialDocs = [], onDocsChange }: DocumentUploaderProps) {
  const [docs, setDocs]       = useState<any[]>(initialDocs)
  const [queue, setQueue]     = useState<QueueItem[]>([])
  const [uploading, setUploading] = useState(false)
  const [showDropzone, setShowDropzone] = useState(false)
  const idCounter = useRef(0)

  const updateDocs = (newDocs: any[]) => {
    setDocs(newDocs)
    onDocsChange?.(newDocs)
  }

  const onDrop = useCallback((accepted: File[], rejected: any[]) => {
    const newItems: QueueItem[] = accepted.map(file => ({
      id:      String(++idCounter.current),
      file,
      docType: 'OTHER',
      name:    file.name.replace(/\.[^/.]+$/, ''),
      notes:   '',
      visible: false,
      state:   'pending',
      progress: 0,
    }))
    setQueue(prev => [...prev, ...newItems])
    setShowDropzone(false)
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': [], 'image/*': [], 'application/vnd.ms-excel': [], 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': [], 'application/msword': [], 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': [] },
    maxSize: MAX_FILE_SIZE,
    multiple: true,
  })

  const removeFromQueue = (id: string) => setQueue(prev => prev.filter(q => q.id !== id))

  const updateQueueItem = (id: string, patch: Partial<QueueItem>) => {
    setQueue(prev => prev.map(q => q.id === id ? { ...q, ...patch } : q))
  }

  const uploadAll = async () => {
    const pending = queue.filter(q => q.state === 'pending')
    if (!pending.length) return

    setUploading(true)
    const newDocs: any[] = []

    for (const item of pending) {
      updateQueueItem(item.id, { state: 'uploading', progress: 10 })

      try {
        const fd = new FormData()
        fd.append('file', item.file)
        fd.append('shipmentId', shipmentId)
        fd.append('documentType', item.docType)
        fd.append('name', item.name || item.file.name)
        if (item.notes)   fd.append('notes', item.notes)
        fd.append('isVisibleToClient', String(item.visible))

        // Simulate progress
        updateQueueItem(item.id, { progress: 40 })

        const res  = await fetch('/api/upload', { method: 'POST', body: fd })
        const data = await res.json()

        updateQueueItem(item.id, { progress: 90 })

        if (!data.success) throw new Error(data.error)

        updateQueueItem(item.id, { state: 'done', progress: 100, resultDoc: data.data })
        newDocs.push(data.data)
      } catch (e: any) {
        updateQueueItem(item.id, { state: 'error', error: e.message || 'Upload gagal' })
      }
    }

    if (newDocs.length > 0) {
      updateDocs([...newDocs, ...docs])
    }
    setUploading(false)

    // Auto-clear done items setelah 3 detik
    setTimeout(() => setQueue(prev => prev.filter(q => q.state !== 'done')), 3000)
  }

  const pendingCount  = queue.filter(q => q.state === 'pending').length
  const errorCount    = queue.filter(q => q.state === 'error').length
  const approvedCount = docs.filter(d => d.status === 'APPROVED').length

  const handleStatusChange = (docId: string, status: string) => {
    updateDocs(docs.map(d => d.id === docId ? { ...d, status } : d))
  }

  const handleDelete = (docId: string) => {
    updateDocs(docs.filter(d => d.id !== docId))
  }

  return (
    <div className="space-y-4">

      {/* Header + upload button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
            <FileText className="w-4 h-4 text-brand-500" />
            Dokumen
          </h3>
          <span className="text-xs text-slate-400">
            ({approvedCount}/{docs.length} disetujui)
          </span>
        </div>
        <button
          onClick={() => setShowDropzone(p => !p)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 text-white rounded-lg text-xs font-semibold hover:bg-brand-700 transition-colors"
        >
          <Upload className="w-3.5 h-3.5" /> Upload Dokumen
        </button>
      </div>

      {/* Dropzone */}
      {showDropzone && (
        <div
          {...getRootProps()}
          className={cn(
            'border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer',
            isDragActive
              ? 'border-brand-400 bg-brand-50'
              : 'border-slate-200 hover:border-brand-300 hover:bg-slate-50'
          )}
        >
          <input {...getInputProps()} />
          <Upload className={cn('w-8 h-8 mx-auto mb-3', isDragActive ? 'text-brand-500' : 'text-slate-300')} />
          <p className="text-sm font-semibold text-slate-600">
            {isDragActive ? 'Lepas file di sini...' : 'Drag & drop file, atau klik untuk pilih'}
          </p>
          <p className="text-xs text-slate-400 mt-1.5">
            PDF, JPG, PNG, Excel, Word — maks. {MAX_FILE_SIZE / 1024 / 1024} MB per file
          </p>
        </div>
      )}

      {/* Upload queue */}
      {queue.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
              Antrian Upload ({queue.length} file)
            </p>
            <div className="flex items-center gap-2">
              {errorCount > 0 && (
                <button onClick={() => setQueue(prev => prev.filter(q => q.state !== 'error'))}
                  className="text-xs text-red-500 hover:underline">
                  Hapus error ({errorCount})
                </button>
              )}
              {pendingCount > 0 && (
                <button
                  onClick={uploadAll}
                  disabled={uploading}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-semibold hover:bg-green-700 disabled:opacity-60 transition-colors"
                >
                  {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                  Upload Semua ({pendingCount})
                </button>
              )}
            </div>
          </div>
          <div className="space-y-2">
            {queue.map(item => (
              <QueueCard
                key={item.id}
                item={item}
                onRemove={removeFromQueue}
                onUpdate={updateQueueItem}
              />
            ))}
          </div>
        </div>
      )}

      {/* Document list */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {docs.length === 0 && queue.length === 0 ? (
          <div className="p-10 text-center">
            <FileText className="w-8 h-8 text-slate-200 mx-auto mb-2" />
            <p className="text-slate-400 text-sm font-medium">Belum ada dokumen</p>
            <p className="text-slate-300 text-xs mt-1">Klik "Upload Dokumen" untuk menambahkan</p>
          </div>
        ) : docs.length === 0 ? null : (
          <>
            {/* Progress summary */}
            <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
              <div className="flex items-center gap-1.5 mb-1.5">
                <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 rounded-full transition-all duration-500"
                    style={{ width: docs.length > 0 ? `${(approvedCount / docs.length) * 100}%` : '0%' }}
                  />
                </div>
                <span className="text-[11px] text-slate-500 whitespace-nowrap">{approvedCount}/{docs.length}</span>
              </div>
              <div className="flex gap-4 text-[10px] text-slate-400">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500" />{approvedCount} disetujui</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-400" />{docs.filter(d => d.status === 'UPLOADED').length} terupload</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-slate-300" />{docs.filter(d => d.status === 'PENDING').length} menunggu</span>
                {docs.filter(d => d.status === 'REJECTED').length > 0 && (
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400" />{docs.filter(d => d.status === 'REJECTED').length} ditolak</span>
                )}
              </div>
            </div>
            <div className="divide-y divide-slate-50">
              {docs.map(doc => (
                <DocumentItem
                  key={doc.id}
                  doc={doc}
                  onStatusChange={handleStatusChange}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
