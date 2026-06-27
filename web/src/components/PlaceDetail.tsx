import { useEffect, useState } from 'react'
import { CheckCircle2, Circle, Timer, XCircle, Sun, Home, Cloud } from 'lucide-react'
import { usePlaceStore } from '@/stores/placeStore'
import type { Place, PlaceStatus, SceneType } from '@/types'

interface PlaceDetailProps {
  place: Place
  onClose: () => void
  onUpdate?: () => void
  onDelete?: () => void
}

const PRESET_TAGS = [
  '景点',
  '商圈',
  '餐饮',
  '自然风光',
  '博物馆',
  '文艺',
  '亲子',
  '运动',
  '拍照',
  '夜生活',
]

const STATUS_OPTIONS: { value: PlaceStatus; label: string; icon: React.ReactNode; description: string }[] = [
  { value: 'wishlist', label: '想去', icon: <Circle className="h-4 w-4" />, description: '默认状态，刚添加的地点' },
  { value: 'visited', label: '已去过', icon: <CheckCircle2 className="h-4 w-4" />, description: '用户标记已打卡' },
  { value: 'pending', label: '待定', icon: <Timer className="h-4 w-4" />, description: '兴趣不大或信息不足' },
  { value: 'abandoned', label: '不想去', icon: <XCircle className="h-4 w-4" />, description: '店关了/不感兴趣了' },
]

