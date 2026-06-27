import type { Place, DistrictGroup, CityGroup } from '@/types'

export function groupByDistrict(places: Place[]): DistrictGroup[] {
  const map = new Map<string, Place[]>()
  for (const place of places) {
    const key = `${place.city}|${place.district}`
    if (!map.has(key)) {
      map.set(key, [])
    }
    map.get(key)!.push(place)
  }

  const groups: DistrictGroup[] = []
  for (const [, groupPlaces] of map) {
    if (groupPlaces.length === 0) continue
    const first = groupPlaces[0]
    const center = calculateCenter(groupPlaces)
    groups.push({
      district: first.district,
      city: first.city,
      adcode: first.adcode,
      places: groupPlaces,
      count: groupPlaces.length,
      center,
    })
  }
  return groups
}

export function groupByCity(places: Place[]): CityGroup[] {
  const districtGroups = groupByDistrict(places)
  const map = new Map<string, DistrictGroup[]>()

  for (const dg of districtGroups) {
    if (!map.has(dg.city)) {
      map.set(dg.city, [])
    }
    map.get(dg.city)!.push(dg)
  }

  const groups: CityGroup[] = []
  for (const [city, districts] of map) {
    if (districts.length === 0) continue
    const province = places.find((p) => p.city === city)?.province ?? ''
    groups.push({
      city,
      province,
      districts,
      count: districts.reduce((sum, d) => sum + d.count, 0),
    })
  }
  return groups
}

export function calculateCenter(places: Place[]): { lng: number; lat: number } {
  if (places.length === 0) {
    return { lng: 0, lat: 0 }
  }
  let sumLng = 0
  let sumLat = 0
  for (const p of places) {
    sumLng += p.lng
    sumLat += p.lat
  }
  return { lng: sumLng / places.length, lat: sumLat / places.length }
}

export function getBubbleStyle(count: number): { size: number; color: string } {
  if (count <= 3) {
    return { size: 28, color: '#2563EB' }
  } else if (count <= 6) {
    return { size: 36, color: '#F59E0B' }
  } else {
    return { size: 44, color: '#EF4444' }
  }
}
