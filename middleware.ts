import { NextRequest, NextResponse } from 'next/server'
import { verifySessionToken } from './lib/auth'
import { rateLimit, getIdentifier, rateLimitHeaders, tooManyRequests } from './lib/rate-limit'
import type { RateLimitKey } from './lib/rate-limit'

// ─── Public routes ─────────────────────────────────────────────────────────────
const PUBLIC_PAGES = ['/', '/login', '/register', '/portal', '/invite', '/offline']

// ─── Rate limit key map ────────────────────────────────────────────────────────
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

// ─── App hostname (default ForwarderOS domain) ────────────────────────────────
const APP_HOSTNAMES = new Set([
  'forwarderos.id',
  'www.forwarderos.id',
  'localhost',
])

function isDefaultHost(hostname: string): boolean {
  const host = hostname.split(':')[0].toLowerCase()
  return APP_HOSTNAMES.has(host) || host.endsWith('.vercel.app') || host.endsWith('.localhost')
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  const hostname     = req.headers.get('host') ?? ''
  const method       = req.method

  // ── White-label custom domain detection ────────────────────────────────────
  // Jika request datang dari custom domain (bukan default app domain),
  // route ke portal klien white-label
  if (!isDefaultHost(hostname) && !pathname.startsWith('/api') && !pathname.startsWith('/_next')) {
    // Rewrite ke portal dengan domain info di header
    const url = req.nextUrl.clone()

    // Jika root atau /portal, serve portal white-label
    if (pathname === '/' || pathname.startsWith('/portal') || pathname.startsWith('/tracking')) {
      url.pathname = '/wl-portal' + (pathname === '/' ? '' : pathname.replace('/portal', ''))
      const res = NextResponse.rewrite(url)
      res.headers.set('X-WL-Domain', hostname.split(':')[0].toLowerCase())
      res.headers.set('X-WL-Request', '1')
      return res
    }

    // Path lain di custom domain → redirect ke portal root
    url.pathname = '/'
    return NextResponse.redirect(url)
  }

  // ── Standard page routing (default domain) ─────────────────────────────────
  if (!pathname.startsWith('/api')) {
    const isPublic = PUBLIC_PAGES.some(p => pathname.startsWith(p))
    const token    = req.cookies.get('ff_session')?.value
    const isAuth   = token ? !!(await verifySessionToken(token)) : false

    if (isPublic && isAuth && !pathname.startsWith('/portal') && !pathname.startsWith('/wl-portal')) {
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }
    if (!isPublic && !isAuth) {
      const url = new URL('/login', req.url)
      url.searchParams.set('callbackUrl', pathname)
      return NextResponse.redirect(url)
    }

    const res = NextResponse.next()
    // Inject hostname untuk white-label preview (/wl-portal?preview=slug)
    if (pathname.startsWith('/wl-portal')) {
      res.headers.set('X-WL-Domain', hostname.split(':')[0].toLowerCase())
    }
    return res
  }

  // ── API routing with rate limiting ─────────────────────────────────────────
  const token       = req.cookies.get('ff_session')?.value
  const payload     = token ? await verifySessionToken(token) : null
  const identifier  = getIdentifier(req, payload?.userId)
  const limitKey    = getRateLimitKey(pathname, method)
  const result      = await rateLimit(identifier, limitKey)

  if (!result.success) return tooManyRequests(result)

  const res = NextResponse.next()
  Object.entries(rateLimitHeaders(result)).forEach(([k, v]) => res.headers.set(k, v))
  res.headers.set('X-Content-Type-Options', 'nosniff')
  res.headers.set('X-Frame-Options', 'SAMEORIGIN')   // relaxed untuk white-label iframes
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  return res
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icons|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
