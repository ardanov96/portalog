// ─── Vessel Tracking — Provider-agnostic ─────────────────────────────────────
//
// Mendukung beberapa provider API:
//
// 1. VesselFinder API (recommended, gratis untuk tracking terbatas)
//    https://api.vesselfinder.com
//    Daftar: https://apidocs.vesselfinder.com
//    Env: VESSEL_FINDER_API_KEY
//
// 2. MarineTraffic API (enterprise, per-credit)
//    https://services.marinetraffic.com/api
//    Env: MARINE_TRAFFIC_API_KEY
//
// 3. MyShipTracking (alternatif terjangkau)
//    https://www.myshiptracking.com/developers
//    Env: MY_SHIP_TRACKING_API_KEY
//
// 4. BarentsWatch (gratis untuk Norwegian waters, fallback)
//    https://www.barentswatch.no/bwapi
//
// Tanpa API key → gunakan mode simulasi untuk development

export interface VesselPosition {
  imo?:         string
  mmsi?:        string
  name?:        string
  lat:          number
  lon:          number
  speed:        number          // knots
  course:       number          // degrees (0–360)
  heading?:     number
  status:       string          // "underway" | "at anchor" | "moored" | "unknown"
  statusText:   string          // Human-readable
  destination?: string
  eta?:         Date            // ETA dari AIS transponder kapal
  timestamp:    Date
  provider:     string
}

export interface VesselSearchResult {
  imo?:  string
  mmsi?: string
  name:  string
  type?: string
  flag?: string
}

// ─── Status mapping ───────────────────────────────────────────────────────────

function aisStatusText(code: number | string): { status: string; text: string } {
  const n = typeof code === 'string' ? parseInt(code) : code
  const map: Record<number, [string, string]> = {
    0:  ['underway',  'Berlayar (mesin)'],
    1:  ['at anchor', 'Berlabuh jangkar'],
    2:  ['not under command', 'Tidak terkendali'],
    3:  ['restricted maneuverability', 'Manuver terbatas'],
    5:  ['moored',    'Sandar pelabuhan'],
    6:  ['aground',   'Kandas'],
    7:  ['fishing',   'Menangkap ikan'],
    8:  ['underway',  'Berlayar (layar)'],
    15: ['unknown',   'Tidak diketahui'],
  }
  const [status, text] = map[n] ?? ['unknown', 'Tidak diketahui']
  return { status, text }
}

function parseAisEta(etaStr?: string): Date | undefined {
  // AIS ETA format: MMDD HHMM or YYYY-MM-DD HH:mm
  if (!etaStr) return undefined
  try {
    // Try ISO first
    const d = new Date(etaStr)
    if (!isNaN(d.getTime())) return d

    // AIS MMDD HHMM format
    const match = etaStr.match(/(\d{2})(\d{2})\s*(\d{2})(\d{2})/)
    if (match) {
      const now = new Date()
      const [, mm, dd, hh, min] = match
      const eta = new Date(now.getFullYear(), parseInt(mm) - 1, parseInt(dd), parseInt(hh), parseInt(min))
      if (eta < now) eta.setFullYear(eta.getFullYear() + 1)  // rollover ke tahun depan
      return eta
    }
    return undefined
  } catch { return undefined }
}

// ─── Provider: VesselFinder ───────────────────────────────────────────────────

