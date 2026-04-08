'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import type { ShipmentListItem } from '@/types'

export type ShipmentFilters = {
  search: string
  status: string
  page: number
  limit: number
}

export type ShipmentMeta = {
  total: number
  page: number
  limit: number
  totalPages: number
}

const DEFAULT_FILTERS: ShipmentFilters = {
  search: '',
  status: '',
  page: 1,
  limit: 20,
}

export function useShipments() {
  const [shipments, setShipments] = useState<ShipmentListItem[]>([])
  const [meta, setMeta]           = useState<ShipmentMeta>({ total: 0, page: 1, limit: 20, totalPages: 0 })
  const [filters, setFilters]     = useState<ShipmentFilters>(DEFAULT_FILTERS)
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState<string | null>(null)
  const abortRef                  = useRef<AbortController | null>(null)

  const fetch = useCallback(async (f: ShipmentFilters) => {
    abortRef.current?.abort()
    abortRef.current = new AbortController()

    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      if (f.search) params.set('search', f.search)
      if (f.status) params.set('status', f.status)
      params.set('page',  String(f.page))
      params.set('limit', String(f.limit))

      const res  = await window.fetch(`/api/shipments?${params}`, { signal: abortRef.current.signal })
      const data = await res.json()

      if (!data.success) throw new Error(data.error)
      setShipments(data.data)
      setMeta(data.meta)
    } catch (e: any) {
      if (e.name === 'AbortError') return
      setError(e.message || 'Gagal memuat data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetch(filters) }, [filters, fetch])

  const updateFilter = useCallback((patch: Partial<ShipmentFilters>) => {
    setFilters((prev) => ({
      ...prev,
      ...patch,
      page: patch.page !== undefined ? patch.page : 1,
    }))
  }, [])

  const refresh = useCallback(() => fetch(filters), [filters, fetch])

  return { shipments, meta, filters, loading, error, updateFilter, refresh }
}
