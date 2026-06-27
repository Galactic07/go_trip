import { useEffect, useRef, useState, useCallback } from 'react'
import { searchPoiAround, type PoiResult } from '@/lib/poiApi'
import PoiCard from './PoiCard'

interface MapExploreProps {
  map: any | null
}

export default function MapExplore({ map }: MapExploreProps) {
  const [selectedPoi, setSelectedPoi] = useState<PoiResult | null>(null)
  const [nearbyPois, setNearbyPois] = useState<PoiResult[]>([])
  const [loading, setLoading] = useState(false)
  const [showList, setShowList] = useState(false)
  const clickHandlerRef = useRef<any>(null)

  // 处理地图点击事件 - 始终激活
  const handleMapClick = useCallback(
    async (e: any) => {
      if (!map) return

      const lnglat = e.lnglat
      if (!lnglat) return

      setLoading(true)

      try {
        // 使用周边搜索API获取点击位置附近的POI
        // 增大搜索半径到100米，提高命中率
        const result = await searchPoiAround(
          lnglat.lng,
          lnglat.lat,
          100, // 300米半径（之前是100米）
          8    // 返回最多8个（之前是5个）
        )

        if (result.pois.length > 0) {
          setNearbyPois(result.pois)

          if (result.pois.length === 1) {
            // 只有1个结果时直接选中
            setSelectedPoi(result.pois[0])
            setShowList(false)
          } else {
            // 多个结果显示列表供选择
            setSelectedPoi(null)
            setShowList(true)
          }
        } else {
          setSelectedPoi(null)
          setNearbyPois([])
          setShowList(false)
        }
      } catch (err) {
        console.error('获取POI失败:', err)
        setSelectedPoi(null)
        setNearbyPois([])
        setShowList(false)
      } finally {
        setLoading(false)
      }
    },
    [map]
  )

  // 注册/注销地图点击事件
  useEffect(() => {
    if (!map) return

    clickHandlerRef.current = handleMapClick
    map.on('click', handleMapClick)

    return () => {
      if (clickHandlerRef.current && map) {
        map.off('click', clickHandlerRef.current)
      }
    }
  }, [map, handleMapClick])

  // 选择列表中的某个POI
  const handleSelectPoi = (poi: PoiResult) => {
    setSelectedPoi(poi)
    setShowList(false)
  }

  // 关闭所有弹层
  const handleClose = () => {
    setSelectedPoi(null)
    setNearbyPois([])
    setShowList(false)
  }

  if (!map) return null

  return (
    <>
      {/* 加载状态 */}
      {loading && (
        <div className="absolute left-1/2 top-1/2 z-30 -translate-x-1/2 -translate-y-1/2">
          <div className="flex items-center gap-2 rounded-lg bg-panel/95 px-4 py-3 shadow-xl backdrop-blur-sm">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <span className="text-sm text-text-secondary">正在获取地点信息...</span>
          </div>
        </div>
      )}

      {/* 多个POI候选列表 */}
      {showList && nearbyPois.length > 1 && !selectedPoi && (
        <div className="absolute bottom-4 left-4 right-4 z-30 rounded-lg bg-panel/95 shadow-xl backdrop-blur-sm">
          <div className="flex items-center justify-between border-b border-border px-4 py-2">
            <span className="text-sm font-medium text-text">
              找到 {nearbyPois.length} 个附近地点
            </span>
            <button
              onClick={handleClose}
              className="text-xs text-text-secondary hover:text-text"
            >
              关闭
            </button>
          </div>
          <div className="max-h-60 overflow-y-auto p-2">
            {nearbyPois.map((poi, index) => (
              <button
                key={poi.id || index}
                onClick={() => handleSelectPoi(poi)}
                className="flex w-full flex-col items-start gap-1 rounded-md px-3 py-2.5 text-left hover:bg-bg transition-colors"
              >
                <div className="flex w-full items-center justify-between">
                  <span className="text-sm font-medium text-text">
                    {poi.name}
                  </span>
                  <span className="text-xs text-text-secondary">
                    {getCategoryLabel(poi.type)}
                  </span>
                </div>
                {poi.address && (
                  <span className="text-xs text-text-secondary line-clamp-1">
                    📍 {poi.address}
                  </span>
                )}
                <div className="flex items-center gap-2 text-xs text-text-secondary">
                  {poi.rating && <span>⭐ {poi.rating}</span>}
                  {poi.cost && <span>人均 ¥{poi.cost}</span>}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* POI详情卡片 */}
      {selectedPoi && (
        <PoiCard
          poi={selectedPoi}
          isAdded={false}
          onClose={handleClose}
          onAddSuccess={handleClose}
        />
      )}
    </>
  )
}

// 根据POI类型提取分类标签
function getCategoryLabel(type: string): string {
  if (type.includes('风景名胜') || type.includes('景点')) return '景点'
  if (type.includes('餐饮') || type.includes('美食')) return '美食'
  if (type.includes('购物')) return '购物'
  if (type.includes('住宿') || type.includes('酒店')) return '酒店'
  if (type.includes('娱乐') || type.includes('休闲')) return '娱乐'
  if (type.includes('生活')) return '生活'
  return '地点'
}