async function fetchVesselFinder(query: { imo?: string; mmsi?: string; name?: string }): Promise<VesselPosition | null> {
  const apiKey = process.env.VESSEL_FINDER_API_KEY
  if (!apiKey) return null

  const params = new URLSearchParams({ userkey: apiKey })
  if (query.imo)  params.set('imo',  query.imo)
  if (query.mmsi) params.set('mmsi', query.mmsi)
  if (query.name) params.set('name', query.name)

  try {
    const res = await fetch(`https://api.vesselfinder.com/vessels?${params}`, {
      headers: { Accept: 'application/json' },
      signal:  AbortSignal.timeout(8000),
    })
    if (!res.ok) return null

    const data = await res.json()
    const v    = Array.isArray(data) ? data[0] : data?.vessels?.[0]
    if (!v) return null

    const { status, text: statusText } = aisStatusText(v.AIS?.NAVSTAT ?? 15)

    return {
      imo:         v.IMO   ? String(v.IMO)   : undefined,
      mmsi:        v.MMSI  ? String(v.MMSI)  : undefined,
      name:        v.AIS?.NAME ?? v.NAME ?? '',
      lat:         parseFloat(v.AIS?.LATITUDE ?? v.LAT ?? 0),
      lon:         parseFloat(v.AIS?.LONGITUDE ?? v.LON ?? 0),
      speed:       parseFloat(v.AIS?.SPEED ?? 0) / 10,
      course:      parseFloat(v.AIS?.COURSE ?? 0),
      heading:     parseFloat(v.AIS?.HEADING ?? 0),
      status,
      statusText,
      destination: v.AIS?.DESTINATION ?? undefined,
      eta:         parseAisEta(v.AIS?.ETA),
      timestamp:   new Date(v.AIS?.TIMESTAMP ?? Date.now()),
      provider:    'VesselFinder',
    }
  } catch (e) {
    console.warn('[VesselFinder] Error:', e)
    return null
  }
}

// ─── Provider: MarineTraffic ──────────────────────────────────────────────────

async function fetchMarineTraffic(query: { imo?: string; mmsi?: string }): Promise<VesselPosition | null> {
  const apiKey = process.env.MARINE_TRAFFIC_API_KEY
  if (!apiKey) return null

  const identifier = query.mmsi ?? query.imo
  if (!identifier) return null

  try {
    // MarineTraffic EI3 endpoint (Expected Arrivals)
    const res = await fetch(
      `https://services.marinetraffic.com/api/exportvessel/v:8/${apiKey}/mmsi:${identifier}/protocol:jsono`,
      { signal: AbortSignal.timeout(8000) }
    )
    if (!res.ok) return null

    const data = await res.json()
    const v    = data?.[0]
    if (!v) return null

    const { status, text: statusText } = aisStatusText(v.NAVSTAT ?? 15)

    return {
      mmsi:        query.mmsi,
      imo:         query.imo,
      name:        v.SHIPNAME ?? '',
      lat:         parseFloat(v.LAT ?? 0),
      lon:         parseFloat(v.LON ?? 0),
      speed:       parseFloat(v.SPEED ?? 0) / 10,
      course:      parseFloat(v.COURSE ?? 0),
      status,
      statusText,
      destination: v.DESTINATION ?? undefined,
      eta:         parseAisEta(v.ETA),
      timestamp:   new Date(v.TIMESTAMP ?? Date.now()),
      provider:    'MarineTraffic',
    }
  } catch (e) {
    console.warn('[MarineTraffic] Error:', e)
    return null
  }
}

// ─── Provider: MyShipTracking ─────────────────────────────────────────────────

async function fetchMyShipTracking(query: { imo?: string; mmsi?: string }): Promise<VesselPosition | null> {
  const apiKey = process.env.MY_SHIP_TRACKING_API_KEY
  if (!apiKey) return null

  const id = query.mmsi ?? query.imo
  if (!id) return null

  try {
    const res = await fetch(
      `https://www.myshiptracking.com/api/vessels?key=${apiKey}&mmsi=${id}&msg=pv&apimt=json`,
      { signal: AbortSignal.timeout(8000) }
    )
    if (!res.ok) return null

    const data = await res.json()
    const v    = data?.data?.[0]
    if (!v) return null

    const { status, text: statusText } = aisStatusText(v.status ?? 15)

    return {
      mmsi:      query.mmsi,
      imo:       query.imo,
      name:      v.name ?? '',
      lat:       parseFloat(v.lat ?? 0),
      lon:       parseFloat(v.lon ?? 0),
      speed:     parseFloat(v.speed ?? 0),
      course:    parseFloat(v.course ?? 0),
      status,
      statusText,
      destination: v.destination ?? undefined,
      eta:         parseAisEta(v.eta),
      timestamp:   new Date(v.timestamp ?? Date.now()),
      provider:    'MyShipTracking',
    }
  } catch (e) {
    console.warn('[MyShipTracking] Error:', e)
    return null
  }
}

