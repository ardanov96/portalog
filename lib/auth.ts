import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import { cache } from 'react'
import { prisma } from './prisma'
import type { CurrentUser } from './types'

export const COOKIE_NAME = 'ff_session'  // ✅ export agar bisa dipakai di route lain

function secret() {
  const s = process.env.AUTH_SECRET
  if (!s) throw new Error('AUTH_SECRET tidak di-set di .env')
  return new TextEncoder().encode(s)
}

export async function createSessionToken(userId: string) {
  return new SignJWT({ userId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secret())
}

export async function verifySessionToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, secret())
    return payload as { userId: string }
  } catch {
    return null
  }
}

// ✅ Hanya dipakai dari Server Actions, bukan Route Handler
export async function setSessionCookie(token: string) {
  const jar = await cookies()
  jar.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge:   60 * 60 * 24 * 7,
    path:     '/',
  })
}

export async function clearSessionCookie() {
  const jar = await cookies()
  jar.delete(COOKIE_NAME)
}

export async function getCurrentUser() {
  const jar = await cookies()
  const token = jar.get(COOKIE_NAME)?.value
  if (!token) return null

  const payload = await verifySessionToken(token)
  if (!payload) return null

  return prisma.user.findUnique({
    where: { id: payload.userId, isActive: true },
    select: {
      id: true, name: true, email: true, role: true,
      phone: true, avatarUrl: true, organizationId: true,
      organization: {
        select: { id: true, name: true, slug: true, logoUrl: true },
      },
    },
  })
}

export type { CurrentUser }