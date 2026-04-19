import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { resolveBrandingByDomain, resolveBrandingBySlug, DEFAULT_BRANDING, brandingToCssVars, type BrandingConfig } from '@/lib/white-label'
import { WLPortalClient } from './WLPortalClient'

// Ambil branding dari domain (server-side, lalu inject ke client)
export default async function WhiteLabelPortalPage({
  searchParams,
}: {
  searchParams: Promise<{ preview?: string }>
}) {
  const hdrs     = await headers()
  const domain   = hdrs.get('X-WL-Domain') ?? ''
  const { preview } = await searchParams

  let branding: BrandingConfig | null = null

  if (preview) {
    // Preview mode: slug di query param (untuk owner melihat portal mereka)
    branding = await resolveBrandingBySlug(preview)
  } else if (domain) {
    branding = await resolveBrandingByDomain(domain)
  }

  // Jika tidak ada white-label config → fallback ke Portalog default
  const config: BrandingConfig = branding ?? {
    ...DEFAULT_BRANDING,
    orgId:    '',
    orgSlug:  '',
    customDomain: null,
    isWhiteLabel: false,
  }

  const cssVars = brandingToCssVars(config)

  return <WLPortalClient branding={config} cssVars={cssVars} preview={!!preview} />
}
