import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

// Tipe dokumen yang didukung
const SUPPORTED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf']
const MAX_SIZE_MB     = 10

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  try {
    const formData = await req.formData()
    const file     = formData.get('file') as File | null
    const docType  = (formData.get('docType') as string) || 'auto'

    if (!file) {
      return NextResponse.json({ success: false, error: 'File tidak ditemukan' }, { status: 400 })
    }

    if (!SUPPORTED_TYPES.includes(file.type)) {
      return NextResponse.json({
        success: false,
        error:   'Format tidak didukung. Gunakan JPG, PNG, WebP, atau PDF.',
      }, { status: 400 })
    }

    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      return NextResponse.json({
        success: false,
        error:   `Ukuran file maksimal ${MAX_SIZE_MB}MB`,
      }, { status: 400 })
    }

    // Convert file ke base64
    const arrayBuffer = await file.arrayBuffer()
    const base64      = Buffer.from(arrayBuffer).toString('base64')
    const mediaType   = file.type as 'image/jpeg' | 'image/png' | 'image/webp' | 'application/pdf'

    const prompt = buildPrompt(docType)

    const message = await client.messages.create({
      model:      'claude-opus-4-5',
      max_tokens: 1500,
      messages: [
        {
          role:    'user',
          content: mediaType === 'application/pdf'
            ? [
                {
                  type:   'document' as const,
                  source: {
                    type:       'base64'          as const,
                    media_type: 'application/pdf' as const,
                    data:        base64,
                  },
                },
                { type: 'text' as const, text: prompt },
              ]
            : [
                {
                  type:   'image' as const,
                  source: {
                    type:       'base64' as const,
                    media_type: mediaType as 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif',
                    data:        base64,
                  },
                },
                { type: 'text' as const, text: prompt },
              ],
        },
      ],
    })

    const raw     = message.content[0].type === 'text' ? message.content[0].text : ''
    const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()

    let extracted: ExtractedData
    try {
      extracted = JSON.parse(cleaned)
    } catch {
      return NextResponse.json({
        success: false,
        error:   'Gagal membaca dokumen. Pastikan gambar jelas dan tidak terpotong.',
      }, { status: 422 })
    }

    // Normalize dates ke YYYY-MM-DD format untuk input[type=date]
    extracted = normalizeDates(extracted)

    return NextResponse.json({
      success: true,
      data:    extracted,
    })
  } catch (err: any) {
    console.error('[OCR]', err)

    if (err.status === 400 && err.message?.includes('image')) {
      return NextResponse.json({
        success: false,
        error:   'Gambar tidak dapat dibaca. Pastikan file tidak rusak dan cukup jelas.',
      }, { status: 400 })
    }

    return NextResponse.json({
      success: false,
      error:   'Gagal memproses dokumen. Coba lagi atau isi manual.',
    }, { status: 500 })
  }
}

// ─── Extracted data type ──────────────────────────────────────────────────────

export interface ExtractedData {
  docType:            string   // Jenis dokumen yang terdeteksi
  confidence:         'high' | 'medium' | 'low'

  // Kargo
  cargoDescription?:  string
  grossWeight?:       string
  packageCount?:      string
  hsCode?:            string

  // Rute
  originPort?:        string
  originCountry?:     string
  destinationPort?:   string
  destinationCountry?: string

  // Vessel & jadwal
  vesselName?:        string
  voyageNo?:          string
  etd?:               string   // YYYY-MM-DD
  eta?:               string   // YYYY-MM-DD

  // Bea cukai
  pibNo?:             string
  pebNo?:             string

  // Invoice info
  invoiceNo?:         string
  invoiceDate?:       string

  // Shipper / consignee (untuk saran klien)
  shipperName?:       string
  consigneeName?:     string

  // Catatan dari AI
  notes?:             string
  warnings?:          string[]
}

// ─── Prompt builder ───────────────────────────────────────────────────────────

function buildPrompt(docType: string): string {
  const docHint = docType !== 'auto'
    ? `Dokumen yang diupload adalah: ${docType}.`
    : 'Deteksi otomatis jenis dokumen (Bill of Lading, Airway Bill, Commercial Invoice, Packing List, PIB, PEB, atau lainnya).'

  return `Kamu adalah sistem OCR khusus untuk dokumen freight forwarding Indonesia.

${docHint}

Ekstrak semua informasi relevan dari dokumen ini dan kembalikan HANYA dalam format JSON berikut (tanpa teks lain, tanpa markdown):

{
  "docType": "Jenis dokumen yang terdeteksi (BILL_OF_LADING | AIRWAY_BILL | COMMERCIAL_INVOICE | PACKING_LIST | PIB | PEB | LAINNYA)",
  "confidence": "high | medium | low",

  "cargoDescription": "Deskripsi barang/kargo",
  "grossWeight": "Berat bruto dalam kg (angka saja, tanpa satuan)",
  "packageCount": "Jumlah koli/packages (angka saja)",
  "hsCode": "HS Code jika ada (format: xxxx.xx.xx)",

  "originPort": "Pelabuhan/bandara asal (nama kota/kode)",
  "originCountry": "Kode negara asal 2 huruf (ID, CN, SG, dll)",
  "destinationPort": "Pelabuhan/bandara tujuan",
  "destinationCountry": "Kode negara tujuan 2 huruf",

  "vesselName": "Nama kapal atau nomor penerbangan",
  "voyageNo": "Nomor voyage atau flight",
  "etd": "Tanggal keberangkatan format YYYY-MM-DD",
  "eta": "Tanggal kedatangan format YYYY-MM-DD",

  "pibNo": "Nomor PIB jika ada",
  "pebNo": "Nomor PEB jika ada",
  "invoiceNo": "Nomor invoice jika ada",
  "invoiceDate": "Tanggal invoice format YYYY-MM-DD",

  "shipperName": "Nama shipper/pengirim",
  "consigneeName": "Nama consignee/penerima",

  "notes": "Informasi penting lain yang perlu diketahui",
  "warnings": ["Array peringatan jika ada info yang tidak jelas atau ambigu"]
}

Aturan penting:
- Isi null untuk field yang tidak ditemukan, JANGAN mengisi dengan perkiraan
- Berat: konversi ke kg jika dalam satuan lain (1 ton = 1000 kg)
- Tanggal: selalu format YYYY-MM-DD, konversi dari format apapun
- HS Code: format standar dengan titik (e.g., 8471.30.10)
- Kode negara: 2 huruf ISO (ID=Indonesia, CN=China, SG=Singapore, MY=Malaysia, AU=Australia, JP=Japan, US=Amerika, dll)
- Jika tulisan tidak jelas atau gambar buram, set confidence ke "low" dan tambahkan ke warnings
- Jangan mengarang data yang tidak ada di dokumen`
}

// ─── Normalize dates ──────────────────────────────────────────────────────────

function normalizeDates(data: ExtractedData): ExtractedData {
  const dateFields: (keyof ExtractedData)[] = ['etd', 'eta', 'invoiceDate']

  const result = { ...data }
  for (const field of dateFields) {
    const val = result[field] as string | undefined
    if (!val || val === 'null') {
      (result as any)[field] = undefined
      continue
    }
    // Validate YYYY-MM-DD format
    const match = val.match(/^(\d{4})-(\d{2})-(\d{2})$/)
    if (!match) {
      // Coba parse
      try {
        const d = new Date(val)
        if (!isNaN(d.getTime())) {
          (result as any)[field] = d.toISOString().split('T')[0]
        } else {
          (result as any)[field] = undefined
        }
      } catch {
        (result as any)[field] = undefined
      }
    }
  }

  return result
}
