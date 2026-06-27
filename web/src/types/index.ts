export type PlaceStatus = 'wishlist' | 'visited' | 'pending' | 'abandoned'
export type SceneType = 'outdoor' | 'indoor' | 'hybrid' | 'unknown'

export interface Place {
  id: number
  name: string
  address: string
  lng: number
  lat: number
  province: string
  city: string
  district: string
  street: string
  adcode: string
  tags: string[]
  note: string
  status: PlaceStatus
  visited_at: string | null
  stay_duration: number
  estimated_cost: number | null
  scene_type: SceneType
  created_at: string
  updated_at: string
}

export interface DistrictGroup {
  district: string
  city: string
  adcode: string
  places: Place[]
  count: number
  center: { lng: number; lat: number }
}

export interface CityGroup {
  city: string
  province: string
  districts: DistrictGroup[]
  count: number
}

export type RouteStatus = 'planned' | 'in_progress' | 'completed'

export interface RoutePlanPlace {
  id: number
  route_plan_id: number
  place_id: number
  place: Place
  sort_order: number
  drive_distance: number | null
  drive_duration: number | null
  walk_distance: number | null
  walk_duration: number | null
}

export interface RoutePlan {
  id: number
  title: string
  status: RouteStatus
  estimated_time: number | null
  places: RoutePlanPlace[]
  created_at: string
  updated_at: string
}

export interface CreatePlaceRequest {
  name: string
  address: string
  lng: number
  lat: number
  province: string
  city: string
  district: string
  street: string
  adcode: string
  tags: string[]
  note: string
  stay_duration?: number
}

export interface UpdatePlaceRequest {
  tags: string[]
  note: string
  status?: PlaceStatus
  stay_duration?: number
  estimated_cost?: number | null
  scene_type?: SceneType
}

export interface UpdatePlaceStatusRequest {
  status: PlaceStatus
}

export interface BatchUpdateStatusRequest {
  ids: number[]
  status: PlaceStatus
}

export interface RegeoResult {
  province: string
  city: string
  district: string
  adcode: string
  township: string
  towncode: string
}

export interface RouteResult {
  distance: number
  duration: number
}

export interface WeatherResult {
  temperature: number
  apparent_temp: number
  humidity: number
  wind_speed: number
  weather_code: number
  description: string
  is_rainy: boolean
  is_hot: boolean
  is_cold: boolean
  max_temp_today: number
  min_temp_today: number
  precipitation_sum: number
}

export interface APIErrorResponse {
  error: string
  code?: string
  details?: unknown
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  page_size: number
}

export interface DataResponse<T> {
  data: T
}
