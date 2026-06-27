import { useEffect, useMemo, useState } from 'react'
import {
  MapPin,
  Search,
  ChevronDown,
  ChevronRight,
  Route,
  PanelLeftClose,
  PanelLeftOpen,
  Clock,
  Trash2,
  Play,
  Check,
  Circle,
  CheckCircle2,
  Timer,
  XCircle,
} from 'lucide-react'
import type { PlaceStatus } from '@/types'
import { usePlaceStore } from '@/stores/placeStore'
import { useRouteStore } from '@/stores/routeStore'
import { groupByCity } from '@/lib/clustering'
import {
  setPanelCollapsed,
  getPanelCollapsed,
  setPanelTab,
  getPanelTab,
} from '@/lib/cache'
import type { Place, RoutePlan, RouteStatus } from '@/types'
import RoutePlanner from './RoutePlanner'

interface SidePanelProps {
  map: any | null
  onPlaceSelect?: (place: Place) => void
}

type TabType = 'all' | 'group' | 'route'

const STATUS_LABELS: Record<RouteStatus, string> = {
  planned: '已规划',
  in_progress: '进行中',
  completed: '已完成',
}

const STATUS_COLORS: Record<RouteStatus, string> = {
  planned: 'text-text-secondary',
  in_progress: 'text-primary',
  completed: 'text-green-600',
}

const PLACE_STATUS_OPTIONS: { value: PlaceStatus | 'all'; label: string; icon: React.ReactNode }[] = [
  { value: 'all', label: '全部', icon: null },
  { value: 'wishlist', label: '想去', icon: <Circle className="h-3 w-3" /> },
  { value: 'visited', label: '去过', icon: <CheckCircle2 className="h-3 w-3" /> },
  { value: 'pending', label: '待定', icon: <Timer className="h-3 w-3" /> },
]

const PLACE_STATUS_STYLE: Record<PlaceStatus, { color: string; bg: string; icon: React.ReactNode }> = {
  wishlist: { color: 'text-blue-500', bg: 'bg-blue-50', icon: <Circle className="h-3 w-3 text-blue-500" /> },
  visited: { color: 'text-green-500', bg: 'bg-green-50', icon: <CheckCircle2 className="h-3 w-3 text-green-500" /> },
  pending: { color: 'text-gray-400', bg: 'bg-gray-50', icon: <Timer className="h-3 w-3 text-gray-400" /> },
  abandoned: { color: 'text-red-400', bg: 'bg-red-50', icon: <XCircle className="h-3 w-3 text-red-400" /> },
}

