import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic()

type Ctx = { params: Promise<{ id: string }> }

// ─── Helper: hitung delay historis ───────────────────────────────────────────

function calcDelayDays(etd: Date | null, atd: Date | null, eta: Date | null, ata: Date | null): number | null {
  if (!eta) return null
  const actual = ata ?? new Date()
  return Math.round((actual.getTime() - eta.getTime()) / 86_400_000)
}

function modeLabel(mode: string) {
  return { SEA_FCL: 'Sea FCL', SEA_LCL: 'Sea LCL', AIR: 'Air Cargo', LAND: 'Darat' }[mode] ?? mode
}

// ─── GET — analyze or return cached prediction ────────────────────────────────

export async function GET(req: NextRequest, { params }: Ctx) {
  const { id } = await params
  const user   = await getCurrentUser()
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  const force = new URL(req.url).searchParams.get('force') === '1'

  // ── 1. Ambil data shipment target ────────────────────────────────────────────
  const shipment = await prisma.shipment.findFirst({
    where:   { id, organizationId: user.organizationId },
    include: {
      client:       { select: { name: true, companyName: true, country: true } },
      documents:    { select: { type: true, status: true, createdAt: true } },
      statusHistory:{ select: { fromStatus: true, toStatus: true, changedAt: true }, orderBy: { changedAt: 'asc' } },
    },
  })

  if (!shipment) return NextResponse.json({ success: false, error: 'Shipment tidak ditemukan' }, { status: 404 })

  // ── 2. Return cache jika masih fresh (6 jam) dan tidak force-refresh ─────────
  if (!force && shipment.delayPredictedAt && shipment.delayRiskScore !== null) {
    const ageHours = (Date.now() - new Date(shipment.delayPredictedAt).getTime()) / 3_600_000
    if (ageHours < 6) {
      return NextResponse.json({
        success: true,
        data: {
          score:        shipment.delayRiskScore,
          level:        shipment.delayRiskLevel,
          factors:      JSON.parse(shipment.delayRiskFactors ?? '[]'),
          summary:      shipment.delayRiskSummary,
          predictedAt:  shipment.delayPredictedAt,
          cached:       true,
          cacheAgeMin:  Math.round(ageHours * 60),
        },
      })
    }
  }

  // ── 3. Kumpulkan data historis dari org yang sama ─────────────────────────────
  const [historicalShipments, orgStats] = await Promise.all([

    // Shipment selesai untuk pola analisis
    prisma.shipment.findMany({
      where: {
        organizationId: user.organizationId,
        status:         { in: ['COMPLETED', 'DELIVERED', 'CANCELLED'] },
        eta:            { not: null },
        createdAt:      { gte: new Date(Date.now() - 365 * 86_400_000) }, // 1 tahun terakhir
      },
      select: {
        id: true, referenceNo: true, type: true, mode: true, status: true,
        originCountry: true, destinationCountry: true,
        originPort: true, destinationPort: true,
        etd: true, eta: true, atd: true, ata: true,
        grossWeight: true, packageCount: true,
        customsDeadline: true, customsDuty: true,
        createdAt: true,
        client: { select: { country: true } },
      },
      orderBy: { createdAt: 'desc' },
      take:    100,
    }),

    // Stats agregat per rute
    prisma.shipment.groupBy({
      by:     ['mode', 'destinationCountry'],
      where:  { organizationId: user.organizationId, status: { in: ['COMPLETED', 'DELIVERED'] }, eta: { not: null } },
      _count: { id: true },
    }),
  ])

  // ── 4. Hitung pola delay historis ────────────────────────────────────────────

  // Delay per shipment historis
  const withDelay = historicalShipments.map(s => ({
    ...s,
    delayDays: calcDelayDays(s.etd, s.atd, s.eta, s.ata),
    transitDays: s.etd && s.eta
      ? Math.round((new Date(s.eta).getTime() - new Date(s.etd).getTime()) / 86_400_000)
      : null,
  }))

  const delayed    = withDelay.filter(s => (s.delayDays ?? 0) > 0)
  const onTime     = withDelay.filter(s => (s.delayDays ?? 0) <= 0)
  const delayRate  = withDelay.length > 0 ? delayed.length / withDelay.length : 0

  // Delay per moda
  const delayByMode = ['SEA_FCL', 'SEA_LCL', 'AIR', 'LAND'].map(mode => {
    const group   = withDelay.filter(s => s.mode === mode)
    const delayed = group.filter(s => (s.delayDays ?? 0) > 0)
    const avgDelay = delayed.length > 0
      ? delayed.reduce((sum, s) => sum + (s.delayDays ?? 0), 0) / delayed.length
      : 0
    return { mode, total: group.length, delayed: delayed.length, avgDelay: Math.round(avgDelay) }
  }).filter(g => g.total > 0)

  // Delay per negara tujuan
  const countryMap = new Map<string, { total: number; delayed: number; totalDelay: number }>()
  for (const s of withDelay) {
    const key = s.destinationCountry ?? 'XX'
    const e   = countryMap.get(key) ?? { total: 0, delayed: 0, totalDelay: 0 }
    e.total++
    if ((s.delayDays ?? 0) > 0) { e.delayed++; e.totalDelay += s.delayDays ?? 0 }
    countryMap.set(key, e)
  }
  const delayByCountry = Array.from(countryMap.entries())
    .map(([country, d]) => ({
      country, total: d.total, delayed: d.delayed,
      rate: d.total > 0 ? d.delayed / d.total : 0,
      avgDelay: d.delayed > 0 ? Math.round(d.totalDelay / d.delayed) : 0,
    }))
    .filter(d => d.total >= 2)
    .sort((a, b) => b.rate - a.rate)

  // Shipment serupa (moda + destinasi yang sama)
  const similarShipments = withDelay.filter(s =>
    s.mode === shipment.mode &&
    s.destinationCountry === shipment.destinationCountry
  )

  // Dokumen readiness shipment ini
  const docsRequired = shipment.documents.filter(d => d.status !== 'APPROVED').length
  const docsTotal    = shipment.documents.length
  const docsPct      = docsTotal > 0 ? Math.round((shipment.documents.filter(d => d.status === 'APPROVED').length / docsTotal) * 100) : 0

  // Days until ETA
  const daysUntilEta = shipment.eta
    ? Math.round((new Date(shipment.eta).getTime() - Date.now()) / 86_400_000)
    : null

  // Current transit time vs historical average
  const currentTransitDays = shipment.etd && shipment.eta
    ? Math.round((new Date(shipment.eta).getTime() - new Date(shipment.etd).getTime()) / 86_400_000)
    : null

  const similarAvgTransit = similarShipments
    .filter(s => s.transitDays !== null)
    .reduce((sum, s, _, arr) => sum + (s.transitDays ?? 0) / arr.length, 0)

  // ── 5. Build konteks untuk Claude ─────────────────────────────────────────────

  const prompt = `Kamu adalah sistem AI analisis risiko untuk platform manajemen logistik ForwarderOS Indonesia. Tugasmu menganalisis risiko keterlambatan shipment berdasarkan data historis dan kondisi shipment saat ini.

## SHIPMENT YANG DIANALISIS

- Referensi: ${shipment.referenceNo}
- Tipe: ${shipment.type === 'EXPORT' ? 'Ekspor' : 'Impor'}
- Moda: ${modeLabel(shipment.mode)}
- Asal: ${[shipment.originCountry, shipment.originPort].filter(Boolean).join(' / ') || 'Tidak diketahui'}
- Tujuan: ${[shipment.destinationCountry, shipment.destinationPort].filter(Boolean).join(' / ') || 'Tidak diketahui'}
- Klien: ${shipment.client.companyName ?? shipment.client.name} (${shipment.client.country})
- Status saat ini: ${shipment.status}
- ETD: ${shipment.etd ? new Date(shipment.etd).toLocaleDateString('id-ID') : 'Belum diisi'}
- ETA: ${shipment.eta ? new Date(shipment.eta).toLocaleDateString('id-ID') : 'Belum diisi'}
- Hari sampai ETA: ${daysUntilEta !== null ? daysUntilEta + ' hari' : 'N/A'}
- Transit days (ETD→ETA): ${currentTransitDays !== null ? currentTransitDays + ' hari' : 'N/A'}
- Transit days rata-rata rute serupa: ${similarAvgTransit > 0 ? Math.round(similarAvgTransit) + ' hari' : 'Data tidak cukup'}
- Kargo: ${shipment.cargoDescription || 'Tidak ada deskripsi'} | Berat: ${shipment.grossWeight ? shipment.grossWeight + ' kg' : 'N/A'} | ${shipment.packageCount || '?'} koli
- HS Code: ${shipment.hsCode || 'Belum diisi'}
- Vessel: ${shipment.vesselName || 'Belum diisi'}
- Status vessel: ${shipment.vesselStatus || 'Tidak ada data tracking'}
- Kecepatan vessel: ${shipment.vesselSpeed !== null ? shipment.vesselSpeed + ' knots' : 'N/A'}
- Deadline bea cukai: ${shipment.customsDeadline ? new Date(shipment.customsDeadline).toLocaleDateString('id-ID') : 'Belum diisi'}

## DOKUMEN STATUS

- Total dokumen: ${docsTotal} | Disetujui: ${shipment.documents.filter(d => d.status === 'APPROVED').length} | Pending: ${docsRequired}
- Kelengkapan dokumen: ${docsPct}%
- Dokumen pending: ${shipment.documents.filter(d => d.status !== 'APPROVED').map(d => d.type).join(', ') || 'Tidak ada'}

## PERUBAHAN STATUS TERAKHIR

${shipment.statusHistory.slice(-5).map(h =>
  `- ${h.fromStatus || 'AWAL'} → ${h.toStatus} pada ${new Date(h.changedAt).toLocaleDateString('id-ID')}`
).join('\n') || '- Belum ada perubahan status'}

## DATA HISTORIS ORGANISASI (12 bulan terakhir)

Total shipment selesai dianalisis: ${withDelay.length}
- On-time: ${onTime.length} (${Math.round((1 - delayRate) * 100)}%)
- Terlambat: ${delayed.length} (${Math.round(delayRate * 100)}%)
- Rata-rata keterlambatan: ${delayed.length > 0 ? Math.round(delayed.reduce((s, d) => s + (d.delayDays ?? 0), 0) / delayed.length) : 0} hari

### Delay per moda:
${delayByMode.map(m => `- ${m.mode}: ${m.delayed}/${m.total} terlambat (${Math.round(m.delayed/m.total*100)}%), rata-rata ${m.avgDelay} hari`).join('\n') || 'Data tidak cukup'}

### Delay per negara tujuan (top):
${delayByCountry.slice(0, 5).map(c => `- ${c.country}: ${c.delayed}/${c.total} terlambat (${Math.round(c.rate*100)}%), avg ${c.avgDelay} hari`).join('\n') || 'Data tidak cukup'}

### Rute serupa (${modeLabel(shipment.mode)} → ${shipment.destinationCountry ?? '?'}):
${similarShipments.length > 0
  ? `- Total: ${similarShipments.length} shipment | Delay rate: ${Math.round(similarShipments.filter(s => (s.delayDays ?? 0) > 0).length / similarShipments.length * 100)}% | Avg delay: ${similarShipments.filter(s => (s.delayDays ?? 0) > 0).length > 0 ? Math.round(similarShipments.filter(s => (s.delayDays ?? 0) > 0).reduce((sum, s) => sum + (s.delayDays ?? 0), 0) / similarShipments.filter(s => (s.delayDays ?? 0) > 0).length) : 0} hari`
  : '- Belum ada data rute serupa'
}

## INSTRUKSI

Berdasarkan semua data di atas, lakukan analisis risiko keterlambatan dan berikan respons HANYA dalam format JSON berikut (tanpa markdown, tanpa penjelasan tambahan):

{
  "score": 45,
  "level": "medium",
  "summary": "Ringkasan 1-2 kalimat dalam bahasa Indonesia tentang kondisi risiko shipment ini",
  "factors": [
    {
      "category": "dokumen",
      "label": "Dokumen belum lengkap",
      "detail": "3 dari 7 dokumen masih pending approval, termasuk BL",
      "impact": "high",
      "actionable": true,
      "action": "Segera minta dokumen yang kurang dari agen/shipper"
    }
  ],
  "historicalContext": "1-2 kalimat tentang pola historis yang relevan",
  "recommendation": "Rekomendasi prioritas utama dalam 1 kalimat"
}

Aturan:
- score: 0-100 (0=tidak ada risiko, 100=hampir pasti terlambat)
- level: "low" (0-30), "medium" (31-60), "high" (61-80), "critical" (81-100)
- factors: 3-6 faktor paling signifikan, urutkan dari impact tertinggi
- category: "dokumen", "vessel", "bea_cukai", "rute", "pola_historis", "waktu", "kargo"
- impact: "high", "medium", "low"
- actionable: true jika ada tindakan yang bisa diambil sekarang
- action: saran konkret dalam bahasa Indonesia (null jika tidak actionable)
- Semua teks dalam bahasa Indonesia yang profesional
- Jangan mengarang data — hanya gunakan data yang tersedia di atas`

  // ── 6. Panggil Claude ─────────────────────────────────────────────────────────
  let result: any
  try {
    const message = await anthropic.messages.create({
      model:      'claude-sonnet-4-5',
      max_tokens: 1200,
      messages:   [{ role: 'user', content: prompt }],
    })

    const raw     = message.content[0].type === 'text' ? message.content[0].text : ''
    const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    result        = JSON.parse(cleaned)

    // Validasi minimal
    if (typeof result.score !== 'number' || !result.level || !Array.isArray(result.factors)) {
      throw new Error('Invalid response structure')
    }
  } catch (e: any) {
    console.error('[PREDICT-DELAY] Claude error:', e)
    return NextResponse.json({ success: false, error: 'Gagal menganalisis risiko' }, { status: 500 })
  }

  // ── 7. Simpan ke database ─────────────────────────────────────────────────────
  await prisma.shipment.update({
    where: { id },
    data: {
      delayRiskScore:   Math.max(0, Math.min(100, Math.round(result.score))),
      delayRiskLevel:   result.level,
      delayRiskFactors: JSON.stringify(result.factors),
      delayRiskSummary: result.summary,
      delayPredictedAt: new Date(),
    },
  })

  return NextResponse.json({
    success: true,
    data: {
      score:            result.score,
      level:            result.level,
      factors:          result.factors,
      summary:          result.summary,
      historicalContext: result.historicalContext,
      recommendation:   result.recommendation,
      predictedAt:      new Date(),
      cached:           false,
      meta: {
        totalHistorical:  withDelay.length,
        delayRate:        Math.round(delayRate * 100),
        similarShipments: similarShipments.length,
      },
    },
  })
}
