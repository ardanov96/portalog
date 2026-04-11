// ─── Fonnte WhatsApp notification helper ─────────────────────────────────────
// Docs: https://fonnte.com/api
// Install: tidak perlu package tambahan — pakai native fetch

export type WaTarget = string | string[] // nomor WA, format: 628xxx atau 08xxx

interface FonnteResponse {
  status: boolean
  process?: boolean
  message?: string
}

async function sendFonnte(target: WaTarget, message: string): Promise<FonnteResponse> {
  const apiKey = process.env.FONNTE_API_KEY
  if (!apiKey) {
    console.warn('[WA] FONNTE_API_KEY tidak di-set — notifikasi WA dilewati')
    return { status: false, message: 'API key tidak ada' }
  }

  const targets = Array.isArray(target) ? target.join(',') : target
  if (!targets.trim()) return { status: false, message: 'Nomor tujuan kosong' }

  try {
    const res = await fetch('https://api.fonnte.com/send', {
      method: 'POST',
      headers: {
        Authorization: apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        target:  targets,
        message,
        countryCode: '62',
      }),
    })
    const data = await res.json()
    if (!res.ok || !data.status) {
      console.error('[WA] Fonnte error:', data)
    }
    return data
  } catch (err) {
    console.error('[WA] Fetch error:', err)
    return { status: false, message: 'Koneksi gagal' }
  }
}

// ─── Message templates ────────────────────────────────────────────────────────

const STATUS_LABEL: Record<string, string> = {
  DRAFT:              'Draft',
  BOOKING_CONFIRMED:  'Booking Dikonfirmasi',
  DOCS_IN_PROGRESS:   'Dokumen Sedang Diproses',
  CUSTOMS_PROCESSING: 'Sedang Proses Bea Cukai',
  CARGO_RELEASED:     'Kargo Dilepaskan',
  IN_TRANSIT:         'Dalam Perjalanan',
  ARRIVED:            'Telah Tiba di Tujuan',
  DELIVERED:          'Telah Dikirim ke Tujuan Akhir',
  COMPLETED:          'Shipment Selesai',
  CANCELLED:          'Shipment Dibatalkan',
}

export interface ShipmentNotifPayload {
  clientName:    string
  referenceNo:   string
  newStatus:     string
  orgName:       string
  eta?:          string
  portalUrl?:    string
  note?:         string
}

export interface DeadlineNotifPayload {
  clientName:    string
  referenceNo:   string
  deadlineType:  'customs' | 'eta'
  deadlineDate:  string
  orgName:       string
  daysLeft:      number
}

export interface DocumentReadyPayload {
  clientName:    string
  referenceNo:   string
  documentName:  string
  orgName:       string
  portalUrl?:    string
}

// ─── Notification functions ───────────────────────────────────────────────────

export async function notifyStatusChange(
  phone: string,
  payload: ShipmentNotifPayload,
): Promise<FonnteResponse> {
  const statusLabel = STATUS_LABEL[payload.newStatus] ?? payload.newStatus
  const lines = [
    `📦 *Update Shipment - ${payload.orgName}*`,
    ``,
    `Halo *${payload.clientName}*,`,
    ``,
    `Shipment Anda dengan referensi *${payload.referenceNo}* telah diperbarui:`,
    ``,
    `🔄 Status: *${statusLabel}*`,
    payload.eta ? `📅 Estimasi Tiba: *${payload.eta}*` : null,
    payload.note ? `📝 Catatan: ${payload.note}` : null,
    ``,
    payload.portalUrl
      ? `🔗 Pantau status real-time:\n${payload.portalUrl}`
      : `Hubungi kami untuk informasi lebih lanjut.`,
    ``,
    `_Pesan otomatis dari ${payload.orgName}_`,
  ].filter(l => l !== null).join('\n')

  return sendFonnte(phone, lines)
}

export async function notifyDeadlineReminder(
  phone: string,
  payload: DeadlineNotifPayload,
): Promise<FonnteResponse> {
  const typeLabel = payload.deadlineType === 'customs'
    ? 'Deadline Bea Cukai'
    : 'Estimasi Kedatangan (ETA)'

  const urgency = payload.daysLeft <= 1 ? '🚨' : payload.daysLeft <= 2 ? '⚠️' : '📌'

  const lines = [
    `${urgency} *Pengingat Deadline - ${payload.orgName}*`,
    ``,
    `Halo *${payload.clientName}*,`,
    ``,
    `Shipment *${payload.referenceNo}* memiliki deadline yang mendekat:`,
    ``,
    `📋 Jenis: *${typeLabel}*`,
    `📅 Tanggal: *${payload.deadlineDate}*`,
    `⏳ Sisa Waktu: *${payload.daysLeft} hari*`,
    ``,
    `Mohon segera lengkapi dokumen yang diperlukan.`,
    ``,
    `_${payload.orgName}_`,
  ].join('\n')

  return sendFonnte(phone, lines)
}

export async function notifyDocumentReady(
  phone: string,
  payload: DocumentReadyPayload,
): Promise<FonnteResponse> {
  const lines = [
    `📄 *Dokumen Siap - ${payload.orgName}*`,
    ``,
    `Halo *${payload.clientName}*,`,
    ``,
    `Dokumen untuk shipment *${payload.referenceNo}* telah tersedia:`,
    ``,
    `📎 Dokumen: *${payload.documentName}*`,
    `✅ Status: Disetujui & Siap Diunduh`,
    ``,
    payload.portalUrl
      ? `🔗 Download dokumen:\n${payload.portalUrl}`
      : `Hubungi kami untuk mengambil dokumen.`,
    ``,
    `_${payload.orgName}_`,
  ].join('\n')

  return sendFonnte(phone, lines)
}

// ─── Bulk deadline check — dipanggil dari cron / manual trigger ───────────────

export async function sendDeadlineReminders(shipments: {
  referenceNo:    string
  customsDeadline: Date | null
  eta:            Date | null
  client: {
    name:    string
    phone:   string | null
  }
  organization: {
    name: string
  }
}[]): Promise<void> {
  const now   = new Date()
  const results: Promise<any>[] = []

  for (const s of shipments) {
    if (!s.client.phone) continue

    const checkDeadline = (date: Date | null, type: 'customs' | 'eta') => {
      if (!date) return
      const diff = Math.ceil((date.getTime() - now.getTime()) / 86_400_000)
      if (diff > 0 && diff <= 3) {
        results.push(
          notifyDeadlineReminder(s.client.phone!, {
            clientName:   s.client.name,
            referenceNo:  s.referenceNo,
            deadlineType: type,
            deadlineDate: date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
            orgName:      s.organization.name,
            daysLeft:     diff,
          })
        )
      }
    }

    checkDeadline(s.customsDeadline, 'customs')
    checkDeadline(s.eta, 'eta')
  }

  await Promise.allSettled(results)
}
