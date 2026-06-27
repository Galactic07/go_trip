import api from './api'

export interface PoiResult {
  id: string
  name: string
  type: string
  address: string
  lng: number
  lat: number
  tel?: string
  rating?: number | null
  cost?: string | null
  photo_url?: string
}

export interface PoiSearchResponse {
  pois: PoiResult[]
  total_count: number
  page: number
  page_size: number
}

export interface PoiSearchParams {
  keywords?: string
  city?: string
  type?: 'scenic' | 'restaurant' | 'shopping' | 'hotel' | 'entertainment' | 'life'
  page?: number
  page_size?: number
  lng?: number
  lat?: number
  radius?: number
}

export async function searchPoi(params: PoiSearchParams): Promise<PoiSearchResponse> {
  const res = await api.get<{ data: PoiSearchResponse }>('/amap/poi/search', {
    params,
  })
  return res.data.data
}

export async function searchPoiAround(
  lng: number,
  lat: number,
  radius: number = 100,
  limit: number = 5
): Promise<PoiSearchResponse> {
  const res = await api.get<{ data: PoiSearchResponse }>('/amap/poi/around', {
    params: { lng, lat, radius, limit },
  })
  return res.data.data
}
