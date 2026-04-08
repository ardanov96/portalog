import { PrismaClient, ShipmentType, ShipmentMode, ShipmentStatus, DocumentType, DocumentStatus, UserRole } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding...')

  const org = await prisma.organization.upsert({
    where: { slug: 'demo-ff' },
    update: {},
    create: {
      name: 'PT Demo Freight Forwarder',
      slug: 'demo-ff',
      npwp: '01.234.567.8-901.000',
      phone: '+62-21-12345678',
      email: 'ops@demoff.co.id',
      address: 'Jl. Raya Pelabuhan No. 99',
      city: 'Jakarta',
    },
  })

  const ownerHash = await bcrypt.hash('password123', 10)
  const owner = await prisma.user.upsert({
    where: { email: 'owner@demoff.co.id' },
    update: {},
    create: {
      organizationId: org.id,
      name: 'Budi Santoso',
      email: 'owner@demoff.co.id',
      passwordHash: ownerHash,
      role: UserRole.OWNER,
      phone: '+6281234567890',
    },
  })

  const staffHash = await bcrypt.hash('password123', 10)
  const staff = await prisma.user.upsert({
    where: { email: 'staff@demoff.co.id' },
    update: {},
    create: {
      organizationId: org.id,
      name: 'Siti Rahayu',
      email: 'staff@demoff.co.id',
      passwordHash: staffHash,
      role: UserRole.STAFF,
    },
  })

  const client1 = await prisma.client.upsert({
    where: { id: 'clseed001' },
    update: {},
    create: {
      id: 'clseed001',
      organizationId: org.id,
      name: 'Ahmad Wijaya',
      companyName: 'CV Wijaya Import',
      npwp: '12.345.678.9-012.000',
      email: 'ahmad@wijayaimport.com',
      phone: '+6281111222333',
      city: 'Surabaya',
    },
  })

  const client2 = await prisma.client.upsert({
    where: { id: 'clseed002' },
    update: {},
    create: {
      id: 'clseed002',
      organizationId: org.id,
      name: 'Dewi Kusuma',
      companyName: 'PT Kusuma Ekspor',
      email: 'dewi@kusumaeksport.co.id',
      phone: '+6282222333444',
      city: 'Bandung',
    },
  })

  const s1 = await prisma.shipment.upsert({
    where: { referenceNo: 'FF-2024-001' },
    update: {},
    create: {
      organizationId: org.id,
      clientId: client1.id,
      assignedToId: staff.id,
      referenceNo: 'FF-2024-001',
      type: ShipmentType.IMPORT,
      mode: ShipmentMode.SEA_FCL,
      status: ShipmentStatus.CUSTOMS_PROCESSING,
      originCountry: 'CN',
      originPort: 'Shanghai',
      destinationCountry: 'ID',
      destinationPort: 'Tanjung Priok',
      cargoDescription: 'Mesin tekstil dan spare parts',
      grossWeight: 12500,
      volume: 25.5,
      packageCount: 48,
      hsCode: '8445.11.00',
      vesselName: 'MSC DIANA',
      voyageNo: 'MD240301',
      eta: new Date('2025-03-20'),
      pibNo: 'PIB-2024-112233',
      customsDeadline: new Date('2025-03-22'),
      freightCost: 8500000,
      localCharges: 2500000,
    },
  })

  await prisma.document.createMany({
    skipDuplicates: true,
    data: [
      { shipmentId: s1.id, type: DocumentType.BILL_OF_LADING,      status: DocumentStatus.APPROVED,      name: 'B/L MSC DIANA MD240301',             isRequired: true, isVisibleToClient: true },
      { shipmentId: s1.id, type: DocumentType.COMMERCIAL_INVOICE,   status: DocumentStatus.APPROVED,      name: 'Commercial Invoice Shanghai Textile', isRequired: true, isVisibleToClient: true },
      { shipmentId: s1.id, type: DocumentType.PACKING_LIST,         status: DocumentStatus.APPROVED,      name: 'Packing List - 48 Packages',         isRequired: true, isVisibleToClient: true },
      { shipmentId: s1.id, type: DocumentType.PIB,                  status: DocumentStatus.UNDER_REVIEW,  name: 'PIB-2024-112233',                    isRequired: true, isVisibleToClient: false },
      { shipmentId: s1.id, type: DocumentType.CUSTOMS_RELEASE,      status: DocumentStatus.PENDING,       name: 'SPPB (Surat Pengeluaran Barang)',     isRequired: true, isVisibleToClient: true },
    ],
  })

  const s2 = await prisma.shipment.upsert({
    where: { referenceNo: 'FF-2024-002' },
    update: {},
    create: {
      organizationId: org.id,
      clientId: client2.id,
      assignedToId: owner.id,
      referenceNo: 'FF-2024-002',
      type: ShipmentType.EXPORT,
      mode: ShipmentMode.AIR,
      status: ShipmentStatus.DOCS_IN_PROGRESS,
      originCountry: 'ID',
      originPort: 'Soekarno-Hatta (CGK)',
      destinationCountry: 'AU',
      destinationPort: 'Melbourne (MEL)',
      cargoDescription: 'Kerajinan tangan rotan dan bambu',
      grossWeight: 340,
      volume: 2.8,
      packageCount: 15,
      hsCode: '4602.19.00',
      vesselName: 'Garuda GA715',
      etd: new Date('2025-03-18'),
      eta: new Date('2025-03-19'),
      pebNo: 'PEB-2024-445566',
      freightCost: 4200000,
    },
  })

  await prisma.document.createMany({
    skipDuplicates: true,
    data: [
      { shipmentId: s2.id, type: DocumentType.AIRWAY_BILL,          status: DocumentStatus.PENDING,  name: 'AWB Garuda GA715',             isRequired: true, isVisibleToClient: true },
      { shipmentId: s2.id, type: DocumentType.COMMERCIAL_INVOICE,   status: DocumentStatus.UPLOADED, name: 'Invoice Ekspor Kerajinan',     isRequired: true, isVisibleToClient: true },
      { shipmentId: s2.id, type: DocumentType.CERTIFICATE_OF_ORIGIN,status: DocumentStatus.PENDING,  name: 'COO Form B',                  isRequired: true, isVisibleToClient: true },
      { shipmentId: s2.id, type: DocumentType.PEB,                  status: DocumentStatus.PENDING,  name: 'PEB-2024-445566',             isRequired: true, isVisibleToClient: false },
    ],
  })

  console.log('✅ Seed selesai!')
  console.log('')
  console.log('Credentials demo:')
  console.log('  owner@demoff.co.id  / password123')
  console.log('  staff@demoff.co.id  / password123')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
