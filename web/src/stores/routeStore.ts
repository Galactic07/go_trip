import { create } from 'zustand'
import type { RoutePlan, RouteStatus } from '@/types'
import {
  fetchRoutePlans,
  createRoutePlan as createRoutePlanApi,
  updateRoutePlan as updateRoutePlanApi,
  updateRoutePlanStatus as updateRoutePlanStatusApi,
  deleteRoutePlan as deleteRoutePlanApi,
  type CreateRoutePlanRequest,
  type UpdateRoutePlanRequest,
} from '@/lib/routeApi'

interface RouteState {
  routes: RoutePlan[]
  loading: boolean
  error: string | null
  activeRouteId: number | null

  fetchRoutes: () => Promise<void>
  createRoute: (data: CreateRoutePlanRequest) => Promise<RoutePlan>
  updateRoute: (id: number, data: UpdateRoutePlanRequest) => Promise<void>
  updateRouteStatus: (id: number, status: RouteStatus) => Promise<void>
  deleteRoute: (id: number) => Promise<void>
  setActiveRoute: (id: number | null) => void
}

export const useRouteStore = create<RouteState>((set) => ({
  routes: [],
  loading: false,
  error: null,
  activeRouteId: null,

  fetchRoutes: async () => {
    set({ loading: true, error: null })
    try {
      const routes = await fetchRoutePlans()
      set({ routes })
    } catch (err) {
      set({ error: err instanceof Error ? err.message : '获取路线失败' })
    } finally {
      set({ loading: false })
    }
  },

  createRoute: async (data) => {
    set({ error: null })
    try {
      const created = await createRoutePlanApi(data)
      set((state) => ({ routes: [created, ...state.routes] }))
      return created
    } catch (err) {
      set({ error: err instanceof Error ? err.message : '创建路线失败' })
      throw err
    }
  },

  updateRoute: async (id, data) => {
    set({ error: null })
    try {
      const updated = await updateRoutePlanApi(id, data)
      set((state) => ({
        routes: state.routes.map((r) => (r.id === id ? updated : r)),
      }))
    } catch (err) {
      set({ error: err instanceof Error ? err.message : '更新路线失败' })
      throw err
    }
  },

  updateRouteStatus: async (id, status) => {
    set({ error: null })
    try {
      const updated = await updateRoutePlanStatusApi(id, status)
      set((state) => ({
        routes: state.routes.map((r) => (r.id === id ? updated : r)),
      }))
    } catch (err) {
      set({ error: err instanceof Error ? err.message : '更新状态失败' })
      throw err
    }
  },

  deleteRoute: async (id) => {
    set({ error: null })
    try {
      await deleteRoutePlanApi(id)
      set((state) => ({
        routes: state.routes.filter((r) => r.id !== id),
        activeRouteId: state.activeRouteId === id ? null : state.activeRouteId,
      }))
    } catch (err) {
      set({ error: err instanceof Error ? err.message : '删除路线失败' })
      throw err
    }
  },

  setActiveRoute: (id) => {
    set({ activeRouteId: id })
  },
}))
