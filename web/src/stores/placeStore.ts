import { create } from 'zustand'
import type { Place, PlaceStatus } from '@/types'
import {
  fetchPlaces as fetchPlacesApi,
  createPlace,
  updatePlace as updatePlaceApi,
  updatePlaceStatus as updatePlaceStatusApi,
  batchUpdateStatus as batchUpdateStatusApi,
  deletePlace as deletePlaceApi,
} from '@/lib/placeApi'
import { cachePlaces, getCachedPlaces } from '@/lib/cache'

interface PlaceState {
  places: Place[]
  loading: boolean
  error: string | null
  statusFilter: PlaceStatus | 'all'
  fetchPlaces: () => Promise<void>
  setStatusFilter: (status: PlaceStatus | 'all') => void
  getFilteredPlaces: () => Place[]
  addPlace: (
    place: Omit<Place, 'id' | 'created_at' | 'updated_at' | 'status' | 'visited_at' | 'estimated_cost'>,
    force?: boolean
  ) => Promise<void>
  updatePlace: (id: number, data: Partial<Pick<Place, 'tags' | 'note' | 'status' | 'stay_duration' | 'estimated_cost' | 'scene_type'>>) => Promise<void>
  updatePlaceStatus: (id: number, status: PlaceStatus) => Promise<void>
  batchUpdateStatus: (ids: number[], status: PlaceStatus) => Promise<void>
  deletePlace: (id: number) => Promise<void>
}

export const usePlaceStore = create<PlaceState>((set, get) => ({
  places: [],
  loading: false,
  error: null,
  statusFilter: 'all',

  fetchPlaces: async () => {
    set({ loading: true, error: null })
    try {
      const places = await fetchPlacesApi()
      set({ places })
      cachePlaces(places)
    } catch (err) {
      const cached = getCachedPlaces()
      if (cached.length > 0) {
        set({ places: cached, error: '服务暂时不可用，显示缓存数据' })
      } else {
        set({ error: err instanceof Error ? err.message : '获取地点失败' })
      }
    } finally {
      set({ loading: false })
    }
  },

  setStatusFilter: (status) => {
    set({ statusFilter: status })
  },

  getFilteredPlaces: () => {
    const { places, statusFilter } = get()
    if (statusFilter === 'all') return places
    return places.filter((p) => p.status === statusFilter)
  },

  addPlace: async (place, force = false) => {
    set({ error: null })
    try {
      const created = await createPlace(place, force)
      set((state) => ({ places: [...state.places, created] }))
    } catch (err) {
      const e = err as Error & { code?: string }
      if (e.code !== 'NEARBY_PLACE_EXISTS') {
        set({ error: e instanceof Error ? e.message : '添加地点失败' })
      }
      throw err
    }
  },

  updatePlace: async (id, data) => {
    set({ error: null })
    try {
      const existing = get().places.find((p) => p.id === id)
      const updated = await updatePlaceApi(id, {
        tags: data.tags ?? existing?.tags ?? [],
        note: data.note ?? existing?.note ?? '',
        ...(data.status !== undefined ? { status: data.status } : {}),
        ...(data.stay_duration !== undefined ? { stay_duration: data.stay_duration } : {}),
        ...(data.estimated_cost !== undefined ? { estimated_cost: data.estimated_cost } : {}),
        ...(data.scene_type !== undefined ? { scene_type: data.scene_type } : {}),
      })
      set((state) => ({
        places: state.places.map((p) => (p.id === id ? updated : p)),
      }))
    } catch (err) {
      set({ error: err instanceof Error ? err.message : '更新地点失败' })
      throw err
    }
  },

  updatePlaceStatus: async (id, status) => {
    set({ error: null })
    try {
      const updated = await updatePlaceStatusApi(id, status)
      set((state) => ({
        places: state.places.map((p) => (p.id === id ? updated : p)),
      }))
    } catch (err) {
      set({ error: err instanceof Error ? err.message : '更新状态失败' })
      throw err
    }
  },

  batchUpdateStatus: async (ids, status) => {
    set({ error: null })
    try {
      await batchUpdateStatusApi(ids, status)
      set((state) => ({
        places: state.places.map((p) =>
          ids.includes(p.id) ? { ...p, status, visited_at: status === 'visited' ? new Date().toISOString() : p.visited_at } : p
        ),
      }))
    } catch (err) {
      set({ error: err instanceof Error ? err.message : '批量更新状态失败' })
      throw err
    }
  },

  deletePlace: async (id) => {
    set({ error: null })
    try {
      await deletePlaceApi(id)
      set((state) => ({ places: state.places.filter((p) => p.id !== id) }))
    } catch (err) {
      set({ error: err instanceof Error ? err.message : '删除地点失败' })
      throw err
    }
  },
}))
