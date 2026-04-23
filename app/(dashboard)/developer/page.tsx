'use client'

import { useState, useRef } from 'react'
import {
  Code2, Play, Copy, Check, ChevronDown, ChevronRight,
  Zap, Webhook, BookOpen, Terminal, Ship, Users,
  FileText, Receipt, BarChart3, Key, Globe,
  CheckCircle2, XCircle, Loader2, AlertCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ─── Types & Data ──────────────────────────────────────────────────────────────

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

interface ApiEndpoint {
  method:      HttpMethod
  path:        string
  description: string
  params?:     { name: string; type: string; required: boolean; description: string }[]
  body?:       Record<string, unknown>
  response:    Record<string, unknown>
}

interface ApiGroup {
  id:        string
  label:     string
  icon:      React.ElementType
  color:     string
  endpoints: ApiEndpoint[]
}

const METHOD_COLOR: Record<HttpMethod, string> = {
  GET:    'bg-green-100 text-green-700 border-green-200',
  POST:   'bg-blue-100 text-blue-700 border-blue-200',
  PUT:    'bg-amber-100 text-amber-700 border-amber-200',
  PATCH:  'bg-violet-100 text-violet-700 border-violet-200',
  DELETE: 'bg-red-100 text-red-600 border-red-200',
}

const API_GROUPS: ApiGroup[] = [
  {
    id: 'shipments', label: 'Shipments', icon: Ship, color: 'text-brand-600',
    endpoints: [
      {
        method: 'GET', path: '/api/v1/shipments',
        description: 'Ambil daftar semua shipment milik organisasi Anda.',
        params: [
          { name: 'status',  type: 'string',  required: false, description: 'Filter by status: DRAFT, IN_TRANSIT, COMPLETED, dll' },
          { name: 'limit',   type: 'integer', required: false, description: 'Jumlah hasil per halaman (default: 20, max: 100)' },
          { name: 'page',    type: 'integer', required: false, description: 'Nomor halaman (default: 1)' },
        ],
        response: { success: true, data: [{ id: 'clx...', referenceNo: 'FF-2026-001', status: 'IN_TRANSIT', mode: 'SEA_FCL', client: { name: 'PT. Contoh' } }], total: 1, page: 1 },
      },
      {
        method: 'GET', path: '/api/v1/shipments/:id',
        description: 'Ambil detail lengkap satu shipment berdasarkan ID.',
        response: { success: true, data: { id: 'clx...', referenceNo: 'FF-2026-001', status: 'IN_TRANSIT', mode: 'SEA_FCL', originPort: 'IDJKT', destinationPort: 'SGSIN', eta: '2026-05-01T00:00:00Z' } },
      },
      {
        method: 'POST', path: '/api/v1/shipments',
        description: 'Buat shipment baru.',
        body: { clientId: 'clx...', type: 'IMPORT', mode: 'SEA_FCL', originCountry: 'CN', destinationPort: 'IDJKT', cargoDescription: 'Electronic goods', grossWeight: 1500 },
        response: { success: true, data: { id: 'clx...', referenceNo: 'FF-2026-002', status: 'DRAFT' } },
      },
      {
        method: 'PATCH', path: '/api/v1/shipments/:id/status',
        description: 'Update status shipment.',
        body: { status: 'IN_TRANSIT', note: 'Kapal berangkat dari Pelabuhan Tanjung Priok' },
        response: { success: true, data: { id: 'clx...', status: 'IN_TRANSIT', updatedAt: '2026-04-21T08:00:00Z' } },
      },
    ],
  },
  {
    id: 'clients', label: 'Clients', icon: Users, color: 'text-violet-600',
    endpoints: [
      {
        method: 'GET', path: '/api/v1/clients',
        description: 'Ambil daftar semua klien.',
        response: { success: true, data: [{ id: 'clx...', companyName: 'PT. Jaya Ekspor', name: 'Budi Santoso', phone: '08xxx' }] },
      },
      {
        method: 'POST', path: '/api/v1/clients',
        description: 'Tambah klien baru.',
        body: { companyName: 'PT. Maju Jaya', name: 'Dewi', phone: '0812xxx', email: 'dewi@majujaya.com', type: 'EXPORTER' },
        response: { success: true, data: { id: 'clx...', companyName: 'PT. Maju Jaya' } },
      },
    ],
  },
  {
    id: 'documents', label: 'Documents', icon: FileText, color: 'text-amber-600',
    endpoints: [
      {
        method: 'GET', path: '/api/v1/shipments/:id/documents',
        description: 'Ambil semua dokumen untuk shipment tertentu.',
        response: { success: true, data: [{ id: 'clx...', type: 'BILL_OF_LADING', status: 'APPROVED', name: 'BL-FF2026001.pdf', fileUrl: 'https://...' }] },
      },
    ],
  },
  {
    id: 'invoices', label: 'Invoices', icon: Receipt, color: 'text-green-600',
    endpoints: [
      {
        method: 'GET', path: '/api/v1/invoices',
        description: 'Ambil daftar invoice.',
        params: [{ name: 'isPaid', type: 'boolean', required: false, description: 'Filter invoice yang sudah/belum dibayar' }],
        response: { success: true, data: [{ id: 'clx...', invoiceNo: 'INV-001', amount: 5000000, isPaid: false }] },
      },
    ],
  },
]

const WEBHOOK_EVENTS = [
  { event: 'shipment.status_changed',  description: 'Status shipment berubah',               example: { event: 'shipment.status_changed', shipmentId: 'clx...', referenceNo: 'FF-2026-001', fromStatus: 'BOOKING_CONFIRMED', toStatus: 'IN_TRANSIT', changedAt: '2026-04-21T08:00:00Z' } },
  { event: 'document.uploaded',        description: 'Dokumen baru diupload',                  example: { event: 'document.uploaded', shipmentId: 'clx...', documentId: 'clx...', type: 'BILL_OF_LADING', uploadedAt: '2026-04-21T09:00:00Z' } },
  { event: 'document.approved',        description: 'Dokumen disetujui',                      example: { event: 'document.approved', documentId: 'clx...', type: 'COMMERCIAL_INVOICE', approvedAt: '2026-04-21T10:00:00Z' } },
  { event: 'invoice.paid',             description: 'Invoice ditandai lunas',                 example: { event: 'invoice.paid', invoiceNo: 'INV-001', amount: 5000000, paidAt: '2026-04-21T11:00:00Z' } },
  { event: 'shipment.eta_updated',     description: 'ETA diperbarui dari vessel tracking',    example: { event: 'shipment.eta_updated', shipmentId: 'clx...', oldEta: '2026-05-01', newEta: '2026-05-03', reason: 'Port congestion' } },
  { event: 'customs.deadline_approaching', description: 'Deadline bea cukai < 3 hari',        example: { event: 'customs.deadline_approaching', shipmentId: 'clx...', deadline: '2026-04-24', daysLeft: 2 } },
]

// ─── Code snippet generator ────────────────────────────────────────────────────

function generateSnippet(lang: string, endpoint: ApiEndpoint, apiKey: string): string {
  const base    = 'https://api.portalog.id'
  const url     = `${base}${endpoint.path.replace(':id', 'SHIPMENT_ID')}`
  const hasBody = endpoint.body && ['POST', 'PUT', 'PATCH'].includes(endpoint.method)
  const bodyStr = hasBody ? JSON.stringify(endpoint.body, null, 2) : null

  if (lang === 'curl') return `curl -X ${endpoint.method} "${url}" \\
  -H "Authorization: Bearer ${apiKey || 'YOUR_API_KEY'}" \\
  -H "Content-Type: application/json"${hasBody ? ` \\
  -d '${JSON.stringify(endpoint.body)}'` : ''}`

  if (lang === 'js') return `const response = await fetch("${url}", {
  method: "${endpoint.method}",
  headers: {
    "Authorization": "Bearer ${apiKey || 'YOUR_API_KEY'}",
    "Content-Type": "application/json",
  },${hasBody ? `
  body: JSON.stringify(${bodyStr}),` : ''}
});

const data = await response.json();
console.log(data);`

  if (lang === 'python') return `import requests

response = requests.${endpoint.method.toLowerCase()}(
    "${url}",
    headers={
        "Authorization": "Bearer ${apiKey || 'YOUR_API_KEY'}",
        "Content-Type": "application/json",
    },${hasBody ? `
    json=${JSON.stringify(endpoint.body, null, 4).replace(/"/g, "'")},` : ''}
)

data = response.json()
print(data)`

  return ''
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
      className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors">
      {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
      {copied ? 'Disalin' : 'Copy'}
    </button>
  )
}

function CodeBlock({ code, lang = 'json' }: { code: string; lang?: string }) {
  return (
    <div className="relative bg-slate-900 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b border-slate-700">
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{lang}</span>
        <CopyButton text={code} />
      </div>
      <pre className="p-4 text-xs text-slate-300 overflow-x-auto leading-relaxed font-mono">{code}</pre>
    </div>
  )
}

function EndpointRow({ endpoint, apiKey }: { endpoint: ApiEndpoint; apiKey: string }) {
  const [open, setOpen]   = useState(false)
  const [lang, setLang]   = useState<'curl' | 'js' | 'python'>('curl')
  const [playing, setPlaying] = useState(false)
  const [playResult, setPlayResult] = useState<string | null>(null)

  const handlePlay = async () => {
    setPlaying(true); setPlayResult(null)
    try {
      const res  = await fetch(endpoint.path.replace(':id', 'test'), {
        method:  endpoint.method,
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type':  'application/json',
        },
        ...(endpoint.body ? { body: JSON.stringify(endpoint.body) } : {}),
      })
      const data = await res.json()
      setPlayResult(JSON.stringify(data, null, 2))
    } catch (e: any) {
      setPlayResult(JSON.stringify({ error: e.message }, null, 2))
    } finally { setPlaying(false) }
  }

  return (
    <div className={cn('border border-slate-200 rounded-xl overflow-hidden transition-all', open && 'shadow-md')}>
      <button onClick={() => setOpen(p => !p)}
        className="w-full flex items-center gap-3 px-4 py-3.5 bg-white hover:bg-slate-50 text-left transition-colors">
        <span className={cn('text-[11px] font-bold px-2.5 py-1 rounded-lg border font-mono shrink-0', METHOD_COLOR[endpoint.method])}>
          {endpoint.method}
        </span>
        <code className="text-sm font-mono text-slate-700 flex-1">{endpoint.path}</code>
        <span className="text-xs text-slate-400 hidden md:block">{endpoint.description}</span>
        {open ? <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" /> : <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />}
      </button>

      {open && (
        <div className="border-t border-slate-100 bg-slate-50 p-5 space-y-5">
          <p className="text-sm text-slate-600">{endpoint.description}</p>

          {/* Params */}
          {endpoint.params && (
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Query Parameters</p>
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-slate-100 bg-slate-50">
                    {['Nama', 'Tipe', 'Wajib', 'Deskripsi'].map(h => (
                      <th key={h} className="px-4 py-2 text-left text-[10px] font-bold text-slate-500 uppercase">{h}</th>
                    ))}
                  </tr></thead>
                  <tbody className="divide-y divide-slate-100">
                    {endpoint.params.map(p => (
                      <tr key={p.name}>
                        <td className="px-4 py-2.5"><code className="text-xs font-mono text-brand-600">{p.name}</code></td>
                        <td className="px-4 py-2.5"><code className="text-xs text-slate-500">{p.type}</code></td>
                        <td className="px-4 py-2.5">{p.required ? <span className="text-xs text-red-500 font-semibold">Ya</span> : <span className="text-xs text-slate-400">Tidak</span>}</td>
                        <td className="px-4 py-2.5 text-xs text-slate-500">{p.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Request body */}
          {endpoint.body && (
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Request Body</p>
              <CodeBlock code={JSON.stringify(endpoint.body, null, 2)} lang="json" />
            </div>
          )}

          {/* Response */}
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Response</p>
            <CodeBlock code={JSON.stringify(endpoint.response, null, 2)} lang="json" />
          </div>

          {/* Code snippets */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Code Snippet</p>
              <div className="flex gap-1">
                {(['curl', 'js', 'python'] as const).map(l => (
                  <button key={l} onClick={() => setLang(l)}
                    className={cn('px-2.5 py-1 text-[10px] font-bold rounded-lg transition-all uppercase',
                      lang === l ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50')}>
                    {l === 'js' ? 'JavaScript' : l}
                  </button>
                ))}
              </div>
            </div>
            <CodeBlock code={generateSnippet(lang, endpoint, apiKey)} lang={lang} />
          </div>

          {/* Playground */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">API Playground</p>
              <button onClick={handlePlay} disabled={playing || !apiKey}
                className={cn(
                  'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
                  apiKey ? 'bg-brand-600 text-white hover:bg-brand-700' : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                )}>
                {playing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                {playing ? 'Mengirim...' : 'Jalankan'}
              </button>
            </div>
            {!apiKey && (
              <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-2">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                Masukkan API Key di bagian atas untuk menggunakan playground
              </div>
            )}
            {playResult && <CodeBlock code={playResult} lang="json" />}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Page ──────────────────────────────────────────────────────────────────────

type Tab = 'docs' | 'webhooks'

export default function DeveloperPage() {
  const [tab, setTab]           = useState<Tab>('docs')
  const [apiKey, setApiKey]     = useState('')
  const [activeGroup, setActiveGroup] = useState('shipments')
  const [openWebhook, setOpenWebhook] = useState<string | null>(null)

  const group = API_GROUPS.find(g => g.id === activeGroup) ?? API_GROUPS[0]

  return (
    <div className="max-w-6xl space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">API & Developer</h1>
          <p className="text-slate-500 text-sm mt-1">
            Integrasikan Portalog dengan sistem internal Anda menggunakan REST API
          </p>
        </div>
        <a href="/api-keys" className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-sm font-semibold hover:bg-slate-800 transition-colors shrink-0">
          <Key className="w-4 h-4" /> Kelola API Keys
        </a>
      </div>

      {/* Base URL + API Key input */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 bg-slate-900 rounded-xl px-4 py-2.5">
            <Globe className="w-3.5 h-3.5 text-slate-400" />
            <code className="text-xs text-green-400 font-mono">https://api.portalog.id/v1</code>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            API aktif — v1
          </div>
        </div>

        {/* API key for playground */}
        <div>
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
            API Key (untuk Playground)
          </label>
          <div className="relative max-w-md">
            <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
            <input
              type="password"
              placeholder="plg_live_xxxxxxxxxxxx"
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400 focus:bg-white transition-all font-mono"
            />
          </div>
          <p className="text-xs text-slate-400 mt-1">API key tidak disimpan — hanya digunakan di browser untuk playground</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        {([
          { id: 'docs',     label: 'Dokumentasi API', icon: BookOpen  },
          { id: 'webhooks', label: 'Webhook Events',  icon: Webhook   },
        ] as const).map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all',
              tab === t.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            )}>
            <t.icon className="w-4 h-4" />
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Tab: Dokumentasi ── */}
      {tab === 'docs' && (
        <div className="flex gap-6">
          {/* Sidebar nav */}
          <div className="w-48 shrink-0 space-y-1">
            {API_GROUPS.map(g => (
              <button key={g.id} onClick={() => setActiveGroup(g.id)}
                className={cn(
                  'w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left',
                  activeGroup === g.id ? 'bg-brand-50 text-brand-700 font-semibold' : 'text-slate-500 hover:bg-slate-100'
                )}>
                <g.icon className={cn('w-4 h-4 shrink-0', activeGroup === g.id ? g.color : 'text-slate-400')} />
                {g.label}
                <span className="ml-auto text-[10px] bg-slate-200 text-slate-500 px-1.5 py-0.5 rounded-full">
                  {g.endpoints.length}
                </span>
              </button>
            ))}
          </div>

          {/* Endpoints */}
          <div className="flex-1 space-y-3 min-w-0">
            <div className="flex items-center gap-2 mb-4">
              <group.icon className={cn('w-5 h-5', group.color)} />
              <h2 className="text-base font-bold text-slate-800">{group.label}</h2>
              <span className="text-xs text-slate-400">{group.endpoints.length} endpoint</span>
            </div>
            {group.endpoints.map((ep, i) => (
              <EndpointRow key={i} endpoint={ep} apiKey={apiKey} />
            ))}
          </div>
        </div>
      )}

      {/* ── Tab: Webhooks ── */}
      {tab === 'webhooks' && (
        <div className="space-y-5">

          {/* Setup instructions */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Webhook className="w-4 h-4 text-brand-500" />
              <h3 className="text-sm font-bold text-slate-800">Setup Webhook</h3>
            </div>
            <div className="space-y-3 text-sm text-slate-600">
              <p>Portalog mengirimkan HTTP <code className="bg-slate-100 px-1.5 py-0.5 rounded font-mono text-xs">POST</code> request ke URL yang Anda daftarkan setiap kali terjadi event penting.</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[
                  { label: '1. Daftarkan URL', desc: 'Masuk ke Pengaturan → Webhook → tambahkan HTTPS endpoint Anda' },
                  { label: '2. Verifikasi signature', desc: 'Setiap request menyertakan header X-Portalog-Signature untuk verifikasi' },
                  { label: '3. Respon 200', desc: 'Endpoint harus merespon HTTP 200 dalam 10 detik, atau request akan di-retry' },
                  { label: '4. Idempotency', desc: 'Gunakan field event.id untuk hindari proses duplikat' },
                ].map(s => (
                  <div key={s.label} className="bg-slate-50 rounded-xl p-3 border border-slate-200">
                    <p className="text-xs font-bold text-slate-700 mb-1">{s.label}</p>
                    <p className="text-xs text-slate-500">{s.desc}</p>
                  </div>
                ))}
              </div>

              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Verifikasi Signature (Node.js)</p>
                <CodeBlock lang="javascript" code={`const crypto = require('crypto')

function verifyWebhook(payload, signature, secret) {
  const expected = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex')
  return \`sha256=\${expected}\` === signature
}

// Di Express / Next.js route handler:
const sig    = req.headers['x-portalog-signature']
const isValid = verifyWebhook(req.body, sig, process.env.WEBHOOK_SECRET)
if (!isValid) return res.status(401).json({ error: 'Invalid signature' })`} />
              </div>
            </div>
          </div>

          {/* Event list */}
          <div>
            <p className="text-sm font-bold text-slate-800 mb-3">Event Types</p>
            <div className="space-y-2">
              {WEBHOOK_EVENTS.map(ev => (
                <div key={ev.event} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                  <button onClick={() => setOpenWebhook(openWebhook === ev.event ? null : ev.event)}
                    className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-slate-50 text-left transition-colors">
                    <code className="text-xs font-mono bg-slate-100 px-2.5 py-1 rounded-lg text-brand-700 shrink-0">
                      {ev.event}
                    </code>
                    <span className="text-sm text-slate-600 flex-1">{ev.description}</span>
                    {openWebhook === ev.event
                      ? <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                      : <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                    }
                  </button>
                  {openWebhook === ev.event && (
                    <div className="border-t border-slate-100 bg-slate-50 p-4">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Contoh Payload</p>
                      <CodeBlock code={JSON.stringify(ev.example, null, 2)} lang="json" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
