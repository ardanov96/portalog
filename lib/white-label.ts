import { prisma } from '@/lib/prisma'
import { randomBytes } from 'crypto'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface BrandingConfig {
  orgId:           string
  orgSlug:         string
  brandName:       string
  logoUrl:         string | null
  faviconUrl:      string | null
  primaryColor:    string          // hex without #
  accentColor:     string
  fontFamily:      string
  backgroundColor: string | null
  backgroundStyle: string
  portalTitle:     string
  portalWelcome:   string
  portalFooter:    string | null
  supportEmail:    string | null
  supportPhone:    string | null
  supportWhatsapp: string | null
  showPoweredBy:   boolean
  showChatbot:     boolean
  showDocuments:   boolean
  showTimeline:    boolean
  allowClientLogin:boolean
  customDomain:    string | null
  isWhiteLabel:    boolean
}

// ─── Default ForwarderOS branding ─────────────────────────────────────────────

export const DEFAULT_BRANDING: Omit<BrandingConfig, 'orgId' | 'orgSlug' | 'customDomain'> = {
  brandName:       'ForwarderOS',
  logoUrl:         null,
  faviconUrl:      null,
  primaryColor:    '1A3C34',
  accentColor:     'C8953A',
  fontFamily:      'Inter',
  backgroundColor: null,
  backgroundStyle: 'solid',
  portalTitle:     'Portal Klien',
  portalWelcome:   'Lacak status pengiriman Anda secara real-time.',
  portalFooter:    null,
  supportEmail:    null,
  supportPhone:    null,
  supportWhatsapp: null,
  showPoweredBy:   true,
  showChatbot:     true,
  showDocuments:   true,
  showTimeline:    true,
  allowClientLogin:true,
  isWhiteLabel:    false,
}

// ─── Cache (in-memory, 5 menit) ──────────────────────────────────────────────

const brandingCache = new Map<string, { config: BrandingConfig; expiresAt: number }>()

const CACHE_TTL = 5 * 60 * 1000  // 5 minutes

function cacheGet(key: string): BrandingConfig | null {
  const entry = brandingCache.get(key)
  if (!entry || Date.now() > entry.expiresAt) { brandingCache.delete(key); return null }
  return entry.config
}

function cacheSet(key: string, config: BrandingConfig) {
  brandingCache.set(key, { config, expiresAt: Date.now() + CACHE_TTL })
}

export function invalidateBrandingCache(orgId: string) {
  for (const [key] of brandingCache) {
    if (key.includes(orgId)) brandingCache.delete(key)
  }
}

// ─── Resolve branding by custom domain ───────────────────────────────────────

