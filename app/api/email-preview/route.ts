import { NextRequest, NextResponse } from 'next/server'
import {
  buildStatusChangeEmail,
  buildDocumentReadyEmail,
  buildDeadlineReminderEmail,
} from '@/lib/email'

// GET /api/email-preview?type=status_change|document_ready|deadline_reminder
// Hanya untuk development — preview template HTML di browser
export async function GET(req: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Tidak tersedia di production' }, { status: 403 })
  }

  const type = new URL(req.url).searchParams.get('type') ?? 'status_change'
  const status = new URL(req.url).searchParams.get('status') ?? 'IN_TRANSIT'

  let html = ''

  if (type === 'status_change') {
    const result = buildStatusChangeEmail({
      clientName:  'Ahmad Wijaya (CV Wijaya Import)',
      clientEmail: 'ahmad@wijaya.co.id',
      referenceNo: 'FF-2024-001',
      newStatus:   status,
      orgName:     'PT Demo Freight Forwarder',
      orgEmail:    'ops@demoff.co.id',
      eta:         '15 Desember 2024',
      portalUrl:   'http://localhost:3000/portal/tracking/FF-2024-001',
      note:        status === 'CUSTOMS_PROCESSING'
        ? 'Dokumen PIB sudah diajukan, estimasi selesai 2 hari kerja.'
        : undefined,
    })
    html = result.html
  } else if (type === 'document_ready') {
    const result = buildDocumentReadyEmail({
      clientName:   'Dewi Kusuma (PT Kusuma Ekspor)',
      clientEmail:  'dewi@kusuma.co.id',
      referenceNo:  'FF-2024-002',
      documentName: 'Bill of Lading (B/L)',
      orgName:      'PT Demo Freight Forwarder',
      portalUrl:    'http://localhost:3000/portal/tracking/FF-2024-002',
    })
    html = result.html
  } else if (type === 'deadline_reminder') {
    const days = parseInt(new URL(req.url).searchParams.get('days') ?? '2')
    const result = buildDeadlineReminderEmail({
      clientName:   'Ahmad Wijaya (CV Wijaya Import)',
      clientEmail:  'ahmad@wijaya.co.id',
      referenceNo:  'FF-2024-001',
      deadlineType: 'customs',
      deadlineDate: '20 Desember 2024',
      daysLeft:     days,
      orgName:      'PT Demo Freight Forwarder',
    })
    html = result.html
  }

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}
