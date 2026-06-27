import api from './api'
import type { Place, CreatePlaceRequest, UpdatePlaceRequest, PlaceStatus, PaginatedResponse } from '@/types'

export async function fetchPlaces(page = 1, pageSize = 50, status?: PlaceStatus): Promise<Place[]> {
  const res = await api.get<PaginatedResponse<Place>>('/places', {
    params: { page, page_size: pageSize, ...(status ? { status } : {}) },
  })
  return res.data.data
}

export async function createPlace(
  data: CreatePlaceRequest,
  force = false
): Promise<Place> {
  const res = await api.post<{ data: Place }>('/places', data, {
    params: force ? { force: 'true' } : undefined,
  })
  return res.data.data
}

export async function updatePlace(id: number, data: UpdatePlaceRequest): Promise<Place> {
  const res = await api.put<{ data: Place }>(`/places/${id}`, data)
  return res.data.data
}

export async function updatePlaceStatus(id: number, status: PlaceStatus): Promise<Place> {
  const res = await api.patch<{ data: Place }>(`/places/${id}/status`, { status })
  return res.data.data
}

export async function batchUpdateStatus(ids: number[], status: PlaceStatus): Promise<{ updated_count: number; status: string }> {
  const res = await api.patch<{ data: { updated_count: number; status: string } }>('/places/batch-status', { ids, status })
  return res.data.data
}

export async function deletePlace(id: number): Promise<void> {
  await api.delete(`/places/${id}`)
}
