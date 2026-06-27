import type { Place, WeatherResult } from '@/types'

interface RouteItemForExport {
  place: Place
  driveDistance: number | null
  driveDuration: number | null
  walkDistance: number | null
  walkDuration: number | null
}

export interface RouteTextData {
  title: string
  streetName: string
  items: RouteItemForExport[]
  driving: boolean
  weather?: WeatherResult | null
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}秒`
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes}分钟`
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  return remainingMinutes > 0 ? `${hours}小时${remainingMinutes}分钟` : `${hours}小时`
}

function formatDistance(meters: number): string {
  if (meters < 1000) return `${meters}米`
  return `${(meters / 1000).toFixed(1)}km`
}

function formatStayDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}分钟`
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  return remainingMinutes > 0 ? `${hours}h${remainingMinutes}min` : `${hours}小时`
}

const NUMBER_CIRCLES = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨', '⑩']

export function generateRouteText(data: RouteTextData): string {
  const lines: string[] = []

  // 标题
  lines.push(`🗺️ ${data.title}`)
  lines.push('━━━━━━━━━━━━━━━━━━━━')
  lines.push('')

  // 地点列表
  data.items.forEach((item, i) => {
    const { place } = item
    lines.push(`${NUMBER_CIRCLES[i] || `${i + 1}`} ${place.name}`)
    lines.push(`📍 ${place.address}`)
    lines.push(
      `🕐 建议停留 ${formatStayDuration(place.stay_duration ?? 60)}${
        place.estimated_cost ? `  ·  💰 约 ¥${place.estimated_cost}` : ''
      }`
    )
    if (place.tags.length > 0) {
      lines.push(`🏷️ ${place.tags.join(' · ')}`)
    }
    if (place.note) {
      lines.push(`📝 ${place.note}`)
    }

    // 路段信息
    if (i < data.items.length - 1) {
      const duration = data.driving ? item.driveDuration : item.walkDuration
      const distance = data.driving ? item.driveDistance : item.walkDistance
      const icon = data.driving ? '🚗' : '🚶'
      const label = data.driving ? '驾车' : '步行'
      lines.push('')
      lines.push(
        `  ↓ ${icon} ${
          duration ? `${label}${formatDuration(duration)}` : '计算中'
        }${distance ? ` · ${formatDistance(distance)}` : ''}`
      )
      lines.push('')
    }
  })

  // 分隔线
  lines.push('━━━━━━━━━━━━━━━━━━━━')

  // 概览
  lines.push('📊 路线概览')
  const totalPlaces = data.items.length
  const totalStay = data.items.reduce(
    (sum, item) => sum + (item.place.stay_duration ?? 60),
    0
  )
  const totalTime = data.items.reduce((sum, item) => {
    const duration = data.driving ? item.driveDuration : item.walkDuration
    return sum + (duration ?? 0)
  }, 0)
  const totalCost = data.items.reduce(
    (sum, item) => sum + (item.place.estimated_cost ?? 0),
    0
  )

  lines.push(
    `📍 ${totalPlaces}个地点  ·  🕐 游玩${formatStayDuration(totalStay)}  ·  ${
      data.driving ? '🚗' : '🚶'
    } 交通约${formatDuration(totalTime)}`
  )
  if (totalCost > 0) {
    lines.push(`💰 约 ¥${totalCost}`)
  }

  // 天气
  if (data.weather) {
    lines.push('')
    lines.push(
      `🌤 天气：${Math.round(data.weather.temperature)}°C · ${data.weather.description}`
    )
  }

  lines.push('')
  lines.push('━━━━━━━━━━━━━━━━━━━━')
  lines.push('📱 由「区域聚合游玩路线规划工具」生成')

  return lines.join('\n')
}

/** 复制到剪贴板 */
export async function copyRouteAsText(data: RouteTextData): Promise<void> {
  const text = generateRouteText(data)
  try {
    await navigator.clipboard.writeText(text)
  } catch {
    // 降级：使用 execCommand
    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.style.position = 'fixed'
    textarea.style.opacity = '0'
    document.body.appendChild(textarea)
    textarea.select()
    document.execCommand('copy')
    document.body.removeChild(textarea)
  }
}

/** 下载为 .txt 文件 */
export function downloadRouteAsText(data: RouteTextData, filename?: string): void {
  const text = generateRouteText(data)
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${filename || data.title}.txt`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
