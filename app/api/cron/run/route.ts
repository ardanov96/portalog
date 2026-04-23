// app/api/cron/run/route.ts
// Proxy aman untuk menjalankan cron job dari dashboard
// CRON_SECRET tidak pernah terekspos ke browser

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'

export async function POST(req: NextRequest) {
  // Hanya OWNER yang boleh trigger manual
  const user = await getCurrentUser()
  if (!user)              return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (user.role !== 'OWNER') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { endpoint } = await req.json()

  // Whitelist endpoint yang boleh dipanggil
  const ALLOWED = [
    '/api/cron/deadline-reminder',
    '/api/cron/subscription-check',
    '/api/cron/cleanup',
  ]
  if (!ALLOWED.includes(endpoint)) {
    return NextResponse.json({ error: 'Endpoint tidak diizinkan' }, { status: 400 })
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  const res = await fetch(`${baseUrl}${endpoint}`, {
    method:  'GET',
    headers: {
      Authorization: `Bearer ${process.env.CRON_SECRET}`,
    },
  })

  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}
