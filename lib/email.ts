// ─── Resend Email Helper ──────────────────────────────────────────────────────

// ─── Types ────────────────────────────────────────────────────────────────────

export interface EmailResult {
  success: boolean
  id?:     string
  error?:  string
}

export interface StatusChangeEmailPayload {
  clientName:   string
  clientEmail:  string
  referenceNo:  string
  newStatus:    string
  orgName:      string
  orgEmail?:    string
  eta?:         string
  portalUrl?:   string
  note?:        string
}

export interface DocumentReadyEmailPayload {
  clientName:   string
  clientEmail:  string
  referenceNo:  string
  documentName: string
  orgName:      string
  portalUrl?:   string
}

export interface DeadlineReminderEmailPayload {
  clientName:   string
  clientEmail:  string
  referenceNo:  string
  deadlineType: 'customs' | 'eta'
  deadlineDate: string
  daysLeft:     number
  orgName:      string
}

export interface StaffInviteEmailPayload {
  inviteeName?: string
  inviterName:  string
  orgName:      string
  inviteUrl:    string
  expiresIn:    string
  role:         string
}

// ─── Status config ─────────────────────────────────────────────────────────────

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

const STATUS_COLOR: Record<string, string> = {
  DRAFT:              '#64748b',
  BOOKING_CONFIRMED:  '#2563eb',
  DOCS_IN_PROGRESS:   '#d97706',
  CUSTOMS_PROCESSING: '#ea580c',
  CARGO_RELEASED:     '#0d9488',
  IN_TRANSIT:         '#4f46e5',
  ARRIVED:            '#7c3aed',
  DELIVERED:          '#16a34a',
  COMPLETED:          '#15803d',
  CANCELLED:          '#dc2626',
}

const STATUS_ICON: Record<string, string> = {
  DRAFT:              '📋',
  BOOKING_CONFIRMED:  '✅',
  DOCS_IN_PROGRESS:   '📄',
  CUSTOMS_PROCESSING: '🏛️',
  CARGO_RELEASED:     '🔓',
  IN_TRANSIT:         '🚢',
  ARRIVED:            '⚓',
  DELIVERED:          '📦',
  COMPLETED:          '🎉',
  CANCELLED:          '❌',
}

// ─── HTML Templates ───────────────────────────────────────────────────────────

