import { toPng, toBlob } from 'html-to-image'

export interface ExportImageOptions {
  format?: 'png' | 'jpeg'
  quality?: number
  pixelRatio?: number
  filename?: string
}

async function downloadBlob(blob: Blob, filename: string): Promise<void> {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  // 延迟释放，确保下载触发
  setTimeout(() => URL.revokeObjectURL(url), 300)
}

export async function exportElementAsImage(
  element: HTMLElement,
  options: ExportImageOptions = {}
): Promise<void> {
  const {
    format = 'png',
    quality = 0.92,
    pixelRatio = Math.min(window.devicePixelRatio || 2, 3),
    filename = `路线导出_${Date.now()}`,
  } = options

  try {
    if (format === 'jpeg') {
      const blob = await toBlob(element, {
        quality,
        pixelRatio,
        backgroundColor: '#ffffff',
        cacheBust: true,
        fetchRequestInit: { mode: 'cors' },
      })
      if (!blob) throw new Error('导出失败：无法生成图片')
      await downloadBlob(blob, `${filename}.jpeg`)
    } else {
      const dataUrl = await toPng(element, {
        quality,
        pixelRatio,
        cacheBust: true,
        fetchRequestInit: { mode: 'cors' },
      })
      // dataUrl 转 Blob 再下载（避免 data URL 长度限制）
      const res = await fetch(dataUrl)
      const blob = await res.blob()
      await downloadBlob(blob, `${filename}.png`)
    }
  } catch (err) {
    console.error('图片导出失败:', err)
    throw new Error('图片导出失败，请重试')
  }
}
