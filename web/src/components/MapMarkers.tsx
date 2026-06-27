import { useEffect, useRef } from 'react'
import { loadAMap } from '@/lib/amap'
import { usePlaceStore } from '@/stores/placeStore'
import {
  groupByDistrict,
  getBubbleStyle,
  calculateCenter,
} from '@/lib/clustering'
import type { Place, DistrictGroup } from '@/types'

// 检测重叠标记并返回带偏移的位置（螺旋散开算法）
function resolveOverlappingMarkers(
  places: Place[]
): Map<number, { lng: number; lat: number }> {
  const offsetMap = new Map<number, { lng: number; lat: number }>()
  const OVERLAP_THRESHOLD = 0.0005 // 约 50 米
  const BASE_RADIUS = 0.0004      // 基础偏移半径 约 40 米
  const processed = new Set<number>()

  for (let i = 0; i < places.length; i++) {
    if (processed.has(places[i].id)) continue
    processed.add(places[i].id)

    // 找出与当前地点重叠的所有地点
    const cluster: Place[] = [places[i]]
    for (let j = i + 1; j < places.length; j++) {
      if (processed.has(places[j].id)) continue
      const dx = places[j].lng - places[i].lng
      const dy = places[j].lat - places[i].lat
      if (Math.sqrt(dx * dx + dy * dy) < OVERLAP_THRESHOLD) {
        cluster.push(places[j])
        processed.add(places[j].id)
      }
    }

    if (cluster.length === 1) {
      offsetMap.set(places[i].id, { lng: places[i].lng, lat: places[i].lat })
      continue
    }

    // 螺旋散开：黄金角分布，随数量自动扩展半径
    const center = calculateCenter(cluster)
    const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5)) // ~137.5°

    for (let k = 0; k < cluster.length; k++) {
      // 半径随索引递增，确保每个点间距足够
      const radius = BASE_RADIUS * Math.sqrt(k + 1)
      const angle = k * GOLDEN_ANGLE
      offsetMap.set(cluster[k].id, {
        lng: center.lng + radius * Math.cos(angle),
        lat: center.lat + radius * Math.sin(angle),
      })
    }
  }

  return offsetMap
}

interface MapMarkersProps {
  map: any | null
  onMarkerClick?: (place: Place) => void
  onBubbleClick?: (group: DistrictGroup) => void
  selectedPlaceId?: number | null
}

export default function MapMarkers({
  map,
  onMarkerClick,
  onBubbleClick,
  selectedPlaceId,
}: MapMarkersProps) {
  const markersRef = useRef<any[]>([])
  const AMapRef = useRef<any>(null)
  const zoomRef = useRef<number>(11)
  const renderedPlaceIdsRef = useRef<Set<number>>(new Set())
  const renderMarkersRef = useRef<() => void>(() => {})
  const places = usePlaceStore((s) => s.places)

  const clearMarkers = () => {
    for (const marker of markersRef.current) {
      try {
        marker.setMap(null)
        marker.off('click')
      } catch {
        // ignore
      }
    }
    markersRef.current = []
  }

  const renderMarkers = () => {
    if (!map || !AMapRef.current) return
    const AMap = AMapRef.current
    clearMarkers()

    const zoom = zoomRef.current

    if (places.length === 0) return

    if (zoom < 12) {
      const groups = groupByDistrict(places)
      for (const group of groups) {
        if (group.places.length === 0) continue
        const { size, color } = getBubbleStyle(group.count)
        const tooltipText = `${group.district} (${group.count}个地点)`

        const content = `<div class="map-bubble" style="width:${size}px;height:${size}px;background:${color};"><span>${group.count}</span><div class="map-bubble-tooltip">${tooltipText}</div></div>`

        const marker = new AMap.Marker({
          position: [group.center.lng, group.center.lat],
          content,
          offset: new AMap.Pixel(-size / 2, -size / 2),
          map,
        })

        marker.on('click', () => {
          map.setZoomAndCenter(13, [group.center.lng, group.center.lat])
          onBubbleClick?.(group)
        })

        markersRef.current.push(marker)
      }
    } else {
      // 单个地点标记：检测重叠并偏移
      const offsetPositions = resolveOverlappingMarkers(places)
      for (const place of places) {
        const isNew = !renderedPlaceIdsRef.current.has(place.id)
        const bounceClass = isNew ? ' marker-bounce' : ''
        const pos = offsetPositions.get(place.id) || { lng: place.lng, lat: place.lat }

        const content = `<div class="map-pin${bounceClass}"><svg width="28" height="36" viewBox="0 0 28 36" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M14 0C6.27 0 0 6.27 0 14c0 10.5 14 22 14 22s14-11.5 14-22c0-7.73-6.27-14-14-14z" fill="#EF4444" stroke="#fff" stroke-width="2"/><circle cx="14" cy="14" r="5" fill="#fff"/></svg></div>`

        const marker = new AMap.Marker({
          position: [pos.lng, pos.lat],
          content,
          offset: new AMap.Pixel(-14, -36),
          map,
        })

        marker.on('click', () => {
          onMarkerClick?.(place)
        })

        markersRef.current.push(marker)
        renderedPlaceIdsRef.current.add(place.id)
      }
    }
  }

  renderMarkersRef.current = renderMarkers

  useEffect(() => {
    if (!map) return

    let cancelled = false
    const handlers: { zoomEnd?: () => void; moveEnd?: () => void } = {}

    loadAMap().then((AMap) => {
      if (cancelled || !map) return
      AMapRef.current = AMap
      zoomRef.current = map.getZoom()
      renderMarkersRef.current()

      handlers.zoomEnd = () => {
        const newZoom = map.getZoom()
        if (Math.abs(newZoom - zoomRef.current) < 0.01) return
        zoomRef.current = newZoom
        renderMarkersRef.current()
      }

      // moveend 在 setZoomAndCenter 后必定触发（比 zoomend 更可靠）
      handlers.moveEnd = () => {
        const newZoom = map.getZoom()
        zoomRef.current = newZoom
        renderMarkersRef.current()
      }

      map.on('zoomend', handlers.zoomEnd)
      map.on('moveend', handlers.moveEnd)
    })

    return () => {
      cancelled = true
      if (handlers.zoomEnd) map.off('zoomend', handlers.zoomEnd)
      if (handlers.moveEnd) map.off('moveend', handlers.moveEnd)
    }
  }, [map])

  // 选中地点变化时强制重渲染（处理从列表点击地点的场景）
  useEffect(() => {
    if (!map || !AMapRef.current || selectedPlaceId === undefined) return
    // 延迟一帧确保地图缩放动画已开始
    requestAnimationFrame(() => {
      renderMarkersRef.current()
    })
  }, [selectedPlaceId, map])

  useEffect(() => {
    if (!map || !AMapRef.current) return
    renderMarkersRef.current()
  }, [map, places])

  useEffect(() => {
    return () => {
      clearMarkers()
    }
  }, [])

  return null
}