function baseLayout(content: string, orgName: string, orgEmail?: string): string {
  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Notifikasi dari ${orgName}</title>
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
          <!-- Header -->
          <tr>
            <td style="background:#1e293b;border-radius:12px 12px 0 0;padding:24px 32px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <div style="display:inline-block;background:#3b82f6;border-radius:8px;width:36px;height:36px;line-height:36px;text-align:center;font-size:18px;vertical-align:middle;margin-right:10px;">⛴</div>
                    <span style="color:#ffffff;font-size:16px;font-weight:700;vertical-align:middle;">${orgName}</span>
                  </td>
                  <td align="right">
                    <span style="color:#94a3b8;font-size:11px;">Notifikasi Otomatis</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="background:#ffffff;padding:32px;">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background:#f8fafc;border-radius:0 0 12px 12px;padding:20px 32px;border-top:1px solid #e2e8f0;">
              <p style="margin:0;color:#94a3b8;font-size:11px;text-align:center;line-height:1.6;">
                Email ini dikirim secara otomatis oleh <strong>${orgName}</strong>.<br/>
                ${orgEmail ? `Balas email ini ke <a href="mailto:${orgEmail}" style="color:#3b82f6;">${orgEmail}</a> jika ada pertanyaan.<br/>` : ''}
                &copy; ${new Date().getFullYear()} ${orgName} · Powered by ForwarderOS
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

export function buildStatusChangeEmail(p: StatusChangeEmailPayload): { subject: string; html: string } {
  const label       = STATUS_LABEL[p.newStatus] ?? p.newStatus
  const color       = STATUS_COLOR[p.newStatus] ?? '#3b82f6'
  const icon        = STATUS_ICON[p.newStatus]  ?? '📦'
  const isCompleted = p.newStatus === 'COMPLETED'
  const isCancelled = p.newStatus === 'CANCELLED'

  const content = `
    <h2 style="margin:0 0 4px;font-size:22px;font-weight:700;color:#0f172a;">${icon} Update Status Shipment</h2>
    <p style="margin:0 0 24px;color:#64748b;font-size:14px;">Halo <strong>${p.clientName}</strong>, berikut update terbaru untuk pengiriman Anda.</p>

    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:16px 20px;margin-bottom:20px;">
      <p style="margin:0 0 4px;font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.05em;">Nomor Referensi</p>
      <p style="margin:0;font-size:20px;font-weight:700;color:#0f172a;font-family:monospace;">${p.referenceNo}</p>
    </div>

    <div style="text-align:center;margin-bottom:24px;">
      <div style="display:inline-block;background:${color}18;border:2px solid ${color};border-radius:50px;padding:12px 28px;">
        <span style="font-size:15px;font-weight:700;color:${color};">${icon} ${label}</span>
      </div>
    </div>

    ${p.eta ? `
    <div style="background:#eff6ff;border-left:4px solid #3b82f6;border-radius:0 8px 8px 0;padding:12px 16px;margin-bottom:20px;">
      <p style="margin:0 0 2px;font-size:11px;color:#3b82f6;font-weight:600;text-transform:uppercase;">Estimasi Tiba (ETA)</p>
      <p style="margin:0;font-size:14px;font-weight:600;color:#1e40af;">${p.eta}</p>
    </div>` : ''}

    ${p.note ? `
    <div style="background:#fafafa;border:1px solid #e2e8f0;border-radius:8px;padding:12px 16px;margin-bottom:20px;">
      <p style="margin:0 0 4px;font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.05em;">Catatan</p>
      <p style="margin:0;font-size:13px;color:#374151;line-height:1.5;">${p.note}</p>
    </div>` : ''}

    ${isCompleted ? `
    <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:8px;padding:16px;margin-bottom:20px;text-align:center;">
      <p style="margin:0;font-size:14px;color:#15803d;font-weight:600;">🎉 Pengiriman Anda telah selesai!</p>
      <p style="margin:4px 0 0;font-size:12px;color:#16a34a;">Terima kasih telah mempercayakan pengiriman kepada kami.</p>
    </div>` : ''}

    ${isCancelled ? `
    <div style="background:#fff1f2;border:1px solid #fecaca;border-radius:8px;padding:16px;margin-bottom:20px;text-align:center;">
      <p style="margin:0;font-size:14px;color:#be123c;font-weight:600;">Shipment ini telah dibatalkan</p>
      <p style="margin:4px 0 0;font-size:12px;color:#dc2626;">Hubungi kami jika ada pertanyaan lebih lanjut.</p>
    </div>` : ''}

    ${p.portalUrl ? `
    <div style="text-align:center;margin-top:24px;">
      <a href="${p.portalUrl}" style="display:inline-block;background:#3b82f6;color:#ffffff;font-weight:600;font-size:14px;text-decoration:none;padding:13px 28px;border-radius:8px;">
        🔗 Pantau Status Real-time
      </a>
      <p style="margin:10px 0 0;font-size:11px;color:#94a3b8;">atau buka: <a href="${p.portalUrl}" style="color:#3b82f6;">${p.portalUrl}</a></p>
    </div>` : ''}
  `

  return {
    subject: `${icon} [${p.referenceNo}] Status Diperbarui: ${label}`,
    html:    baseLayout(content, p.orgName, p.orgEmail),
  }
}

export function buildDocumentReadyEmail(p: DocumentReadyEmailPayload): { subject: string; html: string } {
  const content = `
    <h2 style="margin:0 0 4px;font-size:22px;font-weight:700;color:#0f172a;">📄 Dokumen Siap Diunduh</h2>
    <p style="margin:0 0 24px;color:#64748b;font-size:14px;">Halo <strong>${p.clientName}</strong>, dokumen berikut sudah tersedia untuk Anda.</p>

    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:16px 20px;margin-bottom:20px;">
      <p style="margin:0 0 4px;font-size:11px;color:#94a3b8;text-transform:uppercase;">Referensi Shipment</p>
      <p style="margin:0;font-size:18px;font-weight:700;color:#0f172a;font-family:monospace;">${p.referenceNo}</p>
    </div>

    <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:10px;padding:16px 20px;margin-bottom:24px;">
      <p style="margin:0 0 4px;font-size:11px;color:#15803d;text-transform:uppercase;font-weight:600;">Dokumen Tersedia</p>
      <p style="margin:0;font-size:15px;font-weight:600;color:#15803d;">✓ ${p.documentName}</p>
    </div>

    ${p.portalUrl ? `
    <div style="text-align:center;margin-top:8px;">
      <a href="${p.portalUrl}" style="display:inline-block;background:#15803d;color:#ffffff;font-weight:600;font-size:14px;text-decoration:none;padding:13px 28px;border-radius:8px;">
        ⬇️ Download Dokumen
      </a>
    </div>` : ''}
  `

  return {
    subject: `📄 [${p.referenceNo}] Dokumen Siap: ${p.documentName}`,
    html:    baseLayout(content, p.orgName),
  }
}

export function buildDeadlineReminderEmail(p: DeadlineReminderEmailPayload): { subject: string; html: string } {
  const typeLabel = p.deadlineType === 'customs' ? 'Deadline Bea Cukai' : 'Estimasi Kedatangan (ETA)'
  const urgency   = p.daysLeft <= 1 ? '🚨' : p.daysLeft <= 2 ? '⚠️' : '📌'
  const bgColor   = p.daysLeft <= 1 ? '#fff1f2'  : p.daysLeft <= 2 ? '#fffbeb'  : '#eff6ff'
  const bdColor   = p.daysLeft <= 1 ? '#fecaca'  : p.daysLeft <= 2 ? '#fde68a'  : '#bfdbfe'
  const txtColor  = p.daysLeft <= 1 ? '#be123c'  : p.daysLeft <= 2 ? '#b45309'  : '#1d4ed8'

  const content = `
    <h2 style="margin:0 0 4px;font-size:22px;font-weight:700;color:#0f172a;">${urgency} Pengingat Deadline</h2>
    <p style="margin:0 0 24px;color:#64748b;font-size:14px;">Halo <strong>${p.clientName}</strong>, terdapat deadline yang perlu Anda perhatikan.</p>

    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:16px 20px;margin-bottom:20px;">
      <p style="margin:0 0 4px;font-size:11px;color:#94a3b8;text-transform:uppercase;">Referensi Shipment</p>
      <p style="margin:0;font-size:18px;font-weight:700;color:#0f172a;font-family:monospace;">${p.referenceNo}</p>
    </div>

    <div style="background:${bgColor};border:2px solid ${bdColor};border-radius:10px;padding:20px;margin-bottom:24px;text-align:center;">
      <p style="margin:0 0 4px;font-size:12px;color:${txtColor};text-transform:uppercase;font-weight:600;">${typeLabel}</p>
      <p style="margin:0 0 8px;font-size:24px;font-weight:700;color:${txtColor};">${p.deadlineDate}</p>
      <p style="margin:0;font-size:13px;color:${txtColor};">${urgency} Sisa waktu: <strong>${p.daysLeft} hari lagi</strong></p>
    </div>

    <p style="color:#64748b;font-size:13px;line-height:1.6;margin:0;">
      Mohon segera menyelesaikan kewajiban yang diperlukan sebelum tanggal tersebut. Hubungi tim kami jika memerlukan bantuan.
    </p>
  `

  return {
    subject: `${urgency} [${p.referenceNo}] Reminder: ${typeLabel} — ${p.daysLeft} hari lagi`,
    html:    baseLayout(content, p.orgName),
  }
}

export function buildStaffInviteEmail(p: StaffInviteEmailPayload): { subject: string; html: string } {
  const roleLabel = p.role === 'OWNER' ? 'Owner' : 'Staff'
  const content = `
    <h2 style="margin:0 0 4px;font-size:22px;font-weight:700;color:#0f172a;">✉️ Undangan Bergabung ke ${p.orgName}</h2>
    <p style="margin:0 0 24px;color:#64748b;font-size:14px;">
      ${p.inviteeName ? `Halo <strong>${p.inviteeName}</strong>,` : 'Halo,'} Anda diundang untuk bergabung ke tim <strong>${p.orgName}</strong> di ForwarderOS.
    </p>

    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:16px 20px;margin-bottom:20px;">
      <p style="margin:0 0 4px;font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.05em;">Diundang oleh</p>
      <p style="margin:0;font-size:15px;font-weight:700;color:#0f172a;">${p.inviterName}</p>
      <p style="margin:4px 0 0;font-size:13px;color:#64748b;">${p.orgName} · Peran: <strong>${roleLabel}</strong></p>
    </div>

    <div style="background:#eff6ff;border-left:4px solid #3b82f6;border-radius:0 8px 8px 0;padding:12px 16px;margin-bottom:24px;">
      <p style="margin:0;font-size:13px;color:#1e40af;line-height:1.6;">
        Link undangan ini berlaku selama <strong>${p.expiresIn}</strong>. Setelah Anda menerima undangan, Anda dapat langsung login menggunakan email ini.
      </p>
    </div>

    <div style="text-align:center;margin:28px 0;">
      <a href="${p.inviteUrl}" style="display:inline-block;background:#3b82f6;color:#ffffff;font-weight:700;font-size:15px;text-decoration:none;padding:14px 32px;border-radius:10px;">
        Terima Undangan
      </a>
    </div>

    <p style="color:#94a3b8;font-size:12px;text-align:center;line-height:1.6;">
      Atau salin link berikut ke browser Anda:<br/>
      <a href="${p.inviteUrl}" style="color:#3b82f6;word-break:break-all;">${p.inviteUrl}</a>
    </p>

    <div style="background:#fafafa;border:1px solid #e2e8f0;border-radius:8px;padding:12px 16px;margin-top:20px;">
      <p style="margin:0;font-size:12px;color:#64748b;">
        Jika Anda tidak merasa diundang atau tidak mengenal ${p.orgName}, abaikan email ini. Link akan kadaluarsa otomatis dalam ${p.expiresIn}.
      </p>
    </div>
  `

  return {
    subject: `Undangan bergabung ke ${p.orgName} di ForwarderOS`,
    html:    baseLayout(content, p.orgName),
  }
}

// ─── Resend sender ────────────────────────────────────────────────────────────

async function sendViaResend(options: {
  to:      string
  from?:   string
  subject: string
  html:    string
}): Promise<EmailResult> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.warn('[EMAIL] RESEND_API_KEY tidak di-set — notifikasi email dilewati')
    return { success: false, error: 'API key tidak ada' }
  }

  const from = options.from ?? process.env.EMAIL_FROM ?? 'onboarding@resend.dev'

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method:  'POST',
      headers: {
        Authorization:  `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to:      [options.to],
        subject: options.subject,
        html:    options.html,
      }),
    })

    const data = await res.json()
    if (!res.ok) {
      console.error('[EMAIL] Resend error:', data)
      return { success: false, error: data.message ?? 'Resend error' }
    }
    return { success: true, id: data.id }
  } catch (err: any) {
    console.error('[EMAIL] Fetch error:', err)
    return { success: false, error: err.message ?? 'Koneksi gagal' }
  }
}

// ─── Main exported notification functions ─────────────────────────────────────

export async function emailNotifyStatusChange(p: StatusChangeEmailPayload): Promise<EmailResult> {
  const { subject, html } = buildStatusChangeEmail(p)
  return sendViaResend({ to: p.clientEmail, subject, html })
}

export async function emailNotifyDocumentReady(p: DocumentReadyEmailPayload): Promise<EmailResult> {
  const { subject, html } = buildDocumentReadyEmail(p)
  return sendViaResend({ to: p.clientEmail, subject, html })
}

export async function emailNotifyDeadlineReminder(p: DeadlineReminderEmailPayload): Promise<EmailResult> {
  const { subject, html } = buildDeadlineReminderEmail(p)
  return sendViaResend({ to: p.clientEmail, subject, html })
}

export async function emailSendStaffInvite(p: StaffInviteEmailPayload & { to: string }): Promise<EmailResult> {
  const { subject, html } = buildStaffInviteEmail(p)
  return sendViaResend({ to: p.to, subject, html })
}

// ─── Deadline Reminder Batch ──────────────────────────────────────────────────

export async function checkAndSendDeadlineReminders(shipments: {
  referenceNo:     string
  customsDeadline: Date | null
  eta:             Date | null
  client: {
    name:  string
    email: string | null
  }
  organization: { name: string }
}[]): Promise<void> {
  const now     = new Date()
  const pending: Promise<EmailResult>[] = []

  for (const s of shipments) {
    if (!s.client.email) continue

    const check = (date: Date | null, type: 'customs' | 'eta') => {
      if (!date) return
      const diff = Math.ceil((date.getTime() - now.getTime()) / 86_400_000)
      if (diff > 0 && diff <= 3) {
        pending.push(emailNotifyDeadlineReminder({
          clientName:   s.client.name,
          clientEmail:  s.client.email!,
          referenceNo:  s.referenceNo,
          deadlineType: type,
          deadlineDate: date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
          daysLeft:     diff,
          orgName:      s.organization.name,
        }))
      }
    }

    check(s.customsDeadline, 'customs')
    check(s.eta, 'eta')
  }

  await Promise.allSettled(pending)
}

export const sendBulkDeadlineEmailReminders = checkAndSendDeadlineReminders