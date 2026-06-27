import api from './api'
import type { WeatherResult } from '@/types'

export async function fetchWeather(lat: number, lng: number): Promise<WeatherResult> {
  const res = await api.get<{ data: WeatherResult }>('/v1/weather', {
    params: { lat, lng },
  })
  return res.data.data
}
