# PortalogOS

Sistem manajemen operasional untuk Freight Forwarder & PPJK — dibangun dengan Next.js 15, Prisma, dan PostgreSQL.

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Database**: PostgreSQL + Prisma ORM
- **Auth**: JWT custom (jose) via HTTP-only cookie
- **Styling**: Tailwind CSS
- **Validation**: Zod
- **Language**: TypeScript

---

## Setup Lokal

### 1. Clone & install

```bash
git clone https://github.com/ardanov96/portalog.git
cd portalog
npm install
```

### 2. Buat file .env

```bash
cp .env.example .env
```

Edit `.env` sesuai konfigurasi PostgreSQL lokal anda:

```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/forwarder_saas"
AUTH_SECRET="isi-dengan-random-string-minimal-32-karakter"
```

Generate `AUTH_SECRET` yang aman:
```bash
openssl rand -base64 32
```

### 3. Setup database

Pastikan PostgreSQL sudah berjalan, lalu:

```bash
# Buat database & jalankan migration
npm run db:push

# Generate Prisma client
npm run db:generate

# Isi data awal (demo user, shipment, dokumen)
npm run db:seed
```

### 4. Jalankan development server

```bash
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000)

---

## Demo Login

Setelah seed berhasil:

| Role  | Email                  | Password    |
|-------|------------------------|-------------|
| Owner | owner@demoff.co.id     | password123 |
| Staff | staff@demoff.co.id     | password123 |

---

## Struktur Project V.1

```
portalog/
├── app/
│   ├── (auth)/               # Halaman login & register
│   │   ├── login/
│   │   └── register/
│   ├── (dashboard)/          # Halaman setelah login
│   │   ├── dashboard/        # Dashboard utama
│   │   ├── shipments/        # Manajemen shipment
│   │   ├── clients/          # Manajemen klien
│   │   ├── documents/        # Manajemen dokumen
│   │   └── settings/         # Pengaturan
│   └── api/                  # API Routes
│       ├── auth/             # login, register, logout, me
│       ├── shipments/        # CRUD shipment
│       ├── clients/          # CRUD klien
│       └── dashboard/        # Stats endpoint
├── components/
│   ├── layout/               # Sidebar, TopBar
│   └── forms/                # LoginForm, RegisterForm
├── lib/
│   ├── auth.ts               # Session & JWT helpers
│   ├── prisma.ts             # Prisma singleton
│   └── utils.ts              # Helper functions
├── prisma/
│   ├── schema.prisma         # Data model
│   └── seed.ts               # Data awal
├── types/
│   └── index.ts              # TypeScript types
└── middleware.ts             # Route protection
```

---

## API Endpoints

### Auth
| Method | Endpoint              | Deskripsi           |
|--------|-----------------------|---------------------|
| POST   | `/api/auth/login`     | Login, set cookie   |
| POST   | `/api/auth/register`  | Daftar akun baru    |
| POST   | `/api/auth/logout`    | Hapus session       |
| GET    | `/api/auth/me`        | Data user aktif     |

### Shipments
| Method | Endpoint                | Deskripsi              |
|--------|-------------------------|------------------------|
| GET    | `/api/shipments`        | List shipment          |
| POST   | `/api/shipments`        | Buat shipment baru     |
| GET    | `/api/shipments/:id`    | Detail shipment        |
| PATCH  | `/api/shipments/:id`    | Update/ubah status     |
| DELETE | `/api/shipments/:id`    | Hapus shipment (Owner) |

### Clients
| Method | Endpoint        | Deskripsi         |
|--------|-----------------|-------------------|
| GET    | `/api/clients`  | List klien        |
| POST   | `/api/clients`  | Tambah klien      |

### Dashboard
| Method | Endpoint         | Deskripsi        |
|--------|------------------|------------------|
| GET    | `/api/dashboard` | Stats & ringkasan|

---

## Database Commands

```bash
npm run db:push      # Sync schema ke DB (development)
npm run db:migrate   # Buat migration file (production-ready)
npm run db:generate  # Generate Prisma client setelah schema berubah
npm run db:studio    # Buka Prisma Studio (GUI database)
npm run db:seed      # Isi data demo
```

---

## Deploy ke Production

### Vercel (Rekomendasi)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set environment variables di Vercel dashboard:
# DATABASE_URL, AUTH_SECRET, NEXT_PUBLIC_APP_URL
```

Setelah deploy, jalankan migration di production:
```bash
npx prisma migrate deploy
```

### VPS / Railway

```bash
npm run build
npm run start
# atau dengan PM2:
pm2 start npm --name "forwarder-os" -- start
```
