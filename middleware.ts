import { NextRequest, NextResponse } from 'next/server'
import { verifySessionToken } from './lib/auth'
import { rateLimit, getIdentifier, rateLimitHeaders, tooManyRequests } from './lib/rate-limit'
import type { RateLimitKey } from './lib/rate-limit'

// ─── Public routes ─────────────────────────────────────────────────────────────
const PUBLIC_PAGES = ['/login', '/register', '/portal-login', '/invite']


// ─── Portal routes (customer) — pakai custom auth bukan NextAuth ───────────────
const PORTAL_PAGES = ['/portal']


// ─── Map pathname + method → rate limit config key ────────────────────────────
function getRateLimitKey(pathname: string, method: string): RateLimitKey {
  if (pathname === '/api/auth/login')                  return 'auth_login'
  if (pathname === '/api/auth/register')               return 'auth_register'
  if (pathname.startsWith('/api/auth'))                return 'auth_misc'
  if (pathname === '/api/hs-suggest')                  return 'ai_suggest'
  if (pathname === '/api/invite' && method === 'POST') return 'invite_send'
  if (pathname === '/api/upload')                      return 'upload'
  if (pathname.startsWith('/api/billing/webhook'))     return 'webhook'
  if (pathname.startsWith('/api/billing'))             return 'billing'
  if (pathname.startsWith('/api/portal'))              return 'portal'
  if (method === 'GET')                                return 'api_read'
  return 'api_authed'
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  const method       = req.method

  // ── Page routes — auth gate only, no rate limiting ─────────────────────────
  if (!pathname.startsWith('/api')) {

    // ── Portal customer routes (/portal/tracking, dll) ──────────────────────
    const isPortalPage = PORTAL_PAGES.some(p => pathname.startsWith(p))
    if (isPortalPage) {
      const portalToken = req.cookies.get('ff_portal_session')?.value
      if (!portalToken) {
        return NextResponse.redirect(new URL('/portal-login', req.url))
      }
      return NextResponse.next()
    }

    // ── Staff/admin routes ──────────────────────────────────────────────────
    const isPublic = PUBLIC_PAGES.some(p => pathname.startsWith(p))
    const token    = req.cookies.get('ff_session')?.value
    const isAuth   = token ? !!(await verifySessionToken(token)) : false

    // Jika sudah login staff tapi akses /login atau /register → redirect dashboard
    if (isPublic && isAuth) return NextResponse.redirect(new URL('/dashboard', req.url))

    // Jika belum login staff dan akses halaman protected → redirect /login
    if (!isPublic && !isAuth) {
      const url = new URL('/login', req.url)
      url.searchParams.set('callbackUrl', pathname)
      return NextResponse.redirect(url)
    }

    return NextResponse.next()
  }

  // ── API routes — rate limit then forward ───────────────────────────────────
  const token       = req.cookies.get('ff_session')?.value
  const payload     = token ? await verifySessionToken(token) : null
  const identifier  = getIdentifier(req, payload?.userId)
  const limitKey    = getRateLimitKey(pathname, method)
  const result      = await rateLimit(identifier, limitKey)

  if (!result.success) return tooManyRequests(result)

  const res = NextResponse.next()
  // Expose rate limit state so clients can self-throttle
  Object.entries(rateLimitHeaders(result)).forEach(([k, v]) => res.headers.set(k, v))
  // Baseline security headers
  res.headers.set('X-Content-Type-Options', 'nosniff')
  res.headers.set('X-Frame-Options', 'DENY')
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  return res
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}