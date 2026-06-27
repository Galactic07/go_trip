import { useEffect, useRef, useState } from 'react'
import { loadAMap } from '@/lib/amap'
import { usePlaceStore } from '@/stores/placeStore'
import SearchBox from '@/components/SearchBox'
import MapMarkers from '@/components/MapMarkers'
import MapRouteLine from '@/components/MapRouteLine'
import MapExplore from '@/components/MapExplore'
import type { Place } from '@/types'

interface MapViewProps {
  onMapReady?: (map: any) => void
  onPlaceSelect?: (place: Place | null) => void
  selectedPlaceId?: number | null
}

export default function MapView({ onMapReady, onPlaceSelect, selectedPlaceId }: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<any>(null)
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>(
    'loading'
  )
  const [mapInstance, setMapInstance] = useState<any>(null)

  const fetchPlaces = usePlaceStore((s) => s.fetchPlaces)

  const initMap = async () => {
    setStatus('loading')
    try {
      const AMap = await loadAMap()
      if (!containerRef.current) return

      if (mapRef.current) {
        mapRef.current.destroy()
        mapRef.current = null
      }

      mapRef.current = new AMap.Map(containerRef.current, {
        center: [114.0579, 22.5431],
        zoom: 11,
        viewMode: '3D',
      })

      setMapInstance(mapRef.current)
      onMapReady?.(mapRef.current)
      setStatus('success')
      fetchPlaces()
    } catch {
      setStatus('error')
    }
  }

  useEffect(() => {
    initMap()

    return () => {
      if (mapRef.current) {
        mapRef.current.destroy()
        mapRef.current = null
      }
    }
  }, [])

  return (
    <div className="w-full h-full relative">
      <div id="amap-container" ref={containerRef} className="w-full h-full" />

      {status === 'success' && mapInstance && (
        <>
          <SearchBox
            map={mapInstance}
            onPlaceAdded={() => {
              fetchPlaces()
            }}
          />
          <MapMarkers
            map={mapInstance}
            onMarkerClick={(place) => onPlaceSelect?.(place)}
            selectedPlaceId={selectedPlaceId}
          />
          <MapRouteLine map={mapInstance} />
          <MapExplore
            map={mapInstance}
          />
        </>
      )}

      {status === 'loading' && (
        <div className="absolute inset-0 flex items-center justify-center bg-bg">
          <p className="text-text-secondary">地图加载中...</p>
        </div>
      )}
      {status === 'error' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-bg gap-4">
          <p className="text-text-secondary">地图加载失败，请检查网络连接后刷新页面</p>
          <button
            onClick={initMap}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:opacity-90 transition-opacity"
          >
            重试
          </button>
        </div>
      )}
    </div>
  )
}
