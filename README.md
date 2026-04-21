# Portalog

Platform manajemen operasional untuk Freight Forwarder & PPJK Indonesia — dibangun di atas Next.js 15, PostgreSQL, dan Prisma. Mencakup manajemen shipment end-to-end, portal klien white-label, AI delay prediction, referral program, dan public REST API untuk integrasi ERP.

---

## Daftar Isi

- [Tech Stack](#tech-stack)
- [Fitur](#fitur)
- [Setup Lokal](#setup-lokal)
- [Environment Variables](#environment-variables)
- [Struktur Project](#struktur-project)
- [API Reference](#api-reference)
- [Database Commands](#database-commands)
- [Deploy ke Vercel](#deploy-ke-vercel)
- [Cara Kerja White-label](#cara-kerja-white-label)
- [Cara Kerja Referral](#cara-kerja-referral)
- [Catatan Pengembangan](#catatan-pengembangan)
- [Roadmap](#roadmap)

---

## Tech Stack

| Layer | Teknologi |
|---|---|
| Framework | Next.js 15 (App Router, Server Components) |
| Database | PostgreSQL + Prisma ORM v5 |
| Auth | JWT custom via `jose`, HTTP-only cookie |
| Styling | Tailwind CSS |
| Forms | react-hook-form + Zod |
| Storage | Cloudflare R2 → Vercel Blob → local fallback |
| Email | Resend (3.000 email/bulan gratis) |
| WhatsApp | Fonnte API |
| AI | Anthropic Claude API (`claude-sonnet-4-5`) |
| Billing | Midtrans Snap |
| Rate Limiting | Upstash Redis + in-memory fallback |
| Monitoring | Sentry (opsional) |
| Deploy | Vercel (serverless) |

---

## Fitur

### Core — Manajemen Shipment

- **Shipment CRUD** — buat, edit, hapus, list dengan filter & paginasi. Form wizard 5-langkah untuk shipment baru.
- **Status tracking** — 10 status (DRAFT → COMPLETED) dengan history log setiap perubahan.
- **Timeline visual** — riwayat perubahan status dengan catatan per langkah.
- **Manajemen dokumen** — upload BL, AWB, Commercial Invoice, Packing List, COO, PIB/PEB, dll. Approval workflow per dokumen.
- **Vessel tracking** — tracking posisi kapal real-time via VesselFinder/MarineTraffic. Mode simulasi otomatis jika API key tidak diisi.
- **INSW lookup** — simpan nomor aju PIB/PEB 26-digit, validasi format, buka portal INSW dengan satu klik.
- **HS Code AI suggest** — input deskripsi kargo, Claude merekomendasikan 3–5 kode HS dengan tarif dan catatan lartas.
- **OCR dokumen** — scan BL/dokumen via Claude Vision, ekstrak data secara otomatis.
- **AI delay prediction** — analisis pola historis 100 shipment terakhir + kondisi shipment saat ini → risk score 0–100, faktor risiko, dan rekomendasi tindakan. Cache 6 jam.
- **Command palette** — Cmd+K untuk search shipment, klien, dokumen, dan navigasi halaman.

### Klien & Portal

- **Manajemen klien** — CRUD klien/buyer dengan informasi lengkap.
- **Client portal** — klien bisa login dan lacak status shipment mereka secara real-time.
- **AI chatbot portal** — chatbot Claude di portal klien yang menjawab pertanyaan tentang shipment (streaming).
- **Dokumen visibility** — kontrol dokumen mana yang terlihat oleh klien.

### Keuangan & Laporan

- **Invoice PDF** — generate invoice dengan kop surat dan breakdown biaya freight/lokal/bea cukai.
- **Laporan analytics** — chart pendapatan bulanan, status breakdown, klien terbesar.
- **Export Excel** — laporan 4 sheet: Ringkasan, Daftar Shipment, Revenue per Klien, Revenue Bulanan.
- **Dashboard eksportir** — mode khusus dengan breakdown per buyer dan negara tujuan.

### Growth & Monetisasi

- **Referral program** — kode unik `FOS-XXXX-XXXX` per organisasi. Referrer dapat 1 bulan gratis per konversi, yang dirujuk dapat 14 hari bonus trial. Dashboard tracking status referral (PENDING → QUALIFIED → REWARDED).
- **Subscription billing** — paket STARTER/GROWTH/ENTERPRISE via Midtrans Snap. Trial 14 hari, cancel kapan saja.
- **White-label portal** — FF besar bisa punya portal klien dengan custom domain, logo, warna, dan font sendiri. Verifikasi domain via DNS TXT record. Feature flags per portal (chatbot, dokumen, timeline, powered-by).
- **API key management** — buat hingga 10 API key per organisasi dengan scope granular. Rotate key, usage tracking bulanan, rate limit per plan.

### Integrasi & Infrastruktur

- **Public REST API v1** — endpoint `/api/v1/shipments`, `/api/v1/clients`, `/api/v1/analytics`. Autentikasi Bearer token, rate limit per plan, response format konsisten.
- **Cron jobs** — deadline reminder (08:00 WIB), subscription check (07:00 WIB), cleanup mingguan via Vercel Cron.
- **PWA** — installable sebagai app di mobile, offline page, shortcuts.
- **Rate limiting** — Upstash Redis sliding window; fallback in-memory jika Redis tidak dikonfigurasi.
- **Multi-dashboard mode** — switch antara mode FORWARDER, EXPORTER, dan IMPORTER.
- **Staff management** — invite staff via email dengan token expiry, role OWNER/STAFF.

---

## Setup Lokal

### 1. Clone & install

```bash
git clone https://github.com/USERNAME/forwarder-saas.git
cd forwarder-saas
npm install
```

### 2. Buat file `.env`

```bash
cp .env.example .env
```

Minimal yang wajib diisi untuk development lokal:

```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/db_portalog"
AUTH_SECRET="isi-dengan-random-string-minimal-32-karakter"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

Generate `AUTH_SECRET`:
```bash
openssl rand -base64 32
```

### 3. Setup database

```bash
npx prisma generate    # generate Prisma client
npx prisma db push     # sync schema ke database
npm run db:seed        # isi data demo (opsional)
```

### 4. Jalankan development server

```bash
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000)

### Demo Login (setelah seed)

| Role | Email | Password |
|---|---|---|
| Owner | owner@demoff.co.id | password123 |
| Staff | staff@demoff.co.id | password123 |

---

## Environment Variables

Variabel dengan keterangan **wajib** harus diisi. Sisanya opsional — fitur terkait dinonaktifkan otomatis jika kosong.

```env
# ─── Wajib ───────────────────────────────────────────────────────────────────
DATABASE_URL="postgresql://user:pass@host:5432/dbname"   # wajib
AUTH_SECRET="random-string-32-char-minimum"              # wajib, openssl rand -base64 32
NEXT_PUBLIC_APP_URL="https://yourdomain.com"             # wajib

# ─── Email via Resend (gratis 3.000/bulan, tanpa kartu kredit) ───────────────
RESEND_API_KEY="re_..."
EMAIL_FROM="onboarding@resend.dev"

# ─── WhatsApp via Fonnte ──────────────────────────────────────────────────────
FONNTE_API_KEY="..."
FONNTE_SENDER_PHONE="628xxxxxxxxxx"

# ─── Anthropic Claude AI ──────────────────────────────────────────────────────
# Untuk: HS Code suggest, OCR, delay prediction, chatbot portal
# Tanpa ini: fitur AI mengembalikan 503, app tetap jalan
ANTHROPIC_API_KEY="sk-ant-..."

# ─── Storage (pilih salah satu) ───────────────────────────────────────────────
# Opsi 1: Cloudflare R2
STORAGE_ENDPOINT="https://<account-id>.r2.cloudflarestorage.com"
STORAGE_ACCESS_KEY=""
STORAGE_SECRET_KEY=""
STORAGE_BUCKET="forwarder-docs"
STORAGE_PUBLIC_URL=""

# Opsi 2: Vercel Blob (gratis 1GB, setup di Vercel Dashboard → Storage → Blob)
BLOB_READ_WRITE_TOKEN="vercel_blob_..."

# Tanpa keduanya: file disimpan lokal di /public/uploads (dev only)

# ─── Billing via Midtrans ─────────────────────────────────────────────────────
# Sandbox gratis di sandbox.midtrans.com (tanpa kartu kredit)
MIDTRANS_SERVER_KEY="SB-Mid-server-..."
NEXT_PUBLIC_MIDTRANS_CLIENT_KEY="SB-Mid-client-..."
NEXT_PUBLIC_MIDTRANS_IS_PRODUCTION="false"

# ─── Rate Limiting via Upstash Redis (opsional) ───────────────────────────────
# Tanpa ini: pakai in-memory fallback (tidak persistent, cukup untuk dev)
UPSTASH_REDIS_REST_URL="https://xxx.upstash.io"
UPSTASH_REDIS_REST_TOKEN="..."

# ─── Cron Jobs ────────────────────────────────────────────────────────────────
CRON_SECRET="random-hex-string"   # openssl rand -hex 32

# ─── Vessel Tracking (opsional, ada mode simulasi) ────────────────────────────
VESSEL_FINDER_API_KEY=""
MARINE_TRAFFIC_API_KEY=""

# ─── Sentry (opsional, dinonaktifkan otomatis jika kosong) ───────────────────
NEXT_PUBLIC_SENTRY_DSN=""
SENTRY_AUTH_TOKEN=""
SENTRY_ORG=""
SENTRY_PROJECT="portalog"
```

---

## Struktur Project

```
forwarder-saas/
├── app/
│   ├── (auth)/                    # Login & register
│   ├── (dashboard)/               # Semua halaman setelah login
│   │   ├── dashboard/             # Dashboard utama (auto-redirect by mode)
│   │   ├── dashboard-exporter/    # Mode eksportir
│   │   ├── shipments/             # List + detail + edit
│   │   ├── clients/
│   │   ├── documents/
│   │   ├── invoices/
│   │   ├── laporan/               # Analytics + export Excel
│   │   ├── billing/               # Subscription & history
│   │   ├── referral/              # Referral program
│   │   ├── white-label/           # Custom domain & branding
│   │   ├── api-keys/              # API key management + docs
│   │   ├── onboarding/
│   │   └── settings/
│   ├── (portal)/                  # Client portal default
│   ├── (wl-portal)/               # White-label portal (custom domain)
│   └── api/
│       ├── auth/                  # login, register, logout, me
│       ├── shipments/             # CRUD + predict-delay + track
│       ├── clients/
│       ├── documents/ + upload/
│       ├── dashboard/ + analytics/
│       ├── invoices/ + laporan/ + export/
│       ├── billing/               # checkout, webhook, portal
│       ├── portal/                # client portal auth & tracking
│       ├── hs-suggest/ + ocr/     # AI endpoints
│       ├── search/                # Command palette
│       ├── referral/              # + [code]/, claim/, invite/
│       ├── white-label/           # + verify-domain/
│       ├── api-keys/              # + [id]/, [id]/rotate/
│       ├── v1/                    # Public REST API
│       │   ├── shipments/         # + [id]/
│       │   ├── clients/
│       │   └── analytics/
│       ├── cron/                  # deadline-reminder, subscription-check, cleanup
│       └── health/
├── components/
│   ├── layout/                    # Sidebar, TopBar
│   ├── forms/                     # LoginForm, RegisterForm
│   ├── shipments/                 # ShipmentForm, ShipmentTable, VesselTracker,
│   │                              # HsCodeSuggestor, DocumentScanner, INSWLookup,
│   │                              # DelayPredictor
│   ├── portal/                    # PortalChatbot
│   ├── search/                    # CommandPalette
│   ├── laporan/                   # ExportButton
│   └── pwa/                       # PWAProvider
├── lib/
│   ├── auth.ts                    # JWT session helpers
│   ├── prisma.ts
│   ├── utils.ts
│   ├── billing.ts                 # Plan definitions + Midtrans
│   ├── storage.ts                 # R2 → Vercel Blob → local
│   ├── email.ts                   # Resend wrapper
│   ├── whatsapp.ts                # Fonnte wrapper
│   ├── rate-limit.ts              # Upstash + in-memory fallback
│   ├── cron.ts
│   ├── vessel-tracking.ts
│   ├── referral.ts                # Code gen, claim, qualify, reward
│   ├── white-label.ts             # Domain resolver, branding, DNS verify
│   └── api-auth.ts                # API key auth, scope, rate limit
├── prisma/
│   ├── schema.prisma
│   └── seed.ts
├── public/
│   ├── manifest.json              # PWA
│   └── sw.js                      # Service worker
├── middleware.ts                  # Auth + white-label domain routing
└── vercel.json                    # Cron schedules
```

---

## API Reference

### Autentikasi Internal (Cookie)

| Method | Endpoint | Deskripsi |
|---|---|---|
| POST | `/api/auth/login` | Login, set HTTP-only cookie |
| POST | `/api/auth/register` | Daftar + opsional `referralCode` |
| POST | `/api/auth/logout` | Hapus session |
| GET | `/api/auth/me` | Data user & org aktif |

### Public REST API v1 (Bearer Token)

```
Authorization: Bearer fos_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

| Method | Endpoint | Scope | Deskripsi |
|---|---|---|---|
| GET | `/api/v1/shipments` | `shipments:read` | List + filter + paginasi |
| POST | `/api/v1/shipments` | `shipments:write` | Buat shipment baru |
| GET | `/api/v1/shipments/:id` | `shipments:read` | Detail + dokumen + timeline |
| PATCH | `/api/v1/shipments/:id` | `shipments:write` | Update status/ETA/biaya |
| DELETE | `/api/v1/shipments/:id` | `shipments:write` | Hapus (hanya DRAFT) |
| GET | `/api/v1/clients` | `clients:read` | List klien |
| POST | `/api/v1/clients` | `clients:write` | Tambah klien |
| GET | `/api/v1/analytics` | `analytics:read` | Stats per tahun |

**Query parameters shipment:** `?status=IN_TRANSIT&type=EXPORT&mode=SEA_FCL&client_id=xxx&q=keyword&since=2025-01-01T00:00:00Z&page=1&limit=20`

**Rate limits per paket:**

| Paket | Per menit | Per bulan |
|---|---|---|
| STARTER | 30 | 10.000 |
| GROWTH | 60 | 50.000 |
| ENTERPRISE | 300 | 500.000 |

**Format error:**
```json
{
  "success": false,
  "error": { "code": "RATE_LIMIT_EXCEEDED", "message": "..." },
  "docs": "https://portalog.id/docs/api"
}
```

---

## Database Commands

```bash
npx prisma generate      # wajib setelah setiap perubahan schema.prisma
npx prisma db push       # sync schema ke DB (development)
npx prisma migrate dev   # buat migration file (production-ready)
npx prisma migrate deploy # apply migration di production
npx prisma studio        # GUI database
npm run db:seed          # isi data demo
```

> **Penting:** Setiap kali `schema.prisma` berubah, jalankan `prisma generate` sebelum `npm run build`. Tanpa ini TypeScript akan error karena Prisma client tidak up-to-date.

---

## Deploy ke Vercel

### 1. Push ke GitHub dan import di Vercel

Buka [vercel.com](https://vercel.com) → New Project → Import repository.

### 2. Set environment variables

Di Vercel Dashboard → Settings → Environment Variables. Minimal wajib: `DATABASE_URL`, `AUTH_SECRET`, `NEXT_PUBLIC_APP_URL`.

### 3. Setup Vercel Blob

Vercel Dashboard → Storage → Create Database → Blob. Token `BLOB_READ_WRITE_TOKEN` otomatis ditambahkan ke project.

### 4. Cron jobs

`vercel.json` sudah dikonfigurasi:

```json
{
  "crons": [
    { "path": "/api/cron/deadline-reminder",  "schedule": "0 1 * * *" },
    { "path": "/api/cron/subscription-check", "schedule": "0 0 * * *" },
    { "path": "/api/cron/cleanup",            "schedule": "0 2 * * 0" }
  ]
}
```

Set `CRON_SECRET` di environment variables Vercel.

### 5. Sync database production

```bash
DATABASE_URL="postgres://..." npx prisma migrate deploy
```

### 6. Custom domain untuk white-label

Setiap FF yang mengaktifkan white-label perlu domain mereka ditambahkan di Vercel Dashboard → Domains. Middleware otomatis me-route ke portal yang tepat.

---

## Cara Kerja White-label

Semua FF berjalan di satu deployment Vercel. Tidak perlu deployment terpisah per FF.

1. FF input custom domain di Settings → White-label (misal `portal.majulogistik.co.id`).
2. Middleware mendeteksi hostname bukan domain Portalog utama → rewrite ke `/wl-portal` dengan header `X-WL-Domain`.
3. Server component query database untuk branding config org tersebut.
4. Portal dirender dengan CSS variables dari config: warna, font, logo, teks.
5. In-memory cache 5 menit mencegah query database per request.

**DNS yang perlu dikonfigurasi FF:**
```
CNAME  portal  →  cname.vercel-dns.com
TXT    @       →  fos-verify-xxxxxxxxxxxxxxxx
```

---

## Cara Kerja Referral

1. Setiap org mendapat kode unik `FOSXXX-X` (auto-generate dari slug nama org).
2. Share via link: `https://portalog.id/register?ref=FOS-XXXX-XXXX` — kode terisi otomatis di form register.
3. Org baru yang daftar dengan kode mendapat 14 hari bonus trial (total 28 hari).
4. Saat org tersebut pertama kali bayar subscription, Midtrans webhook memanggil `qualifyReferral()` otomatis.
5. Referrer mendapat kredit 1 bulan di dashboard Referral.
6. Klaim: satu klik → `currentPeriodEnd` diperpanjang tanpa proses pembayaran baru.

---

## Catatan Pengembangan

### Menambah fitur AI

```ts
import Anthropic from '@anthropic-ai/sdk'

// Guard dulu
if (!process.env.ANTHROPIC_API_KEY) {
  return NextResponse.json({ success: false, error: 'Fitur AI tidak aktif' }, { status: 503 })
}

const client = new Anthropic()
const message = await client.messages.create({
  model: 'claude-sonnet-4-5',
  max_tokens: 1024,
  messages: [{ role: 'user', content: prompt }],
})
```

### Menambah scope API key baru

1. Tambah nilai ke `enum ApiKeyScope` di `schema.prisma`.
2. `npx prisma generate && npx prisma db push`.
3. Tambah mapping di `SCOPE_MAP` di `lib/api-auth.ts`.
4. Pakai `authenticateApiKey(req, 'new:scope')` di endpoint.

### Menambah cron job baru

1. Buat `app/api/cron/nama-job/route.ts` dengan verifikasi `CRON_SECRET`.
2. Tambah ke `vercel.json`: `{ "path": "/api/cron/nama-job", "schedule": "0 3 * * *" }`.

---

## Roadmap

### Selesai ✓

- [x] Auth + JWT session + middleware
- [x] Shipment CRUD + form wizard + timeline + edit
- [x] Klien CRUD + portal klien tracking
- [x] Manajemen dokumen + upload + approval workflow
- [x] Notifikasi WhatsApp (Fonnte) + email (Resend)
- [x] Invoice PDF + laporan analytics
- [x] Onboarding checklist
- [x] AI HS Code suggest (Claude)
- [x] AI OCR dokumen (Claude Vision)
- [x] Staff invite via email
- [x] Rate limiting (Upstash Redis + fallback)
- [x] Sentry error monitoring (opsional)
- [x] Subscription billing (Midtrans Snap)
- [x] Cron jobs (Vercel Cron)
- [x] PWA (installable, offline page, shortcuts)
- [x] Dashboard mode eksportir + importir
- [x] Export laporan Excel (4 sheet)
- [x] Command palette (Cmd+K)
- [x] Vessel tracking real-time + simulasi fallback
- [x] INSW PIB/PEB lookup
- [x] AI delay prediction (risk score + faktor + cache 6 jam)
- [x] Referral program (code gen, tracking, reward, email invite)
- [x] White-label portal (custom domain, branding, DNS verify, feature flags)
- [x] API key management (CRUD, rotate, scope granular, usage tracking)
- [x] Public REST API v1 (shipments, clients, analytics)

### Berikutnya

- [ ] Buyer tracking link — URL unik per shipment untuk buyer asing tanpa perlu login
- [ ] Commercial Invoice & Packing List generator dari data shipment
- [ ] Multi-role mitra FF — FF eksternal bisa update status shipment tertentu
- [ ] Marketplace rate shipping — pencarian dan perbandingan tarif antar FF
- [ ] Notifikasi push browser (web push via service worker)
