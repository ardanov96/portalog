import { SignJWT, jwtVerify } from 'jose'

const secret = () => new TextEncoder().encode(process.env.AUTH_SECRET ?? 'fallback-secret')

export async function createPortalToken(clientId: string) {
  return new SignJWT({ clientId, type: 'portal' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(secret())
}

export async function verifyPortalToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, secret())
    if (payload.type !== 'portal') return null
    return payload as { clientId: string; type: string }
  } catch { return null }
}