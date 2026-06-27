import { useState } from 'react'
import MapView from '@/components/MapView'
import PlaceDetail from '@/components/PlaceDetail'
import SidePanel from '@/components/SidePanel'
import EmptyState from '@/components/EmptyState'
import { usePlaceStore } from '@/stores/placeStore'
import type { Place } from '@/types'

function App() {
  const [map, setMap] = useState<any>(null)
  const [selectedPlaceId, setSelectedPlaceId] = useState<number | null>(null)
  const places = usePlaceStore((s) => s.places)
  const loading = usePlaceStore((s) => s.loading)
  const selectedPlace =
    places.find((p) => p.id === selectedPlaceId) ?? null

  const handlePlaceSelect = (place: Place | null) => {
    setSelectedPlaceId(place ? place.id : null)
  }

  return (
    <div className="flex h-screen flex-col bg-bg text-text">
      <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border bg-panel px-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white font-bold text-sm">
          GT
        </div>
        <span className="text-lg font-semibold text-text">GoTrip</span>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <SidePanel map={map} onPlaceSelect={handlePlaceSelect} />

        <main className="relative flex flex-1 overflow-hidden">
          <MapView
            onMapReady={setMap}
            onPlaceSelect={handlePlaceSelect}
            selectedPlaceId={selectedPlaceId}
          />
          {places.length === 0 && !loading && <EmptyState />}
          {selectedPlace && (
            <PlaceDetail
              place={selectedPlace}
              onClose={() => setSelectedPlaceId(null)}
              onUpdate={() => {
                const updated = places.find((p) => p.id === selectedPlaceId)
                if (updated) setSelectedPlaceId(updated.id)
              }}
              onDelete={() => {
                setSelectedPlaceId(null)
              }}
            />
          )}
        </main>
      </div>
    </div>
  )
}

export default App
