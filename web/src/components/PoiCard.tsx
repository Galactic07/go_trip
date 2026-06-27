import { useState } from 'react'
import { usePlaceStore } from '@/stores/placeStore'
import type { PoiResult } from '@/lib/poiApi'

interface PoiCardProps {
  poi: PoiResult
  isAdded: boolean
  onClose: () => void
  onAddSuccess: () => void
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

export default function PoiCard({ poi, isAdded, onClose, onAddSuccess }: PoiCardProps) {
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const addPlace = usePlaceStore((s) => s.addPlace)
  const fetchPlaces = usePlaceStore((s) => s.fetchPlaces)

  const handleAdd = async () => {
    if (isAdded) return

    setAdding(true)
    setError(null)

    try {
      await addPlace({
        name: poi.name,
        address: poi.address,
        lng: poi.lng,
        lat: poi.lat,
        province: '',
        city: '深圳',
        district: '',
        street: '',
        adcode: '',
        tags: [],
        note: '',
        stay_duration: 60,
        scene_type: 'unknown',
      })

      // 刷新地点列表
      await fetchPlaces()

      onAddSuccess()
    } catch (err) {
      const e = err as Error
      setError(e.message || '添加失败')
    } finally {
      setAdding(false)
    }
  }

  return (
    <div className="absolute bottom-4 left-4 right-4 z-30 rounded-lg bg-panel/95 shadow-xl backdrop-blur-sm">
      {/* 关闭按钮 */}
      <button
        onClick={onClose}
        className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full text-text-secondary hover:bg-bg hover:text-text"
      >
        ✕
      </button>

      {/* 内容区域 */}
      <div className="p-4 pr-8">
        {/* 名称 */}
        <h3 className="text-base font-semibold text-text">{poi.name}</h3>

        {/* 分类和评分 */}
        <div className="mt-1.5 flex items-center gap-2 text-xs">
          <span className="rounded bg-primary/10 px-1.5 py-0.5 text-primary">
            {getCategoryLabel(poi.type)}
          </span>
          {poi.rating && (
            <span className="flex items-center gap-0.5 text-text-secondary">
              ⭐ {poi.rating}
            </span>
          )}
          {poi.cost && (
            <span className="text-text-secondary">人均 ¥{poi.cost}</span>
          )}
        </div>

        {/* 地址 */}
        {poi.address && (
          <p className="mt-2 text-sm text-text-secondary line-clamp-1">
            📍 {poi.address}
          </p>
        )}

        {/* 电话 */}
        {poi.tel && (
          <p className="mt-1 text-xs text-text-secondary">
            📞 {poi.tel}
          </p>
        )}

        {/* 错误提示 */}
        {error && (
          <p className="mt-2 text-xs text-danger">{error}</p>
        )}

        {/* 操作按钮 */}
        <div className="mt-3 flex items-center gap-2">
          {isAdded ? (
            <div className="flex flex-1 items-center justify-center rounded-md bg-green-50 py-2 text-sm font-medium text-green-600">
              ✓ 已加入心愿单
            </div>
          ) : (
            <>
              <button
                onClick={handleAdd}
                disabled={adding}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-md py-2 text-sm font-medium transition-colors ${
                  adding
                    ? 'bg-primary/50 cursor-wait text-white'
                    : 'bg-primary text-white hover:bg-primary/90'
                }`}
              >
                {adding ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    添加中...
                  </>
                ) : (
                  <>➕ 加入心愿单</>
                )}
              </button>
              {poi.photo_url && (
                <a
                  href={poi.photo_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center rounded-md border border-border px-3 py-2 text-sm text-text-secondary hover:bg-bg"
                  title="查看图片"
                >
                  🖼️
                </a>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
