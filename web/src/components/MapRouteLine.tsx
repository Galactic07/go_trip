import { useEffect, useRef } from 'react'
import { loadAMap } from '@/lib/amap'
import { useRouteStore } from '@/stores/routeStore'

interface MapRouteLineProps {
  map: any | null
}

export default function MapRouteLine({ map }: MapRouteLineProps) {
  const AMapRef = useRef<any>(null)
  const polylinesRef = useRef<any[]>([])
  const markersRef = useRef<any[]>([])
  const activeRouteId = useRouteStore((s) => s.activeRouteId)
  const routes = useRouteStore((s) => s.routes)

  useEffect(() => {
    loadAMap().then((AMap) => {
      AMapRef.current = AMap
    })
  }, [])

  const clearOverlays = () => {
    for (const line of polylinesRef.current) {
      try {
        line.setMap(null)
      } catch {
        // ignore
      }
    }
    for (const marker of markersRef.current) {
      try {
        marker.setMap(null)
      } catch {
        // ignore
      }
    }
    polylinesRef.current = []
    markersRef.current = []
  }

  useEffect(() => {
    if (!map || !AMapRef.current) return
    const AMap = AMapRef.current

    clearOverlays()

    if (activeRouteId === null) return

    const route = routes.find((r) => r.id === activeRouteId)
    if (!route || route.places.length < 2) return

    // 按 sort_order 排序
    const sortedPlaces = [...route.places]
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((rp) => rp.place)
      .filter(Boolean)

    if (sortedPlaces.length < 2) return

    // 绘制连接线（虚线 + 箭头）
    const path = sortedPlaces.map((p) => [p.lng, p.lat])

    const polyline = new AMap.Polyline({
      path,
      strokeColor: '#2563EB',
      strokeWeight: 3,
      strokeOpacity: 0.8,
      strokeStyle: 'dashed',
      showDir: true,
      lineJoin: 'round',
      lineCap: 'round',
    })

    polyline.setMap(map)
    polylinesRef.current.push(polyline)

    // 绘制序号标记
    sortedPlaces.forEach((place, index) => {
      const content = `<div class="route-number-marker" style="position:relative;width:28px;height:28px;background:#2563EB;color:white;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:bold;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);">${index + 1}</div>`

      const marker = new AMap.Marker({
        position: [place.lng, place.lat],
        content,
        offset: new AMap.Pixel(-14, -14),
        zIndex: 200,
        map,
      })

      markersRef.current.push(marker)
    })

    // 自动调整视野以包含所有点
    try {
      map.setFitView([...polylinesRef.current, ...markersRef.current])
    } catch {
      // 如果 setFitView 失败，手动设置中心点
      const firstPlace = sortedPlaces[0]
      map.setZoomAndCenter(13, [firstPlace.lng, firstPlace.lat])
    }

    return () => {
      clearOverlays()
    }
  }, [map, activeRouteId, routes])

  return null
}
