'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { cn, formatRupiah, formatDate } from '@/lib/utils'
import {
  Receipt, Download, Check, X, Loader2,
  ChevronRight, FileText, Clock,
} from 'lucide-react'

type InvoiceItem = {
  id: string; referenceNo: string; invoiceNo: string
  invoiceDate: string; isPaid: boolean; totalCost: number | null
  status: string
  client: { id: string; name: string; companyName: string | null }
}

function InvoiceStatusBadge({ isPaid }: { isPaid: boolean }) {
  if (isPaid) return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-50 text-green-700">
      <Check className="w-3 h-3" /> Lunas
    </span>
  )
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700">
      <Clock className="w-3 h-3" /> Belum Lunas
    </span>
  )
}

export default function InvoicesPage() {
  const [invoices, setInvoices]   = useState<InvoiceItem[]>([])
  const [loading, setLoading]     = useState(true)
  const [filter, setFilter]       = useState<'all' | 'paid' | 'unpaid'>('all')
  const [downloading, setDownloading] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    const params = filter !== 'all' ? `?isPaid=${filter === 'paid'}` : ''
    fetch(`/api/invoices${params}`).then(r => r.json()).then(d => {
      if (d.success) setInvoices(d.data)
    }).finally(() => setLoading(false))
  }, [filter])

  const downloadPdf = async (id: string, invoiceNo: string) => {
    setDownloading(id)
    try {
      const res  = await fetch(`/api/invoices/${id}/pdf`)
      if (!res.ok) throw new Error()
      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href = url; a.download = `${invoiceNo}.pdf`; a.click()
      URL.revokeObjectURL(url)
    } finally { setDownloading(null) }
  }

  const totalUnpaid  = invoices.filter(i => !i.isPaid).reduce((s, i) => s + (i.totalCost || 0), 0)
  const totalAll     = invoices.reduce((s, i) => s + (i.totalCost || 0), 0)
  const countUnpaid  = invoices.filter(i => !i.isPaid).length

  return (
    <div className="max-w-5xl space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Invoice</h1>
          <p className="text-slate-500 text-sm">Tagihan dan riwayat pembayaran</p>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-xl border border-slate-200 px-5 py-4">
          <p className="text-2xl font-bold text-slate-900">{invoices.length}</p>
          <p className="text-xs text-slate-500 mt-0.5">Total Invoice</p>
          <p className="text-xs text-slate-400 mt-1">{formatRupiah(totalAll)}</p>
        </div>
        <div className="bg-amber-50 rounded-xl border border-amber-100 px-5 py-4">
          <p className="text-2xl font-bold text-amber-700">{countUnpaid}</p>
          <p className="text-xs text-slate-500 mt-0.5">Belum Lunas</p>
          <p className="text-xs text-amber-600 font-semibold mt-1">{formatRupiah(totalUnpaid)}</p>
        </div>
        <div className="bg-green-50 rounded-xl border border-green-100 px-5 py-4">
          <p className="text-2xl font-bold text-green-700">{invoices.filter(i => i.isPaid).length}</p>
          <p className="text-xs text-slate-500 mt-0.5">Lunas</p>
          <p className="text-xs text-green-600 font-semibold mt-1">{formatRupiah(totalAll - totalUnpaid)}</p>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        {([
          { key: 'all',    label: 'Semua' },
          { key: 'unpaid', label: 'Belum Lunas' },
          { key: 'paid',   label: 'Lunas' },
        ] as const).map(t => (
          <button key={t.key} onClick={() => setFilter(t.key)}
            className={cn('px-4 py-2 rounded-lg text-sm font-medium transition-all',
              filter === t.key ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700')}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <Loader2 className="w-6 h-6 text-brand-400 animate-spin mx-auto" />
          </div>
        ) : invoices.length === 0 ? (
          <div className="p-12 text-center">
            <Receipt className="w-8 h-8 text-slate-200 mx-auto mb-2" />
            <p className="text-slate-400 text-sm font-medium">Belum ada invoice</p>
            <p className="text-slate-300 text-xs mt-1">
              Buat invoice dari halaman detail shipment
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  {['No. Invoice','Shipment','Klien','Tanggal','Total','Status',''].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {invoices.map(inv => (
                  <tr key={inv.id} className="hover:bg-slate-50/60 transition-colors group">
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <p className="font-bold text-sm text-slate-800 font-mono">{inv.invoiceNo}</p>
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <Link href={`/shipments/${inv.id}`} className="text-xs text-brand-600 hover:underline font-semibold">
                        {inv.referenceNo}
                      </Link>
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="text-sm font-medium text-slate-800 truncate max-w-[160px]">
                        {inv.client.companyName || inv.client.name}
                      </p>
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <p className="text-xs text-slate-500">{formatDate(inv.invoiceDate)}</p>
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <p className="text-sm font-bold text-slate-800">
                        {inv.totalCost ? formatRupiah(inv.totalCost) : '-'}
                      </p>
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <InvoiceStatusBadge isPaid={inv.isPaid} />
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <button
                        onClick={() => downloadPdf(inv.id, inv.invoiceNo)}
                        disabled={downloading === inv.id}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:border-brand-200 hover:text-brand-600 transition-all disabled:opacity-50"
                      >
                        {downloading === inv.id
                          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          : <Download className="w-3.5 h-3.5" />
                        }
                        PDF
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
