import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getVesselPosition, etaConfidence } from '@/lib/vessel-tracking'

type Ctx = { params: Promise<{ id: string }> }

// GET — ambil posisi vessel terkini dan update ETA jika berubah
export async function GET(_: NextRequest, { params }: Ctx) {
  const { id } = await params
  const user   = await getCurrentUser()
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  const shipment = await prisma.shipment.findFirst({
    where: { id, organizationId: user.organizationId },
    select: {
      id: true, referenceNo: true, vesselName: true, voyageNo: true,
      imoNumber: true, mmsiNumber: true,
      eta: true, etaUpdatedAt: true,
      vesselLat: true, vesselLon: true,
      vesselSpeed: true, vesselCourse: true,
      vesselStatus: true, vesselPositionAt: true,
      status: true, destinationPort: true,
    },
  })

  if (!shipment) {
    return NextResponse.json({ success: false, error: 'Shipment tidak ditemukan' }, { status: 404 })
  }

  // Jika tidak ada vessel name/IMO, return cached data atau null
  if (!shipment.vesselName && !shipment.imoNumber && !shipment.mmsiNumber) {
    return NextResponse.json({
      success: true,
      data:    { position: null, reason: 'no_vessel_info' },
    })
  }

  // Rate limit: jangan fetch terlalu sering (max sekali per 15 menit per shipment)
  if (shipment.vesselPositionAt) {
    const minsAgo = (Date.now() - new Date(shipment.vesselPositionAt).getTime()) / 60_000
    if (minsAgo < 15 && shipment.vesselLat && shipment.vesselLon) {
      // Return cached position
      return NextResponse.json({
        success: true,
        data: {
          position: {
            lat:        shipment.vesselLat,
            lon:        shipment.vesselLon,
            speed:      shipment.vesselSpeed,
            course:     shipment.vesselCourse,
            status:     shipment.vesselStatus,
            statusText: getStatusText(shipment.vesselStatus ?? 'unknown'),
            timestamp:  shipment.vesselPositionAt,
            provider:   'cache',
          },
          eta:           shipment.eta,
          etaUpdatedAt:  shipment.etaUpdatedAt,
          cached:        true,
          cacheAgeMin:   Math.round(minsAgo),
        },
      })
    }
  }

  // Fetch posisi terbaru dari provider
  const position = await getVesselPosition({
    imo:  shipment.imoNumber  ?? undefined,
    mmsi: shipment.mmsiNumber ?? undefined,
    name: shipment.vesselName ?? undefined,
  })

  if (!position) {
    return NextResponse.json({
      success: true,
      data:    {
        position:     null,
        eta:          shipment.eta,
        etaUpdatedAt: shipment.etaUpdatedAt,
        reason:       'not_found',
      },
    })
  }

  // Update database dengan posisi baru
  const updateData: Record<string, any> = {
    vesselLat:        position.lat,
    vesselLon:        position.lon,
    vesselSpeed:      position.speed,
    vesselCourse:     position.course,
    vesselStatus:     position.status,
    vesselPositionAt: position.timestamp,
  }

  let etaUpdated = false

  // Auto-update ETA jika AIS memberikan ETA baru yang signifikan (>4 jam beda)
  if (position.eta && position.provider !== 'simulation') {
    const confidence = etaConfidence(position, shipment.destinationPort ?? undefined)
    if (confidence !== 'low') {
      const currentEta = shipment.eta ? new Date(shipment.eta) : null
      const newEta     = position.eta
      const diffHours  = currentEta
        ? Math.abs(newEta.getTime() - currentEta.getTime()) / 3_600_000
        : 999

      if (diffHours > 4) {
        updateData.eta           = newEta
        updateData.etaUpdatedAt  = new Date()
        etaUpdated = true

        // Log activity
        await prisma.activityLog.create({
          data: {
            shipmentId:  shipment.id,
            action:      'ETA_AUTO_UPDATED',
            description: `ETA diperbarui otomatis dari vessel tracking (${position.provider}): ${newEta.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`,
          },
        })
      }
    }
  }

  await prisma.shipment.update({ where: { id: shipment.id }, data: updateData })

  return NextResponse.json({
    success: true,
    data: {
      position: {
        ...position,
        timestamp: position.timestamp.toISOString(),
        eta:       position.eta?.toISOString(),
      },
      eta:          updateData.eta ?? shipment.eta,
      etaUpdatedAt: updateData.etaUpdatedAt ?? shipment.etaUpdatedAt,
      etaUpdated,
      cached:       false,
    },
  })
}

// PATCH — simpan IMO/MMSI manual dari user
export async function PATCH(req: NextRequest, { params }: Ctx) {
  const { id } = await params
  const user   = await getCurrentUser()
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  const { imoNumber, mmsiNumber } = await req.json()

  const shipment = await prisma.shipment.findFirst({
    where: { id, organizationId: user.organizationId },
    select: { id: true },
  })
  if (!shipment) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })

  await prisma.shipment.update({
    where: { id },
    data: {
      imoNumber:  imoNumber  ?? undefined,
      mmsiNumber: mmsiNumber ?? undefined,
    },
  })

  return NextResponse.json({ success: true })
}

function getStatusText(status: string): string {
  const map: Record<string, string> = {
    'underway':   'Berlayar',
    'at anchor':  'Berlabuh jangkar',
    'moored':     'Sandar pelabuhan',
    'unknown':    'Tidak diketahui',
  }
  return map[status] ?? status
}
