import { useEffect, useRef, useState } from 'react'
import { Link2, Loader2 } from 'lucide-react'
import { loadAMap } from '@/lib/amap'
import { regeo } from '@/lib/amapApi'
import { usePlaceStore } from '@/stores/placeStore'
import { isURL, parseShareUrl } from '@/lib/urlParseApi'
import type { CreatePlaceRequest } from '@/types'

interface SearchBoxProps {
  map: any | null
  onPlaceAdded?: () => void
}

interface AutoCompleteTip {
  name: string
  district: string
  type: string
  location: { lng: number; lat: number } | null
  id: string
}

export default function SearchBox({ map, onPlaceAdded }: SearchBoxProps) {
  const [keyword, setKeyword] = useState('')
  const [results, setResults] = useState<AutoCompleteTip[]>([])
  const [loading, setLoading] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pendingPlace, setPendingPlace] = useState<CreatePlaceRequest | null>(
    null
  )
  const [urlDetected, setUrlDetected] = useState(false)
  const [urlParsing, setUrlParsing] = useState(false)

  const autoCompleteRef = useRef<any>(null)
  const placeSearchRef = useRef<any>(null)
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const addPlace = usePlaceStore((s) => s.addPlace)

  // 检测输入是否为链接
  useEffect(() => {
    setUrlDetected(isURL(keyword))
  }, [keyword])

  useEffect(() => {
    let mounted = true
    loadAMap().then((AMap) => {
      if (!mounted || !AMap) return
      autoCompleteRef.current = new AMap.AutoComplete({
        city: '全国',
        citylimit: false,
      })
      placeSearchRef.current = new AMap.PlaceSearch({
        pageSize: 1,
        pageIndex: 1,
      })
    })
    return () => {
      mounted = false
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }
    const trimmed = keyword.trim()
    if (trimmed.length < 2) {
      setResults([])
      setShowResults(false)
      setError(null)
      setLoading(false)
      return
    }
    setLoading(true)
    debounceTimerRef.current = setTimeout(() => {
      doSearch(trimmed)
    }, 300)
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [keyword])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setShowResults(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const doSearch = (kw: string) => {
    if (!autoCompleteRef.current) {
      setLoading(false)
      return
    }
    setError(null)
    autoCompleteRef.current.search(kw, (status: string, result: any) => {
      setLoading(false)
      if (status === 'complete' && result.tips) {
        const tips: AutoCompleteTip[] = result.tips
          .filter((t: any) => t.location)
          .slice(0, 8)
          .map((t: any) => ({
            name: t.name,
            district: t.district || '',
            type: t.type || '',
            location: t.location
              ? { lng: t.location.lng, lat: t.location.lat }
              : null,
            id: t.id,
          }))
        setResults(tips)
        setShowResults(true)
        if (tips.length === 0) {
          setError('未找到相关地点，请尝试更精确的名称')
        }
      } else if (status === 'no_data') {
        setResults([])
        setShowResults(true)
        setError('未找到相关地点，请尝试更精确的名称')
      } else {
        setResults([])
        setShowResults(true)
        setError('搜索失败，请稍后重试')
      }
    })
  }

  const buildPlaceData = async (
    name: string,
    address: string,
    lng: number,
    lat: number
  ): Promise<CreatePlaceRequest> => {
    const regeoResult = await regeo(lng, lat)
    return {
      name,
      address: address || '',
      lng,
      lat,
      province: regeoResult.province,
      city: regeoResult.city || regeoResult.province,
      district: regeoResult.district,
      street: regeoResult.township || '',
      adcode: regeoResult.adcode,
      tags: [],
      note: '',
      stay_duration: 60,
    }
  }

  const performAddPlace = async (data: CreatePlaceRequest, force = false) => {
    await addPlace({ ...data, stay_duration: data.stay_duration ?? 60, scene_type: 'unknown' }, force)
    if (map) {
      map.setZoomAndCenter(15, [data.lng, data.lat])
    }
    setKeyword('')
    setResults([])
    setShowResults(false)
    setError(null)
    onPlaceAdded?.()
  }

  const handleSelect = (tip: AutoCompleteTip) => {
    if (!tip.location) {
      setError('无法获取该地点的位置信息')
      return
    }
    setLoading(true)
    setError(null)

    if (!tip.id || !placeSearchRef.current) {
      fallbackCreate(tip, tip.location.lng, tip.location.lat)
      return
    }

    placeSearchRef.current.getDetails(
      tip.id,
      (status: string, result: any) => {
        if (
          status === 'complete' &&
          result.poiList &&
          result.poiList.pois &&
          result.poiList.pois[0]
        ) {
          const poi = result.poiList.pois[0]
          fallbackCreate(
            { name: poi.name || tip.name, district: tip.district },
            poi.location.lng,
            poi.location.lat
          )
        } else {
          fallbackCreate(tip, tip.location!.lng, tip.location!.lat)
        }
      }
    )
  }

  const fallbackCreate = async (
    tipInfo: { name: string; district: string },
    lng: number,
    lat: number
  ) => {
    let data: CreatePlaceRequest | null = null
    try {
      data = await buildPlaceData(tipInfo.name, tipInfo.district, lng, lat)
      await performAddPlace(data)
    } catch (err) {
      handleAddError(err, data)
    }
  }

  const handleAddError = (
    err: unknown,
    data: CreatePlaceRequest | null
  ) => {
    setLoading(false)
    const e = err as Error & { code?: string }
    if (e.code === 'NEARBY_PLACE_EXISTS' && data) {
      setPendingPlace(data)
    } else if (e.code === 'DUPLICATE_PLACE') {
      setError('该地点已存在')
      setShowResults(true)
    } else {
      setError(e.message || '添加地点失败')
      setShowResults(true)
    }
  }

  const handleConfirmNearby = async () => {
    const data = pendingPlace
    if (!data) return
    setLoading(true)
    setError(null)
    setPendingPlace(null)
    try {
      await performAddPlace(data, true)
    } catch (err) {
      handleAddError(err, data)
    }
  }

  const handleCancelNearby = () => {
    setPendingPlace(null)
    setLoading(false)
  }

  const handleParseUrl = async () => {
    if (!keyword.trim()) return
    setUrlParsing(true)
    setError(null)
    try {
      const result = await parseShareUrl(keyword.trim())

      if (result.success && result.title) {
        // 解析成功后，用解析出的名称进行搜索
        setKeyword(result.title)
        setShowResults(false)
        setUrlDetected(false)
      } else if (result.message) {
        setError(result.message)
      }
    } catch (err) {
      setError('解析链接失败，请手动输入地点名称')
    } finally {
      setUrlParsing(false)
    }
  }

  return (
    <div
      ref={containerRef}
      className="absolute left-1/2 top-4 z-20 w-96 -translate-x-1/2"
    >
      <div className="relative flex items-center gap-2">
        {/* 搜索框 */}
        <div className="flex flex-1 items-center rounded-lg border border-border bg-panel shadow-lg">
          <svg
            className="ml-3 h-5 w-5 shrink-0 text-text-secondary"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onFocus={() => {
              if (results.length > 0 || error) setShowResults(true)
            }}
            placeholder="搜索地点..."
            className="w-full bg-transparent px-3 py-2.5 text-sm text-text outline-none placeholder:text-text-secondary"
          />
          {loading && (
            <div className="mr-3 h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          )}
          {keyword && !loading && (
            <div className="mr-1 flex items-center gap-0.5">
              {urlDetected && (
                <button
                  onClick={handleParseUrl}
                  disabled={urlParsing}
                  className="flex items-center gap-1 rounded-md bg-primary/10 px-2 py-1 text-xs text-primary hover:bg-primary/20 disabled:opacity-50"
                >
                  {urlParsing ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Link2 className="h-3 w-3" />
                  )}
                  解析
                </button>
              )}
              <button
                onClick={() => {
                  setKeyword('')
                  setResults([])
                  setShowResults(false)
                  setError(null)
                  setUrlDetected(false)
                }}
                className="text-text-secondary hover:text-text"
              >
              <svg
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
            </div>
          )}
        </div>

        {showResults && (results.length > 0 || error) && !pendingPlace && (
          <div className="absolute left-0 right-0 top-full mt-1 max-h-96 overflow-y-auto rounded-lg border border-border bg-panel shadow-xl">
            {error && results.length === 0 ? (
              <div className="px-4 py-3 text-sm text-text-secondary">
                {error}
              </div>
            ) : (
              results.map((tip, idx) => (
                <button
                  key={`${tip.id}-${idx}`}
                  onClick={() => handleSelect(tip)}
                  className="flex w-full flex-col items-start gap-0.5 border-b border-border px-4 py-2.5 text-left last:border-b-0 hover:bg-bg"
                >
                  <div className="flex w-full items-center gap-2">
                    <span className="font-medium text-sm text-text">
                      {tip.name}
                    </span>
                    {tip.type && (
                      <span className="rounded bg-bg px-1.5 py-0.5 text-xs text-text-secondary">
                        {tip.type}
                      </span>
                    )}
                  </div>
                  {tip.district && (
                    <span className="text-xs text-text-secondary">
                      {tip.district}
                    </span>
                  )}
                </button>
              ))
            )}
          </div>
        )}

        {pendingPlace && (
          <div className="absolute left-0 right-0 top-full mt-1 w-full rounded-lg border border-accent bg-panel p-4 shadow-xl">
            <p className="text-sm text-text">
              该地点附近已存在标记，是否仍然添加？
            </p>
            <div className="mt-3 flex justify-end gap-2">
              <button
                onClick={handleCancelNearby}
                className="rounded-md border border-border px-3 py-1.5 text-sm text-text-secondary hover:bg-bg"
              >
                取消
              </button>
              <button
                onClick={handleConfirmNearby}
                className="rounded-md bg-primary px-3 py-1.5 text-sm text-white hover:opacity-90"
              >
                确认添加
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
