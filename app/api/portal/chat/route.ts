import { NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import Anthropic from '@anthropic-ai/sdk'
import { verifyPortalToken } from '@/lib/portal-auth'

const anthropic = new Anthropic()

// ─── Auth helper ───────────────────────────────────────────────────────────────

async function getPortalClient() {
  const jar   = await cookies()
  const token = jar.get('ff_portal_session')?.value
  if (!token) return null
  const payload = await verifyPortalToken(token)
  if (!payload) return null
  return prisma.client.findUnique({
    where: { id: payload.clientId },
    include: { organization: { select: { id: true, name: true } } },
  })
}

// ─── Status labels ─────────────────────────────────────────────────────────────

const STATUS_LABEL: Record<string, string> = {
  DRAFT:              'Draft',
  BOOKING_CONFIRMED:  'Booking Dikonfirmasi',
  DOCS_IN_PROGRESS:   'Dokumen Diproses',
  CUSTOMS_PROCESSING: 'Proses Bea Cukai',
  CARGO_RELEASED:     'Kargo Dilepaskan',
  IN_TRANSIT:         'Dalam Perjalanan',
  ARRIVED:            'Telah Tiba',
  DELIVERED:          'Terkirim',
  COMPLETED:          'Selesai',
  CANCELLED:          'Dibatalkan',
}

// ─── Build context string from shipment data ───────────────────────────────────

function buildShipmentContext(shipments: any[], clientName: string, orgName: string): string {
  const now = new Date()

  if (shipments.length === 0) {
    return `Klien ${clientName} dari ${orgName} belum memiliki shipment.`
  }

  const lines: string[] = [
    `Data shipment untuk klien: ${clientName} (${orgName})`,
    `Tanggal & waktu sekarang: ${now.toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })} WIB`,
    `Total shipment: ${shipments.length}`,
    '',
  ]

  for (const s of shipments) {
    const eta      = s.eta ? new Date(s.eta) : null
    const etd      = s.etd ? new Date(s.etd) : null
    const daysToEta = eta ? Math.ceil((eta.getTime() - now.getTime()) / 86_400_000) : null
    const isLate   = eta && eta < now && !['COMPLETED', 'DELIVERED', 'CANCELLED'].includes(s.status)
    const docs     = s.documents ?? []
    const history  = s.statusHistory ?? []

    lines.push(`--- Shipment: ${s.referenceNo} ---`)
    lines.push(`Status: ${STATUS_LABEL[s.status] ?? s.status}${isLate ? ' (TERLAMBAT!)' : ''}`)
    lines.push(`Tipe: ${s.type === 'IMPORT' ? 'Import' : 'Export'}, Moda: ${s.mode}`)

    if (s.originPort || s.destinationPort) {
      lines.push(`Rute: ${s.originPort ?? '?'} → ${s.destinationPort ?? '?'}`)
    }
    if (s.cargoDescription) lines.push(`Kargo: ${s.cargoDescription}`)
    if (s.grossWeight)      lines.push(`Berat: ${s.grossWeight} kg`)
    if (s.vesselName)       lines.push(`Kapal/Penerbangan: ${s.vesselName}${s.voyageNo ? ` (${s.voyageNo})` : ''}`)
    if (etd)                lines.push(`ETD: ${etd.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`)
    if (eta) {
      const etaStr = eta.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
      if (daysToEta !== null && daysToEta >= 0) {
        lines.push(`ETA: ${etaStr} (${daysToEta} hari lagi)`)
      } else if (isLate) {
        lines.push(`ETA: ${etaStr} (SUDAH LEWAT — terlambat ${Math.abs(daysToEta!)} hari)`)
      } else {
        lines.push(`ETA: ${etaStr}`)
      }
    }
    if (s.customsDeadline) {
      const cd = new Date(s.customsDeadline)
      lines.push(`Deadline Bea Cukai: ${cd.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`)
    }
    if (s.pibNo) lines.push(`No. PIB: ${s.pibNo}`)
    if (s.pebNo) lines.push(`No. PEB: ${s.pebNo}`)
    if (s.notes) lines.push(`Catatan: ${s.notes}`)

    // Dokumen
    if (docs.length > 0) {
      const approvedDocs = docs.filter((d: any) => d.status === 'APPROVED')
      const pendingDocs  = docs.filter((d: any) => ['PENDING', 'UNDER_REVIEW'].includes(d.status))
      lines.push(`Dokumen: ${approvedDocs.length} siap, ${pendingDocs.length} pending dari total ${docs.length}`)
    }

    // Riwayat status terbaru
    if (history.length > 0) {
      lines.push('Riwayat status terakhir:')
      history.slice(0, 3).forEach((h: any) => {
        const d = new Date(h.changedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
        lines.push(`  - ${d}: ${STATUS_LABEL[h.toStatus] ?? h.toStatus}${h.note ? ` — ${h.note}` : ''}`)
      })
    }

    lines.push('')
  }

  return lines.join('\n')
}

// ─── System prompt ─────────────────────────────────────────────────────────────

function buildSystemPrompt(context: string, orgName: string): string {
  return `Kamu adalah asisten AI untuk portal tracking klien ${orgName}, sebuah perusahaan freight forwarder Indonesia.

Tugasmu adalah membantu klien memahami status pengiriman barang mereka secara ramah, singkat, dan informatif. Jawab dalam Bahasa Indonesia yang natural dan mudah dipahami oleh pebisnis non-teknis.

PANDUAN PENTING:
- Jawab HANYA berdasarkan data shipment yang tersedia di bawah. Jangan mengarang informasi.
- Jika klien menanya sesuatu yang tidak ada di data, katakan dengan jelas bahwa informasi tersebut tidak tersedia dan sarankan mereka menghubungi tim ${orgName} langsung.
- Gunakan bahasa yang ramah dan profesional. Hindari jargon teknis yang tidak perlu.
- Untuk pertanyaan tentang biaya, harga, atau negosiasi — arahkan ke tim ${orgName} langsung.
- Jangan pernah membuat janji atau komitmen atas nama ${orgName}.
- Format jawaban: gunakan poin-poin singkat untuk informasi detail, kalimat biasa untuk penjelasan umum.
- Selalu konfirmasi referensi nomor shipment jika relevan.

DATA SHIPMENT REAL-TIME:
${context}`
}

// ─── Streaming POST handler ────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // Auth check
  const client = await getPortalClient()
  if (!client) {
    return new Response('Unauthorized', { status: 401 })
  }

  const { message, history } = await req.json() as {
    message: string
    history: { role: 'user' | 'assistant'; content: string }[]
  }

  if (!message?.trim()) {
    return new Response('Message required', { status: 400 })
  }

  // Load real-time shipment data
  const shipments = await prisma.shipment.findMany({
    where:   { clientId: client.id },
    orderBy: { createdAt: 'desc' },
    include: {
      documents: {
        where:   { isVisibleToClient: true },
        select:  { id: true, type: true, name: true, status: true, fileUrl: true },
      },
      statusHistory: {
        orderBy: { changedAt: 'desc' },
        take:    5,
        select:  { toStatus: true, note: true, changedAt: true },
      },
    },
  })

  const context      = buildShipmentContext(JSON.parse(JSON.stringify(shipments)), client.companyName ?? client.name, client.organization.name)
  const systemPrompt = buildSystemPrompt(context, client.organization.name)

  // Batasi history ke 10 pesan terakhir agar tidak melebihi context window
  const trimmedHistory = history.slice(-10)

  // Stream response dari Claude
  const stream = await anthropic.messages.stream({
    model:      'claude-opus-4-5',
    max_tokens: 1024,
    system:     systemPrompt,
    messages:   [
      ...trimmedHistory,
      { role: 'user', content: message },
    ],
  })

  // Pipe stream ke client sebagai SSE (text/event-stream)
  const encoder  = new TextEncoder()
  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
            const text = chunk.delta.text
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`))
          }
        }
        controller.enqueue(encoder.encode('data: [DONE]\n\n'))
      } catch (err) {
        console.error('[PORTAL CHAT]', err)
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: 'Gagal memproses pertanyaan' })}\n\n`))
      } finally {
        controller.close()
      }
    },
  })

  return new Response(readable, {
    headers: {
      'Content-Type':  'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection':    'keep-alive',
    },
  })
}
