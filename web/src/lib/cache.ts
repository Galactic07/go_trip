import type { Place } from '@/types'

const PLACES_CACHE_KEY = 'gotrip:places:cache'
const PANEL_COLLAPSED_KEY = 'gotrip:panel:collapsed'
const PANEL_TAB_KEY = 'gotrip:panel:tab'

export function cachePlaces(places: Place[]): void {
  try {
    localStorage.setItem(PLACES_CACHE_KEY, JSON.stringify(places))
  } catch {}
}

export function getCachedPlaces(): Place[] {
  try {
    const data = localStorage.getItem(PLACES_CACHE_KEY)
    if (!data) return []
    return JSON.parse(data) as Place[]
  } catch {
    return []
  }
}

export function setPanelCollapsed(collapsed: boolean): void {
  try {
    localStorage.setItem(PANEL_COLLAPSED_KEY, String(collapsed))
  } catch {}
}

export function getPanelCollapsed(): boolean {
  try {
    return localStorage.getItem(PANEL_COLLAPSED_KEY) === 'true'
  } catch {
    return false
  }
}

export function setPanelTab(tab: 'all' | 'group' | 'route'): void {
  try {
    localStorage.setItem(PANEL_TAB_KEY, tab)
  } catch {}
}

export function getPanelTab(): 'all' | 'group' | 'route' {
  try {
    const tab = localStorage.getItem(PANEL_TAB_KEY)
    if (tab === 'group' || tab === 'route') return tab
    return 'all'
  } catch {
    return 'all'
  }
}