// ─── Simulation mode (no API key) ────────────────────────────────────────────

function simulatePosition(vesselName?: string): VesselPosition {
  // Generate realistic-looking position in Malacca Strait area
  const seed  = vesselName?.split('').reduce((a, c) => a + c.charCodeAt(0), 0) ?? 42
  const lat   = 1.0  + (seed % 50) * 0.08   // ~1–5°N
  const lon   = 103.5 + (seed % 30) * 0.15  // ~103–108°E
  const speed = 10 + (seed % 8)

  return {
    name:       vesselName ?? 'VESSEL',
    lat,
    lon,
    speed,
    course:     45 + (seed % 180),
    status:     'underway',
    statusText: 'Berlayar (mesin) [Simulasi]',
    destination: 'TANJUNG PRIOK',
    timestamp:   new Date(),
    provider:    'simulation',
  }
}

// ─── Main export — tries all providers in order ────────────────────────────────

export async function getVesselPosition(opts: {
  imo?:  string
  mmsi?: string
  name?: string
}): Promise<VesselPosition | null> {
  // Try providers in order of preference
  const providers = [
    () => fetchVesselFinder(opts),
    () => fetchMarineTraffic({ imo: opts.imo, mmsi: opts.mmsi }),
    () => fetchMyShipTracking({ imo: opts.imo, mmsi: opts.mmsi }),
  ]

  for (const provider of providers) {
    const result = await provider()
    if (result) return result
  }

  // No API keys → dev simulation
  const hasAnyKey = !!(
    process.env.VESSEL_FINDER_API_KEY ||
    process.env.MARINE_TRAFFIC_API_KEY ||
    process.env.MY_SHIP_TRACKING_API_KEY
  )

  if (!hasAnyKey && (opts.imo || opts.mmsi || opts.name)) {
    console.info('[VesselTracking] No API key found — using simulation mode')
    return simulatePosition(opts.name)
  }

  return null
}

// ─── Vessel name search (untuk autocomplete IMO/MMSI) ────────────────────────

export async function searchVessel(name: string): Promise<VesselSearchResult[]> {
  const apiKey = process.env.VESSEL_FINDER_API_KEY
  if (!apiKey) {
    // Return mock results for dev
    return [
      { name: `${name.toUpperCase()} EXPRESS`, imo: '9123456', mmsi: '538000001' },
      { name: `${name.toUpperCase()} STAR`,    imo: '9234567', mmsi: '636000012' },
    ]
  }

  try {
    const res = await fetch(
      `https://api.vesselfinder.com/search?userkey=${apiKey}&term=${encodeURIComponent(name)}`,
      { signal: AbortSignal.timeout(5000) }
    )
    if (!res.ok) return []
    const data = await res.json()
    return (Array.isArray(data) ? data : data.vessels ?? []).slice(0, 10).map((v: any) => ({
      name:  v.NAME ?? v.SHIPNAME ?? '',
      imo:   v.IMO ? String(v.IMO) : undefined,
      mmsi:  v.MMSI ? String(v.MMSI) : undefined,
      type:  v.TYPE,
      flag:  v.FLAG,
    }))
  } catch { return [] }
}

// ─── ETA confidence score ─────────────────────────────────────────────────────

export function etaConfidence(position: VesselPosition, destinationPort?: string): 'high' | 'medium' | 'low' {
  if (!position.eta) return 'low'
  const ageHours = (Date.now() - position.timestamp.getTime()) / 3_600_000
  if (ageHours > 24)  return 'low'
  if (ageHours > 6)   return 'medium'
  if (position.speed < 1) return 'medium'  // vessel not moving
  return 'high'
}