export async function resolveBrandingByDomain(hostname: string): Promise<BrandingConfig | null> {
  // Strip port if present
  const domain = hostname.split(':')[0].toLowerCase()

  // Skip default ForwarderOS domains
  const appHost = (process.env.NEXT_PUBLIC_APP_URL ?? '').replace(/https?:\/\//, '').split(':')[0]
  if (domain === appHost || domain === 'localhost' || domain.endsWith('.vercel.app')) return null

  const cacheKey = `domain:${domain}`
  const cached   = cacheGet(cacheKey)
  if (cached) return cached

  const wl = await prisma.whiteLabel.findFirst({
    where:   { customDomain: domain, status: 'ACTIVE' },
    include: { organization: { select: { id: true, slug: true, name: true, logoUrl: true } } },
  })

  if (!wl) return null

  const config: BrandingConfig = {
    orgId:           wl.organizationId,
    orgSlug:         wl.organization.slug,
    brandName:       wl.brandName    ?? wl.organization.name,
    logoUrl:         wl.logoUrl      ?? wl.organization.logoUrl,
    faviconUrl:      wl.faviconUrl,
    primaryColor:    wl.primaryColor ?? DEFAULT_BRANDING.primaryColor,
    accentColor:     wl.accentColor  ?? DEFAULT_BRANDING.accentColor,
    fontFamily:      wl.fontFamily   ?? DEFAULT_BRANDING.fontFamily,
    backgroundColor: wl.backgroundColor,
    backgroundStyle: wl.backgroundStyle,
    portalTitle:     wl.portalTitle  ?? DEFAULT_BRANDING.portalTitle,
    portalWelcome:   wl.portalWelcome ?? DEFAULT_BRANDING.portalWelcome,
    portalFooter:    wl.portalFooter,
    supportEmail:    wl.supportEmail,
    supportPhone:    wl.supportPhone,
    supportWhatsapp: wl.supportWhatsapp,
    showPoweredBy:   wl.showPoweredBy,
    showChatbot:     wl.showChatbot,
    showDocuments:   wl.showDocuments,
    showTimeline:    wl.showTimeline,
    allowClientLogin:wl.allowClientLogin,
    customDomain:    wl.customDomain,
    isWhiteLabel:    true,
  }

  cacheSet(cacheKey, config)
  return config
}

// ─── Resolve branding by org slug (for preview) ──────────────────────────────

export async function resolveBrandingBySlug(slug: string): Promise<BrandingConfig | null> {
  const cacheKey = `slug:${slug}`
  const cached   = cacheGet(cacheKey)
  if (cached) return cached

  const wl = await prisma.whiteLabel.findFirst({
    where:   { organization: { slug }, status: 'ACTIVE' },
    include: { organization: { select: { id: true, slug: true, name: true, logoUrl: true } } },
  })

  if (!wl) return null

  const config: BrandingConfig = {
    orgId:           wl.organizationId,
    orgSlug:         wl.organization.slug,
    brandName:       wl.brandName    ?? wl.organization.name,
    logoUrl:         wl.logoUrl      ?? wl.organization.logoUrl,
    faviconUrl:      wl.faviconUrl,
    primaryColor:    wl.primaryColor ?? DEFAULT_BRANDING.primaryColor,
    accentColor:     wl.accentColor  ?? DEFAULT_BRANDING.accentColor,
    fontFamily:      wl.fontFamily   ?? DEFAULT_BRANDING.fontFamily,
    backgroundColor: wl.backgroundColor,
    backgroundStyle: wl.backgroundStyle,
    portalTitle:     wl.portalTitle  ?? DEFAULT_BRANDING.portalTitle,
    portalWelcome:   wl.portalWelcome ?? DEFAULT_BRANDING.portalWelcome,
    portalFooter:    wl.portalFooter,
    supportEmail:    wl.supportEmail,
    supportPhone:    wl.supportPhone,
    supportWhatsapp: wl.supportWhatsapp,
    showPoweredBy:   wl.showPoweredBy,
    showChatbot:     wl.showChatbot,
    showDocuments:   wl.showDocuments,
    showTimeline:    wl.showTimeline,
    allowClientLogin:wl.allowClientLogin,
    customDomain:    wl.customDomain,
    isWhiteLabel:    true,
  }

  cacheSet(cacheKey, config)
  return config
}

// ─── Domain verification token ────────────────────────────────────────────────

export function generateVerifyToken(): string {
  return `fos-verify-${randomBytes(16).toString('hex')}`
}

// ─── Verify DNS TXT record (production check) ─────────────────────────────────

export async function verifyDomainDns(domain: string, token: string): Promise<boolean> {
  try {
    const { resolveTxt } = await import('dns/promises')
    const records        = await resolveTxt(domain)
    const flat           = records.flat()
    return flat.some(r => r.includes(token))
  } catch {
    return false
  }
}

// ─── CSS variables string untuk inject ke portal ─────────────────────────────

export function brandingToCssVars(b: BrandingConfig): string {
  const primary = b.primaryColor.replace('#', '')
  const accent  = b.accentColor.replace('#', '')

  return `
    --wl-primary: #${primary};
    --wl-accent:  #${accent};
    --wl-font:    '${b.fontFamily}', system-ui, sans-serif;
    --wl-bg:      ${b.backgroundColor ? `#${b.backgroundColor.replace('#', '')}` : '#f8fafc'};
  `.trim()
}