const SCENE_TYPE_OPTIONS: { value: SceneType; label: string; icon: React.ReactNode }[] = [
  { value: 'outdoor', label: '户外为主', icon: <Sun className="h-4 w-4" /> },
  { value: 'indoor', label: '室内为主', icon: <Home className="h-4 w-4" /> },
  { value: 'hybrid', label: '半户外', icon: <Cloud className="h-4 w-4" /> },
]

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function PlaceDetail({
  place,
  onClose,
  onUpdate,
  onDelete,
}: PlaceDetailProps) {
  const [editing, setEditing] = useState(false)
  const [note, setNote] = useState(place.note)
  const [tags, setTags] = useState<string[]>([...place.tags])
  const [stayDuration, setStayDuration] = useState(place.stay_duration)
  const [estimatedCost, setEstimatedCost] = useState(place.estimated_cost)
  const [sceneType, setSceneType] = useState(place.scene_type)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const updatePlace = usePlaceStore((s) => s.updatePlace)
  const updatePlaceStatus = usePlaceStore((s) => s.updatePlaceStatus)
  const deletePlace = usePlaceStore((s) => s.deletePlace)

  useEffect(() => {
    setEditing(false)
    setConfirmingDelete(false)
    setError(null)
    setNote(place.note)
    setTags([...place.tags])
    setStayDuration(place.stay_duration)
    setEstimatedCost(place.estimated_cost)
    setSceneType(place.scene_type)
  }, [place.id])

  const handleEdit = () => {
    setNote(place.note)
    setTags([...place.tags])
    setStayDuration(place.stay_duration)
    setEstimatedCost(place.estimated_cost)
    setSceneType(place.scene_type)
    setEditing(true)
    setError(null)
  }

  const handleCancelEdit = () => {
    setEditing(false)
    setNote(place.note)
    setTags([...place.tags])
    setStayDuration(place.stay_duration)
    setEstimatedCost(place.estimated_cost)
    setSceneType(place.scene_type)
    setError(null)
  }

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    try {
      await updatePlace(place.id, { note, tags, stay_duration: stayDuration, estimated_cost: estimatedCost, scene_type: sceneType })
      setEditing(false)
      onUpdate?.()
    } catch (err) {
      const e = err as Error
      setError(e.message || '保存失败')
    } finally {
      setSaving(false)
    }
  }

  const handleToggleTag = (tag: string) => {
    setTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    )
  }

  const handleStatusChange = async (newStatus: PlaceStatus) => {
    setError(null)
    try {
      await updatePlaceStatus(place.id, newStatus)
      onUpdate?.()
    } catch (err) {
      const e = err as Error
      setError(e.message || '更新状态失败')
    }
  }

  const handleConfirmDelete = async () => {
    setDeleting(true)
    setError(null)
    try {
      await deletePlace(place.id)
      onDelete?.()
      onClose()
    } catch (err) {
      const e = err as Error
      setError(e.message || '删除失败')
      setConfirmingDelete(false)
    } finally {
      setDeleting(false)
    }
  }

  const fullAddress = [
    place.province,
    place.city,
    place.district,
    place.street,
    place.address,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div
      className="absolute inset-0 z-30 flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="relative max-h-[85vh] w-[440px] max-w-[90vw] overflow-y-auto rounded-xl bg-panel shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-border p-5">
          <div className="flex-1 pr-4">
            <h2 className="text-lg font-semibold text-text">{place.name}</h2>
            <p className="mt-1 text-sm text-text-secondary">{fullAddress}</p>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 rounded-md p-1 text-text-secondary hover:bg-bg hover:text-text"
          >
            <svg
              className="h-5 w-5"
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

        <div className="space-y-4 p-5">
          {error && (
            <div className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
              {error}
            </div>
          )}

          <div>
            <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-text-secondary">
              标签
            </h3>
            {editing ? (
              <div className="flex flex-wrap gap-2">
                {PRESET_TAGS.map((tag) => {
                  const selected = tags.includes(tag)
                  return (
                    <button
                      key={tag}
                      onClick={() => handleToggleTag(tag)}
                      className={`rounded-full px-3 py-1 text-sm transition-colors ${
                        selected
                          ? 'bg-primary text-white'
                          : 'border border-border bg-panel text-text-secondary hover:bg-bg'
                      }`}
                    >
                      {tag}
                    </button>
                  )
                })}
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {place.tags.length === 0 ? (
                  <span className="text-sm text-text-secondary">暂无标签</span>
                ) : (
                  place.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-primary/10 px-3 py-1 text-sm text-primary"
                    >
                      {tag}
                    </span>
                  ))
                )}
              </div>
            )}
          </div>

          <div>
            <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-text-secondary">
              状态
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {STATUS_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => handleStatusChange(opt.value)}
                  disabled={place.status === opt.value}
                  className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                    place.status === opt.value
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border text-text-secondary hover:bg-bg'
                  } disabled:opacity-70`}
                >
                  {opt.icon}
                  <span>{opt.label}</span>
                </button>
              ))}
            </div>
            {place.status === 'visited' && place.visited_at && (
              <p className="mt-1.5 text-xs text-text-secondary">
                到访时间：{formatDate(place.visited_at)}
              </p>
            )}
          </div>

          <div>
            <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-text-secondary">
              时间 & 费用
            </h3>
            {editing ? (
              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-xs text-text-secondary">预计停留时长</label>
                  <div className="flex flex-wrap gap-1.5">
                    {[15, 30, 60, 120, 180].map((mins) => (
                      <button
                        key={mins}
                        onClick={() => setStayDuration(mins)}
                        className={`rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${
                          stayDuration === mins
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border text-text-secondary hover:bg-bg'
                        }`}
                      >
                        {mins < 60 ? `${mins}分钟` : `${mins / 60}小时`}
                      </button>
                    ))}
                  </div>
                  <input
                    type="number"
                    value={stayDuration}
                    onChange={(e) => setStayDuration(Math.max(1, parseInt(e.target.value) || 0))}
                    min={1}
                    className="mt-1.5 w-24 rounded-lg border border-border bg-panel px-2 py-1 text-sm text-text outline-none focus:border-primary"
                    placeholder="自定义"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-text-secondary">预估人均费用（元）</label>
                  <div className="flex flex-wrap gap-1.5">
                    {[0, 50, 100, 200].map((cost) => (
                      <button
                        key={cost}
                        onClick={() => setEstimatedCost(cost === 0 ? null : cost)}
                        className={`rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${
                          (estimatedCost ?? 0) === cost && !(cost === 0 && estimatedCost !== null)
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border text-text-secondary hover:bg-bg'
                        }`}
                      >
                        {cost === 0 ? '免费' : `¥${cost}`}
                      </button>
                    ))}
                    <button
                      onClick={() => setEstimatedCost(null)}
                      className={`rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${
                        estimatedCost === null ? 'border-primary bg-primary/10 text-primary' : 'border-border text-text-secondary hover:bg-bg'
                      }`}
                    >
                      不填
                    </button>
                  </div>
                  {estimatedCost !== null && estimatedCost > 200 && (
                    <input
                      type="number"
                      value={estimatedCost}
                      onChange={(e) => setEstimatedCost(parseInt(e.target.value) || 0)}
                      min={0}
                      className="mt-1.5 w-24 rounded-lg border border-border bg-panel px-2 py-1 text-sm text-text outline-none focus:border-primary"
                      placeholder="自定义"
                    />
                  )}
                </div>
              </div>
            ) : (
              <div className="flex gap-4 text-sm text-text">
                <span>🕐 预计停留：{place.stay_duration < 60 ? `${place.stay_duration}分钟` : `${place.stay_duration / 60}小时`}</span>
                {place.estimated_cost != null && <span>💰 约 ¥{place.estimated_cost}</span>}
              </div>
            )}
          </div>

          <div>
            <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-text-secondary">
              场景类型
            </h3>
            {editing ? (
              <div className="flex flex-wrap gap-2">
                {SCENE_TYPE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setSceneType(opt.value)}
                    className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm transition-colors ${
                      sceneType === opt.value
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border text-text-secondary hover:bg-bg'
                    }`}
                  >
                    {opt.icon}
                    {opt.label}
                  </button>
                ))}
              </div>
            ) : (
              <span className="text-sm text-text">
                {place.scene_type === 'outdoor' && '🌤 户外为主'}
                {place.scene_type === 'indoor' && '🏠 室内为主'}
                {place.scene_type === 'hybrid' && '🌦 半户外'}
                {place.scene_type === 'unknown' && '未设置'}
              </span>
            )}
          </div>

          <div>
            <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-text-secondary">
              备注
            </h3>
            {editing ? (
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={200}
                rows={4}
                className="w-full resize-none rounded-lg border border-border bg-panel px-3 py-2 text-sm text-text outline-none focus:border-primary"
                placeholder="添加备注..."
              />
            ) : (
              <p className="whitespace-pre-wrap text-sm text-text">
                {place.note || '暂无备注'}
              </p>
            )}
            {editing && (
              <p className="mt-1 text-right text-xs text-text-secondary">
                {note.length}/200
              </p>
            )}
          </div>

          <div>
            <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-text-secondary">
              添加时间
            </h3>
            <p className="text-sm text-text">{formatDate(place.created_at)}</p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-border p-5">
          {editing ? (
            <>
              <button
                onClick={handleCancelEdit}
                className="rounded-lg border border-border px-4 py-2 text-sm text-text-secondary hover:bg-bg"
              >
                取消
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="rounded-lg bg-primary px-4 py-2 text-sm text-white hover:opacity-90 disabled:opacity-50"
              >
                {saving ? '保存中...' : '保存'}
              </button>
            </>
          ) : confirmingDelete ? (
            <>
              <button
                onClick={() => setConfirmingDelete(false)}
                disabled={deleting}
                className="rounded-lg border border-border px-4 py-2 text-sm text-text-secondary hover:bg-bg"
              >
                取消
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={deleting}
                className="rounded-lg bg-danger px-4 py-2 text-sm text-white hover:opacity-90 disabled:opacity-50"
              >
                {deleting ? '删除中...' : '确定删除？'}
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setConfirmingDelete(true)}
                className="rounded-lg border border-danger px-4 py-2 text-sm text-danger hover:bg-danger/10"
              >
                删除
              </button>
              <button
                onClick={handleEdit}
                className="rounded-lg bg-primary px-4 py-2 text-sm text-white hover:opacity-90"
              >
                编辑
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
