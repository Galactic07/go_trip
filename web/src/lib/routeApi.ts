import api from './api'
import type { RoutePlan, RouteStatus } from '@/types'

export interface CreateRoutePlanRequest {
  title: string
  place_ids: number[]
  auto_optimize: boolean
  driving: boolean
}

export interface UpdateRoutePlanRequest {
  title?: string
  places?: { place_id: number; sort_order: number }[]
  driving?: boolean
}

export async function fetchRoutePlans(): Promise<RoutePlan[]> {
  const res = await api.get<{ data: RoutePlan[] }>('/routes')
  return res.data.data
}

export async function fetchRoutePlanById(id: number): Promise<RoutePlan> {
  const res = await api.get<{ data: RoutePlan }>(`/routes/${id}`)
  return res.data.data
}

export async function createRoutePlan(
  data: CreateRoutePlanRequest
): Promise<RoutePlan> {
  const res = await api.post<{ data: RoutePlan }>('/routes', data)
  return res.data.data
}

export async function updateRoutePlan(
  id: number,
  data: UpdateRoutePlanRequest
): Promise<RoutePlan> {
  const res = await api.put<{ data: RoutePlan }>(`/routes/${id}`, data)
  return res.data.data
}

export async function updateRoutePlanStatus(
  id: number,
  status: RouteStatus
): Promise<RoutePlan> {
  const res = await api.patch<{ data: RoutePlan }>(`/routes/${id}/status`, {
    status,
  })
  return res.data.data
}

export async function deleteRoutePlan(id: number): Promise<void> {
  await api.delete(`/routes/${id}`)
}
