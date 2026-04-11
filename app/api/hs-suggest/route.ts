import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  const { description, shipmentType } = await req.json()

  if (!description || description.trim().length < 5) {
    return NextResponse.json({ success: false, error: 'Deskripsi kargo terlalu singkat' }, { status: 400 })
  }

  const prompt = `Kamu adalah ahli bea cukai Indonesia dengan keahlian dalam Harmonized System (HS) Code / BTKI (Buku Tarif Kepabeanan Indonesia).

Berdasarkan deskripsi kargo berikut, berikan 3-5 rekomendasi HS Code yang paling relevan:

Deskripsi kargo: "${description.trim()}"
Jenis pengiriman: ${shipmentType === 'IMPORT' ? 'Impor ke Indonesia' : 'Ekspor dari Indonesia'}

Berikan respons HANYA dalam format JSON berikut (tanpa penjelasan lain, tanpa markdown):
{
  "suggestions": [
    {
      "code": "8445.11.00",
      "description": "Mesin untuk mempersiapkan serat tekstil",
      "confidence": "high",
      "tariff_rate": "0%",
      "notes": "Berlaku untuk mesin pemintal benang",
      "category": "Mesin & Peralatan Tekstil"
    }
  ],
  "summary": "Kargo berupa mesin tekstil dan spare parts masuk kategori Chapter 84 (Reaktor nuklir, ketel uap, mesin)",
  "warning": null
}

Confidence: "high" (sangat yakin), "medium" (cukup yakin), "low" (perlu konfirmasi manual).
Tariff_rate: estimasi BM berdasarkan BTKI, gunakan "varies" jika bervariasi.
Warning: isi jika ada potensi lartas (larangan terbatas), null jika tidak ada.
Berikan kode lengkap dalam format X.X.XX.XX (8 digit sesuai BTKI Indonesia).`

  try {
    const message = await client.messages.create({
      model:      'claude-opus-4-5',
      max_tokens: 1024,
      messages:   [{ role: 'user', content: prompt }],
    })

    const raw = message.content[0].type === 'text' ? message.content[0].text : ''
    const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    const parsed  = JSON.parse(cleaned)

    return NextResponse.json({ success: true, data: parsed })
  } catch (err: any) {
    console.error('[HS-SUGGEST]', err)
    if (err instanceof SyntaxError) {
      return NextResponse.json({ success: false, error: 'Gagal memparse respons AI' }, { status: 500 })
    }
    return NextResponse.json({ success: false, error: 'Gagal menghubungi AI' }, { status: 500 })
  }
}
