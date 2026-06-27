import { useState, useMemo, useEffect, useRef } from 'react'
import {
  X,
  GripVertical,
  RefreshCw,
  Save,
  Car,
  Footprints,
  MapPin,
  Clock,
  Loader2,
  CloudSun,
  AlertTriangle,
  Share2,
  Download,
  Copy,
  Check,
  Image,
} from 'lucide-react'
import { useRouteStore } from '@/stores/routeStore'
import { fetchWeather } from '@/lib/weatherApi'
import { exportElementAsImage } from '@/lib/exportImage'
import { copyRouteAsText, downloadRouteAsText, type RouteTextData } from '@/lib/exportText'
import type { Place, WeatherResult } from '@/types'

interface RoutePlannerProps {
  places: Place[]
  streetName: string
  onClose: () => void
  onPlaceClick?: (place: Place) => void
}

interface RouteItem {
  place: Place
  sortOrder: number
  driveDistance: number | null
  driveDuration: number | null
  walkDistance: number | null
  walkDuration: number | null
}

export default function RoutePlanner({
  places,
  streetName,
  onClose,
  onPlaceClick,
}: RoutePlannerProps) {
  const [items, setItems] = useState<RouteItem[]>(() =>
    places.map((place, index) => ({
      place,
      sortOrder: index,
      driveDistance: null,
      driveDuration: null,
      walkDistance: null,
      walkDuration: null,
    }))
  )
  const [driving, setDriving] = useState(false)
  const [saving, setSaving] = useState(false)
  const [routeName, setRouteName] = useState(`Day1 · ${streetName}`)
  const [showSaveInput, setShowSaveInput] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const [weather, setWeather] = useState<WeatherResult | null>(null)
  const [weatherLoading, setWeatherLoading] = useState(false)

  // 导出相关状态
  const [showExportModal, setShowExportModal] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [copied, setCopied] = useState(false)
  const exportCardRef = useRef<HTMLDivElement>(null)

  // 计算路线中心点和户外地点比例
  const routeCenter = useMemo(() => {
    if (items.length === 0) return null
    const avgLat = items.reduce((s, i) => s + i.place.lat, 0) / items.length
    const avgLng = items.reduce((s, i) => s + i.place.lng, 0) / items.length
    return { lat: avgLat, lng: avgLng }
  }, [items])

  const outdoorRatio = useMemo(() => {
    if (items.length === 0) return 0
    const outdoorCount = items.filter(
      (i) => i.place.scene_type === 'outdoor' || i.place.scene_type === 'hybrid' || i.place.scene_type === 'unknown'
    ).length
    return outdoorCount / items.length
  }, [items])

  // 获取天气信息
  useEffect(() => {
    if (!routeCenter) return
    let cancelled = false
    const fetch = async () => {
      setWeatherLoading(true)
      try {
        const data = await fetchWeather(routeCenter.lat, routeCenter.lng)
        if (!cancelled) setWeather(data)
      } catch {
        if (!cancelled) setWeather(null)
      } finally {
        if (!cancelled) setWeatherLoading(false)
      }
    }
    fetch()
    return () => { cancelled = true }
  }, [routeCenter?.lat, routeCenter?.lng])

  const createRoute = useRouteStore((s) => s.createRoute)

  const totalTime = useMemo(() => {
    return items.reduce((sum, item) => {
      const duration = driving ? item.driveDuration : item.walkDuration
      return sum + (duration ?? 0)
    }, 0)
  }, [items, driving])

  const totalDistance = useMemo(() => {
    return items.reduce((sum, item) => {
      const distance = driving ? item.driveDistance : item.walkDistance
      return sum + (distance ?? 0)
    }, 0)
  }, [items, driving])

  const totalStayDuration = useMemo(() => {
    return items.reduce((sum, item) => sum + (item.place.stay_duration ?? 60), 0)
  }, [items])

  const totalEstimatedCost = useMemo(() => {
    return items.reduce((sum, item) => sum + (item.place.estimated_cost ?? 0), 0)
  }, [items])

  const formatDuration = (seconds: number): string => {
    if (seconds < 60) return `${seconds}秒`
    const minutes = Math.round(seconds / 60)
    if (minutes < 60) return `${minutes}分钟`
    const hours = Math.floor(minutes / 60)
    const remainingMinutes = minutes % 60
    return remainingMinutes > 0 ? `${hours}小时${remainingMinutes}分钟` : `${hours}小时`
  }

  const formatStayDuration = (minutes: number): string => {
    if (minutes < 60) return `${minutes}分钟`
    const hours = Math.floor(minutes / 60)
    const remainingMinutes = minutes % 60
    return remainingMinutes > 0 ? `${hours}h${remainingMinutes}min` : `${hours}小时`
  }

  const formatDistance = (meters: number): string => {
    if (meters < 1000) return `${meters}米`
    return `${(meters / 1000).toFixed(1)}km`
  }

  const formatTotalTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.round((seconds % 3600) / 60)
    if (hours > 0) {
      return minutes > 0 ? `约${hours}小时${minutes}分钟` : `约${hours}小时`
    }
    return `约${minutes}分钟`
  }

  const handleDragStart = (index: number) => {
    setDraggedIndex(index)
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    if (draggedIndex === null || draggedIndex === index) return
    setDragOverIndex(index)
  }

  const handleDrop = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    if (draggedIndex === null || draggedIndex === index) return

    const newItems = [...items]
    const [draggedItem] = newItems.splice(draggedIndex, 1)
    newItems.splice(index, 0, draggedItem)

    // 重新排序
    const reordered = newItems.map((item, i) => ({
      ...item,
      sortOrder: i,
    }))
    setItems(reordered)
    setDraggedIndex(null)
    setDragOverIndex(null)
  }

  const handleDragEnd = () => {
    setDraggedIndex(null)
    setDragOverIndex(null)
  }

  const handleReorder = () => {
    // 恢复原始顺序
    const reordered = places.map((place, index) => ({
      place,
      sortOrder: index,
      driveDistance: null,
      driveDuration: null,
      walkDistance: null,
      walkDuration: null,
    }))
    setItems(reordered)
  }

  const handleSave = async () => {
    if (!routeName.trim()) {
      setError('请输入路线名称')
      return
    }
    setSaving(true)
    setError(null)
    try {
      await createRoute({
        title: routeName.trim(),
        place_ids: items.map((item) => item.place.id),
        auto_optimize: false,
        driving,
      })
      onClose()
    } catch (err) {
      const e = err as Error
      setError(e.message || '保存失败')
    } finally {
      setSaving(false)
    }
  }

  const handleOptimizeAndSave = async () => {
    setSaving(true)
    setError(null)
    try {
      await createRoute({
        title: routeName.trim() || `Day1 · ${streetName}`,
        place_ids: items.map((item) => item.place.id),
        auto_optimize: true,
        driving,
      })
      onClose()
    } catch (err) {
      const e = err as Error
      setError(e.message || '保存失败')
    } finally {
      setSaving(false)
    }
  }

  // --- 导出相关方法 ---

  const buildExportData = (): RouteTextData => ({
    title: routeName,
    streetName,
    items: items.map((item) => ({
      place: item.place,
      driveDistance: item.driveDistance,
      driveDuration: item.driveDuration,
      walkDistance: item.walkDistance,
      walkDuration: item.walkDuration,
    })),
    driving,
    weather,
  })

  const handleExportImage = async () => {
    if (!exportCardRef.current) return
    setExporting(true)
    try {
      await exportElementAsImage(exportCardRef.current, {
        format: 'png',
        filename: routeName.trim() || `路线_${streetName}`,
      })
    } catch (err) {
      alert('图片导出失败，请重试')
    } finally {
      setExporting(false)
    }
  }

  const handleCopyText = async () => {
    try {
      await copyRouteAsText(buildExportData())
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      alert('复制失败，请重试')
    }
  }

  const handleDownloadText = () => {
    downloadRouteAsText(buildExportData(), routeName.trim() || `路线_${streetName}`)
  }

  return (
    <div
      className="absolute inset-0 z-30 flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="relative flex max-h-[85vh] w-[520px] max-w-[90vw] flex-col rounded-xl bg-panel shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-border p-5">
          <div className="flex-1 pr-4">
            <h2 className="text-lg font-semibold text-text">
              路线规划 · {streetName}
            </h2>
            <p className="mt-1 text-sm text-text-secondary">
              {items.length}个地点 · 拖拽调整顺序
            </p>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 rounded-md p-1 text-text-secondary hover:bg-bg hover:text-text"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* 路线概览卡片 */}
        <div className="shrink-0 border-b border-border bg-bg/50 px-5 py-3">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-text-secondary">
            <span className="font-medium text-text">📍 {items.length}个地点</span>
            <span>🕐 游玩约{formatStayDuration(totalStayDuration)}</span>
            <span>{driving ? '🚗' : '🚶'} 交通约{formatDuration(totalTime)}</span>
            {totalDistance > 0 && <span>距离约{formatDistance(totalDistance)}</span>}
            {totalEstimatedCost > 0 && <span className="font-medium text-text">💰 约 ¥{totalEstimatedCost}</span>}
          </div>
          <p className="mt-1 text-xs text-text-secondary/70">
            预计总耗时：约 {formatStayDuration(totalStayDuration + Math.round(totalTime / 60))}（含交通+游玩）
          </p>

          {/* 天气感知提示 */}
          <div className="mt-2 rounded-md border border-border bg-panel p-2.5">
            {weatherLoading ? (
              <div className="flex items-center gap-1.5 text-xs text-text-secondary">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                正在获取天气信息...
              </div>
            ) : weather ? (
              <>
                <div className="flex items-center gap-1.5 text-xs text-text">
                  <CloudSun className="h-3.5 w-3.5" />
                  <span className="font-medium">{weather.description}</span>
                  <span>{Math.round(weather.temperature)}°C</span>
                  {(outdoorRatio >= 0.5) && weather.is_rainy && (
                    <span className="ml-auto flex items-center gap-1 text-amber-600">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      雨天，路线中户外地点较多（{Math.round(outdoorRatio * 100)}%），建议携带雨具
                    </span>
                  )}
                  {(outdoorRatio >= 0.5) && weather.is_hot && (
                    <span className="ml-auto flex items-center gap-1 text-orange-500">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      高温预警，建议早晚出行
                    </span>
                  )}
                  {(outdoorRatio >= 0.5) && weather.is_cold && (
                    <span className="ml-auto flex items-center gap-1 text-blue-400">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      天气较冷，注意保暖
                    </span>
                  )}
                </div>
                {!weather.is_rainy && !weather.is_hot && !weather.is_cold && outdoorRatio >= 0.5 && (
                  <p className="mt-1 text-xs text-green-600">今天天气适合户外游玩！</p>
                )}
              </>
            ) : (
              <p className="text-xs text-text-secondary">天气信息暂不可用</p>
            )}
          </div>
        </div>

        {/* 交通方式切换 */}
        <div className="flex shrink-0 items-center gap-2 border-b border-border p-4">
          <span className="text-sm text-text-secondary">交通方式：</span>
          <div className="flex rounded-lg border border-border p-0.5">
            <button
              onClick={() => setDriving(false)}
              className={`flex items-center gap-1 rounded-md px-3 py-1.5 text-sm transition-colors ${
                !driving
                  ? 'bg-primary text-white'
                  : 'text-text-secondary hover:text-text'
              }`}
            >
              <Footprints className="h-3.5 w-3.5" />
              步行
            </button>
            <button
              onClick={() => setDriving(true)}
              className={`flex items-center gap-1 rounded-md px-3 py-1.5 text-sm transition-colors ${
                driving
                  ? 'bg-primary text-white'
                  : 'text-text-secondary hover:text-text'
              }`}
            >
              <Car className="h-3.5 w-3.5" />
              驾车
            </button>
          </div>
        </div>

        {/* 路线列表 */}
        <div className="flex-1 overflow-y-auto p-4">
          {error && (
            <div className="mb-3 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
              {error}
            </div>
          )}

          <div className="space-y-1">
            {items.map((item, index) => (
              <div key={item.place.id}>
                <div
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDrop={(e) => handleDrop(e, index)}
                  onDragEnd={handleDragEnd}
                  className={`group flex items-center gap-3 rounded-lg border p-3 transition-colors ${
                    dragOverIndex === index && draggedIndex !== null
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:bg-bg'
                  } ${draggedIndex === index ? 'opacity-50' : ''}`}
                >
                  <div className="flex shrink-0 cursor-grab items-center text-text-secondary group-hover:text-text">
                    <GripVertical className="h-4 w-4" />
                  </div>
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
                    {index + 1}
                  </div>
                  <button
                    onClick={() => onPlaceClick?.(item.place)}
                    className="flex flex-1 items-center gap-2 text-left"
                  >
                    <MapPin className="h-4 w-4 shrink-0 text-text-secondary" />
                    <span className="text-sm font-medium text-text">
                      {item.place.name}
                    </span>
                  </button>
                </div>

                {/* 距离/时间信息 */}
                {index < items.length - 1 && (
                  <div className="flex items-center justify-center py-1">
                    <div className="flex items-center gap-1.5 text-xs text-text-secondary">
                      {driving ? (
                        <>
                          <Car className="h-3 w-3" />
                          <span>
                            驾车
                            {item.driveDuration
                              ? formatDuration(item.driveDuration)
                              : '计算中'}
                            {item.driveDistance
                              ? ` · ${formatDistance(item.driveDistance)}`
                              : ''}
                          </span>
                        </>
                      ) : (
                        <>
                          <Footprints className="h-3 w-3" />
                          <span>
                            步行
                            {item.walkDuration
                              ? formatDuration(item.walkDuration)
                              : '计算中'}
                            {item.walkDistance
                              ? ` · ${formatDistance(item.walkDistance)}`
                              : ''}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* 总计 */}
          <div className="mt-4 flex items-center justify-between rounded-lg bg-bg px-4 py-3">
            <div className="flex items-center gap-2 text-sm text-text-secondary">
              <Clock className="h-4 w-4" />
              <span>预计总行程</span>
            </div>
            <div className="text-right">
              <div className="text-sm font-medium text-text">
                {formatTotalTime(totalTime)}
              </div>
              {totalDistance > 0 && (
                <div className="text-xs text-text-secondary">
                  总距离 {formatDistance(totalDistance)}（不含游玩时间）
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 底部操作 */}
        <div className="shrink-0 border-t border-border p-4">
          {showSaveInput ? (
            <div className="space-y-3">
              <input
                type="text"
                value={routeName}
                onChange={(e) => setRouteName(e.target.value)}
                placeholder="输入路线名称..."
                className="w-full rounded-lg border border-border bg-panel px-3 py-2 text-sm text-text outline-none focus:border-primary"
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  onClick={() => setShowSaveInput(false)}
                  className="flex-1 rounded-lg border border-border px-4 py-2 text-sm text-text-secondary hover:bg-bg"
                >
                  取消
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm text-white hover:opacity-90 disabled:opacity-50"
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  保存
                </button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={handleReorder}
                className="flex items-center justify-center gap-1.5 rounded-lg border border-border px-4 py-2 text-sm text-text-secondary hover:bg-bg"
              >
                <RefreshCw className="h-4 w-4" />
                重新排序
              </button>
              <button
                onClick={() => setShowExportModal(true)}
                className="flex items-center justify-center gap-1.5 rounded-lg border border-border px-4 py-2 text-sm text-text-secondary hover:bg-bg"
              >
                <Share2 className="h-4 w-4" />
                导出
              </button>
              <button
                onClick={handleOptimizeAndSave}
                disabled={saving}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm text-white hover:opacity-90 disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                智能排序并保存
              </button>
              <button
                onClick={() => setShowSaveInput(true)}
                disabled={saving}
                className="flex items-center justify-center gap-1.5 rounded-lg border border-primary px-4 py-2 text-sm text-primary hover:bg-primary/10 disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                保存当前顺序
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 导出 Modal */}
      {showExportModal && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/50" onClick={() => setShowExportModal(false)}>
          <div
            className="flex max-h-[90vh] w-[480px] max-w-[90vw] flex-col rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <h3 className="text-lg font-semibold text-gray-900">导出路线</h3>
              <button
                onClick={() => setShowExportModal(false)}
                className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6">
              {/* 图片导出区域 */}
              <div className="mb-6">
                <div className="mb-3 flex items-center gap-2">
                  <Image className="h-4 w-4 text-blue-500" />
                  <span className="text-sm font-medium text-gray-700">图片导出</span>
                </div>

                {/* 导出卡片预览 */}
                <div
                  ref={exportCardRef}
                  className="overflow-hidden rounded-xl border border-gray-200 bg-white"
                  style={{ fontFamily: "'PingFang SC', 'Noto Sans CJK SC', 'Microsoft YaHei', sans-serif" }}
                >
                  {/* 标题区 */}
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-5 py-4 text-center">
                    <div className="text-base font-bold text-gray-900">🗺️ {routeName}</div>
                    <div className="mt-1 text-xs text-gray-500">
                      {new Date().toLocaleDateString('zh-CN')} · {streetName}
                    </div>
                  </div>

                  {/* 地点列表 */}
                  <div className="divide-y divide-gray-100 px-5 py-3">
                    {items.map((item, index) => (
                      <div key={item.place.id} className="py-3">
                        <div className="flex items-start gap-2.5">
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-500 text-xs font-bold text-white">
                            {index + 1}
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-semibold text-gray-900">{item.place.name}</div>
                            <div className="mt-0.5 text-xs text-gray-500">📍 {item.place.address}</div>
                            <div className="mt-1 flex flex-wrap items-center gap-x-3 text-xs text-gray-500">
                              <span>🕐 {formatStayDuration(item.place.stay_duration ?? 60)}</span>
                              {item.place.estimated_cost ? <span>💰 ¥{item.place.estimated_cost}</span> : null}
                            </div>
                            {item.place.tags.length > 0 && (
                              <div className="mt-1 flex flex-wrap gap-1">
                                {item.place.tags.map((tag) => (
                                  <span key={tag} className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-600">{tag}</span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* 路段信息 */}
                        {index < items.length - 1 && (
                          <div className="ml-4 mt-2 flex items-center gap-1.5 text-xs text-gray-400">
                            <span>{driving ? '🚗' : '🚶'}</span>
                            <span>
                              {driving ? '驾车' : '步行'}
                              {driving
                                ? item.driveDuration
                                  ? formatDuration(item.driveDuration)
                                  : ''
                                : item.walkDuration
                                  ? formatDuration(item.walkDuration)
                                  : ''}
                              {driving
                                ? item.driveDistance
                                  ? ` · ${formatDistance(item.driveDistance)}`
                                  : ''
                                : item.walkDistance
                                  ? ` · ${formatDistance(item.walkDistance)}`
                                  : ''}
                            </span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* 概览区 */}
                  <div className="border-t border-gray-100 bg-gray-50 px-5 py-3">
                    <div className="text-xs font-medium text-gray-700">📊 路线概览</div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-4 text-xs text-gray-500">
                      <span>📍 {items.length}个地点</span>
                      <span>🕐 游玩约{formatStayDuration(totalStayDuration)}</span>
                      <span>{driving ? '🚗' : '🚶'} 交通约{formatDuration(totalTime)}</span>
                      {totalEstimatedCost > 0 && <span>💰 约 ¥{totalEstimatedCost}</span>}
                    </div>
                  </div>

                  {/* 天气 */}
                  {weather && (
                    <div className="border-t border-gray-100 px-5 py-2 text-center text-xs text-gray-400">
                      🌤 {weather.description} · {Math.round(weather.temperature)}°C
                    </div>
                  )}

                  {/* 水印 */}
                  <div className="border-t border-gray-100 px-5 py-2 text-center text-[10px] text-gray-300">
                    📱 由「区域聚合游玩路线规划工具」生成
                  </div>
                </div>

                {/* 图片操作按钮 */}
                <button
                  onClick={handleExportImage}
                  disabled={exporting}
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-blue-500 py-2.5 text-sm font-medium text-white hover:bg-blue-600 disabled:opacity-50"
                >
                  {exporting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      生成图片中...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4" />
                      保存为图片 (PNG)
                    </>
                  )}
                </button>
              </div>

              {/* 文本导出区域 */}
              <div>
                <div className="mb-3 flex items-center gap-2">
                  <Copy className="h-4 w-4 text-green-500" />
                  <span className="text-sm font-medium text-gray-700">文本导出</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleCopyText}
                    className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-gray-200 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    {copied ? (
                      <>
                        <Check className="h-4 w-4 text-green-500" />
                        已复制
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4" />
                        复制文本
                      </>
                    )}
                  </button>
                  <button
                    onClick={handleDownloadText}
                    className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-gray-200 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    <Download className="h-4 w-4" />
                    下载 TXT
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
