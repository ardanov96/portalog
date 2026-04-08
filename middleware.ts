import { NextRequest, NextResponse } from 'next/server'
import { verifySessionToken } from './lib/auth'

const PUBLIC  = ['/login', '/register']
const API     = '/api'

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  if (pathname.startsWith(API)) return NextResponse.next()

  const token = req.cookies.get('ff_session')?.value
  const isAuth = token ? !!(await verifySessionToken(token)) : false

  const isPublic = PUBLIC.some((p) => pathname.startsWith(p))

  if (isPublic && isAuth) return NextResponse.redirect(new URL('/dashboard', req.url))
  if (!isPublic && !isAuth) {
    const url = new URL('/login', req.url)
    url.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(url)
  }
  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
