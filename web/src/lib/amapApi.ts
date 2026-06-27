import api from './api'
import type { RegeoResult, RouteResult } from '@/types'

export async function regeo(lng: number, lat: number): Promise<RegeoResult> {
  const res = await api.get<{ data: RegeoResult }>('/amap/regeo', {
    params: { lng, lat },
  })
  return res.data.data
}

export async function searchDistrict(keywords: string, subdistrict = 1): Promise<unknown> {
  const res = await api.get('/amap/district', {
    params: { keywords, subdistrict },
  })
  return res.data
}

export async function drivingRoute(
  originLng: number,
  originLat: number,
  destLng: number,
  destLat: number
): Promise<RouteResult> {
  const res = await api.get<{ data: RouteResult }>('/amap/direction/driving', {
    params: { origin_lng: originLng, origin_lat: originLat, dest_lng: destLng, dest_lat: destLat },
  })
  return res.data.data
}

export async function walkingRoute(
  originLng: number,
  originLat: number,
  destLng: number,
  destLat: number
): Promise<RouteResult> {
  const res = await api.get<{ data: RouteResult }>('/amap/direction/walking', {
    params: { origin_lng: originLng, origin_lat: originLat, dest_lng: destLng, dest_lat: destLat },
  })
  return res.data.data
}