export default function SidePanel({ map, onPlaceSelect }: SidePanelProps) {
  const places = usePlaceStore((s) => s.places)
  const statusFilter = usePlaceStore((s) => s.statusFilter)
  const setStatusFilter = usePlaceStore((s) => s.setStatusFilter)
  const routes = useRouteStore((s) => s.routes)
  const fetchRoutes = useRouteStore((s) => s.fetchRoutes)
  const updateRouteStatus = useRouteStore((s) => s.updateRouteStatus)
  const deleteRoute = useRouteStore((s) => s.deleteRoute)
  const activeRouteId = useRouteStore((s) => s.activeRouteId)
  const setActiveRoute = useRouteStore((s) => s.setActiveRoute)

  const [collapsed, setCollapsed] = useState<boolean>(() => getPanelCollapsed())
  const [tab, setTab] = useState<TabType>(() => getPanelTab())
  const [keyword, setKeyword] = useState('')
  const [expandedCities, setExpandedCities] = useState<Set<string>>(new Set())
  const [expandedDistricts, setExpandedDistricts] = useState<Set<string>>(
    new Set()
  )
  const [plannerState, setPlannerState] = useState<{
    visible: boolean
    places: Place[]
    streetName: string
  }>({ visible: false, places: [], streetName: '' })

  // 加载路线列表
  useEffect(() => {
    if (tab === 'route') {
      fetchRoutes()
    }
  }, [tab, fetchRoutes])

  const handleToggleCollapse = () => {
    const next = !collapsed
    setCollapsed(next)
    setPanelCollapsed(next)
  }

  const handleTabChange = (next: TabType) => {
    setTab(next)
    setPanelTab(next)
    if (collapsed) {
      setCollapsed(false)
      setPanelCollapsed(false)
    }
  }

  const handlePlaceClick = (place: Place) => {
    if (map) {
      map.setZoomAndCenter(15, [place.lng, place.lat])
    }
    onPlaceSelect?.(place)
  }

  const handleGenerateRoute = (streetPlaces: Place[], streetName: string) => {
    setPlannerState({ visible: true, places: streetPlaces, streetName })
  }

  const handleRouteClick = (route: RoutePlan) => {
    setActiveRoute(route.id)
    if (map && route.places.length > 0) {
      const firstPlace = route.places[0].place
      if (firstPlace) {
        map.setZoomAndCenter(13, [firstPlace.lng, firstPlace.lat])
      }
    }
  }

  const handleRouteStatusChange = async (
    routeId: number,
    status: RouteStatus
  ) => {
    try {
      await updateRouteStatus(routeId, status)
    } catch (err) {
      console.error('更新路线状态失败:', err)
    }
  }

  const handleRouteDelete = async (routeId: number) => {
    if (!confirm('确定要删除这条路线吗？')) return
    try {
      await deleteRoute(routeId)
    } catch (err) {
      console.error('删除路线失败:', err)
    }
  }

  const toggleSet = (
    setter: React.Dispatch<React.SetStateAction<Set<string>>>,
    key: string
  ) => {
    setter((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const kw = keyword.trim().toLowerCase()

  const sortedPlaces = useMemo(() => {
    const basePlaces = statusFilter === 'all' ? places : places.filter((p) => p.status === statusFilter)
    const filtered = kw
      ? basePlaces.filter(
          (p) =>
            p.name.toLowerCase().includes(kw) ||
            p.street.toLowerCase().includes(kw) ||
            p.tags.some((t) => t.toLowerCase().includes(kw))
        )
      : basePlaces
    return [...filtered].sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
  }, [places, kw, statusFilter])

  const cityGroups = useMemo(() => {
    const filtered = kw
      ? places.filter(
          (p) =>
            p.name.toLowerCase().includes(kw) ||
            p.street.toLowerCase().includes(kw)
        )
      : places
    return groupByCity(filtered)
  }, [places, kw])

  const formatTotalTime = (seconds: number | null): string => {
    if (!seconds) return '未知'
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.round((seconds % 3600) / 60)
    if (hours > 0) {
      return minutes > 0 ? `${hours}小时${minutes}分钟` : `${hours}小时`
    }
    return `${minutes}分钟`
  }

  return (
    <>
      <aside
        className="relative flex shrink-0 flex-col border-r border-border bg-panel overflow-hidden"
        style={{ width: collapsed ? 48 : 320, transition: 'width 250ms ease' }}
      >
        {collapsed ? (
          <>
            <button
              onClick={handleToggleCollapse}
              className="flex h-12 shrink-0 items-center justify-center border-b border-border text-text-secondary hover:bg-bg hover:text-text"
              title="展开面板"
            >
              <PanelLeftOpen className="h-5 w-5" />
            </button>
            <button
              onClick={() => handleTabChange('all')}
              className={`flex h-12 shrink-0 items-center justify-center border-b border-border ${
                tab === 'all'
                  ? 'text-primary'
                  : 'text-text-secondary hover:bg-bg hover:text-text'
              }`}
              title="全部"
            >
              <MapPin className="h-5 w-5" />
            </button>
            <button
              onClick={() => handleTabChange('group')}
              className={`flex h-12 shrink-0 items-center justify-center border-b border-border ${
                tab === 'group'
                  ? 'text-primary'
                  : 'text-text-secondary hover:bg-bg hover:text-text'
              }`}
              title="分组"
            >
              <Route className="h-5 w-5" />
            </button>
            <button
              onClick={() => handleTabChange('route')}
              className={`flex h-12 shrink-0 items-center justify-center border-b border-border ${
                tab === 'route'
                  ? 'text-primary'
                  : 'text-text-secondary hover:bg-bg hover:text-text'
              }`}
              title="路线"
            >
              <Clock className="h-5 w-5" />
            </button>
          </>
        ) : (
          <>
            <header className="flex h-12 shrink-0 items-center justify-between border-b border-border px-3">
              <span className="text-sm font-semibold text-text">心愿单</span>
              <button
                onClick={handleToggleCollapse}
                className="rounded-md p-1 text-text-secondary hover:bg-bg hover:text-text"
                title="折叠面板"
              >
                <PanelLeftClose className="h-5 w-5" />
              </button>
            </header>

            <div className="flex shrink-0 border-b border-border">
              <button
                onClick={() => handleTabChange('all')}
                className={`flex-1 py-2 text-sm font-medium transition-colors ${
                  tab === 'all'
                    ? 'border-b-2 border-primary text-primary'
                    : 'text-text-secondary hover:text-text'
                }`}
              >
                全部
              </button>
              <button
                onClick={() => handleTabChange('group')}
                className={`flex-1 py-2 text-sm font-medium transition-colors ${
                  tab === 'group'
                    ? 'border-b-2 border-primary text-primary'
                    : 'text-text-secondary hover:text-text'
                }`}
              >
                分组
              </button>
              <button
                onClick={() => handleTabChange('route')}
                className={`flex-1 py-2 text-sm font-medium transition-colors ${
                  tab === 'route'
                    ? 'border-b-2 border-primary text-primary'
                    : 'text-text-secondary hover:text-text'
                }`}
              >
                路线
              </button>
            </div>

            {tab === 'all' ? (
              <div className="flex flex-1 flex-col overflow-hidden">
                <div className="shrink-0 border-b border-border p-3">
                  <h2 className="mb-2 text-sm font-medium text-text">
                    全部心愿单 ({sortedPlaces.length})
                  </h2>
                  <div className="flex items-center rounded-lg border border-border bg-bg px-2">
                    <Search className="h-4 w-4 shrink-0 text-text-secondary" />
                    <input
                      type="text"
                      value={keyword}
                      onChange={(e) => setKeyword(e.target.value)}
                      placeholder="搜索名称、街道或标签..."
                      className="w-full bg-transparent px-2 py-1.5 text-sm text-text outline-none placeholder:text-text-secondary"
                    />
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {PLACE_STATUS_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => setStatusFilter(opt.value)}
                        className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                          statusFilter === opt.value
                            ? 'bg-primary text-white'
                            : 'bg-bg text-text-secondary hover:text-text'
                        }`}
                      >
                        {opt.icon}
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto">
                  {sortedPlaces.length === 0 ? (
                    <p className="px-3 py-4 text-center text-sm text-text-secondary">
                      {kw ? '未找到匹配的地点' : '心愿单为空'}
                    </p>
                  ) : (
                    sortedPlaces.map((place) => {
                      const statusStyle = PLACE_STATUS_STYLE[place.status] || PLACE_STATUS_STYLE.wishlist
                      return (
                      <button
                        key={place.id}
                        onClick={() => handlePlaceClick(place)}
                        className="flex w-full flex-col items-start gap-0.5 border-b border-border px-3 py-2.5 text-left hover:bg-bg"
                      >
                        <div className="flex items-center gap-1.5">
                          {statusStyle.icon}
                          <span className="text-sm font-medium text-text">
                            {place.name}
                          </span>
                        </div>
                        <span className="text-xs text-text-secondary">
                          {[place.district, place.street]
                            .filter(Boolean)
                            .join(' · ') || '未知区域'}
                        </span>
                      </button>
                      )
                    })
                  )}
                </div>
              </div>
            ) : tab === 'group' ? (
              <div className="flex flex-1 flex-col overflow-hidden">
                <div className="shrink-0 border-b border-border p-3">
                  <h2 className="mb-2 text-sm font-medium text-text">
                    按区分组 ({cityGroups.length}组)
                  </h2>
                  <div className="flex items-center rounded-lg border border-border bg-bg px-2">
                    <Search className="h-4 w-4 shrink-0 text-text-secondary" />
                    <input
                      type="text"
                      value={keyword}
                      onChange={(e) => setKeyword(e.target.value)}
                      placeholder="搜索名称或街道..."
                      className="w-full bg-transparent px-2 py-1.5 text-sm text-text outline-none placeholder:text-text-secondary"
                    />
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto">
                  {cityGroups.length === 0 ? (
                    <p className="px-3 py-4 text-center text-sm text-text-secondary">
                      {kw ? '未找到匹配的地点' : '心愿单为空'}
                    </p>
                  ) : (
                    cityGroups.map((city) => {
                      const cityExpanded = expandedCities.has(city.city)
                      return (
                        <div key={city.city} className="border-b border-border">
                          <button
                            onClick={() =>
                              toggleSet(setExpandedCities, city.city)
                            }
                            className="flex w-full items-center gap-1 px-3 py-2 text-left hover:bg-bg"
                          >
                            {cityExpanded ? (
                              <ChevronDown className="h-4 w-4 shrink-0 text-text-secondary" />
                            ) : (
                              <ChevronRight className="h-4 w-4 shrink-0 text-text-secondary" />
                            )}
                            <span className="text-sm font-medium text-text">
                              {city.city}
                            </span>
                            <span className="text-xs text-text-secondary">
                              ({city.count})
                            </span>
                          </button>
                          {cityExpanded &&
                            city.districts.map((district) => {
                              const districtKey = `${city.city}|${district.district}`
                              const districtExpanded =
                                expandedDistricts.has(districtKey)
                              return (
                                <div
                                  key={districtKey}
                                  className="border-t border-border"
                                >
                                  <div className="flex items-center">
                                    <button
                                      onClick={() =>
                                        toggleSet(setExpandedDistricts, districtKey)
                                      }
                                      className="flex flex-1 items-center gap-1 px-3 py-2 pl-6 text-left hover:bg-bg"
                                    >
                                      {districtExpanded ? (
                                        <ChevronDown className="h-4 w-4 shrink-0 text-text-secondary" />
                                      ) : (
                                        <ChevronRight className="h-4 w-4 shrink-0 text-text-secondary" />
                                      )}
                                      <span className="text-sm text-text">
                                        {district.district}
                                      </span>
                                      <span className="text-xs text-text-secondary">
                                        ({district.count})
                                      </span>
                                    </button>
                                    {district.count >= 2 && (
                                      <button
                                        onClick={() => {
                                          handleGenerateRoute(
                                            district.places,
                                            district.district
                                          )
                                        }}
                                        className="mr-2 flex shrink-0 items-center gap-1 rounded-md border border-primary px-2 py-1 text-xs text-primary hover:bg-primary/10"
                                      >
                                        <Route className="h-3 w-3" />
                                        生成路线
                                      </button>
                                    )}
                                  </div>
                                  {districtExpanded &&
                                    district.places.map((place) => (
                                      <button
                                        key={place.id}
                                        onClick={() =>
                                          handlePlaceClick(place)
                                        }
                                        className="flex w-full items-center gap-1.5 border-t border-border px-3 py-2 pl-10 text-left hover:bg-bg"
                                      >
                                        <MapPin className="h-3.5 w-3.5 shrink-0 text-text-secondary" />
                                        <span className="text-sm text-text">
                                          {place.name}
                                        </span>
                                      </button>
                                    ))}
                                </div>
                              )
                            })}
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            ) : (
              <div className="flex flex-1 flex-col overflow-hidden">
                <div className="shrink-0 border-b border-border p-3">
                  <h2 className="text-sm font-medium text-text">
                    已规划路线 ({routes.length})
                  </h2>
                  <p className="mt-1 text-xs text-text-secondary">
                    在分组视图中点击「生成路线」创建新路线
                  </p>
                </div>
                <div className="flex-1 overflow-y-auto">
                  {routes.length === 0 ? (
                    <div className="px-3 py-8 text-center">
                      <Clock className="mx-auto mb-2 h-8 w-8 text-text-secondary opacity-50" />
                      <p className="text-sm text-text-secondary">
                        暂无路线
                      </p>
                      <p className="mt-1 text-xs text-text-secondary">
                        切换到「分组」标签生成路线
                      </p>
                    </div>
                  ) : (
                    routes.map((route) => (
                      <div
                        key={route.id}
                        className={`border-b border-border ${
                          activeRouteId === route.id ? 'bg-primary/5' : ''
                        }`}
                      >
                        <button
                          onClick={() => handleRouteClick(route)}
                          className="flex w-full flex-col items-start gap-1 px-3 py-3 text-left hover:bg-bg"
                        >
                          <div className="flex w-full items-center justify-between">
                            <span className="text-sm font-medium text-text">
                              {route.title}
                            </span>
                            <span
                              className={`text-xs ${STATUS_COLORS[route.status]}`}
                            >
                              {STATUS_LABELS[route.status]}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-text-secondary">
                            <span>{route.places.length}个地点</span>
                            <span>·</span>
                            <span>{formatTotalTime(route.estimated_time)}</span>
                          </div>
                        </button>
                        {/* 路线操作按钮 */}
                        <div className="flex items-center gap-1 px-3 pb-2">
                          {route.status === 'planned' && (
                            <button
                              onClick={() =>
                                handleRouteStatusChange(route.id, 'in_progress')
                              }
                              className="flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs text-text-secondary hover:bg-bg hover:text-text"
                              title="开始执行"
                            >
                              <Play className="h-3 w-3" />
                              开始
                            </button>
                          )}
                          {route.status === 'in_progress' && (
                            <button
                              onClick={() =>
                                handleRouteStatusChange(route.id, 'completed')
                              }
                              className="flex items-center gap-1 rounded-md border border-green-500 px-2 py-1 text-xs text-green-600 hover:bg-green-50"
                              title="标记完成"
                            >
                              <Check className="h-3 w-3" />
                              完成
                            </button>
                          )}
                          {(route.status === 'completed' ||
                            route.status === 'in_progress') && (
                            <button
                              onClick={() =>
                                handleRouteStatusChange(route.id, 'planned')
                              }
                              className="flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs text-text-secondary hover:bg-bg hover:text-text"
                              title="重置为已规划"
                            >
                              <Route className="h-3 w-3" />
                              重置
                            </button>
                          )}
                          <button
                            onClick={() => handleRouteDelete(route.id)}
                            className="flex items-center gap-1 rounded-md border border-danger px-2 py-1 text-xs text-danger hover:bg-danger/10"
                            title="删除路线"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </aside>

      {plannerState.visible && (
        <RoutePlanner
          places={plannerState.places}
          streetName={plannerState.streetName}
          onClose={() =>
            setPlannerState({ visible: false, places: [], streetName: '' })
          }
          onPlaceClick={(place) => {
            handlePlaceClick(place)
          }}
        />
      )}
    </>
  )
}
