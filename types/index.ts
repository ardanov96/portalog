export type { ShipmentStatus, ShipmentType, ShipmentMode, DocumentType, DocumentStatus, UserRole } from '@prisma/client'
import type { User, Client, Shipment, Document, ShipmentStatus } from '@prisma/client'

export type ShipmentListItem = Pick<
  Shipment,
  'id' | 'referenceNo' | 'type' | 'mode' | 'status' |
  'originPort' | 'destinationPort' | 'eta' | 'etd' | 'cargoDescription' | 'createdAt'
> & {
  client: Pick<Client, 'id' | 'name' | 'companyName'>
  assignedTo: Pick<User, 'id' | 'name'> | null
  _count: { documents: number }
}

export type ApiResponse<T = void> =
  | { success: true; data: T }
  | { success: false; error: string }

export type DashboardStats = {
  totalShipments: number
  activeShipments: number
  pendingDocuments: number
  completedThisMonth: number
  shipmentsByStatus: { status: ShipmentStatus; count: number }[]
}
