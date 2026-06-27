import api from './api'

export interface ParseUrlResult {
  title: string
  address: string
  success: boolean
  message?: string
}

export async function parseShareUrl(url: string): Promise<ParseUrlResult> {
  const res = await api.post<{ data: ParseUrlResult }>('/v1/parse-url', { url })
  return res.data.data
}

export function isURL(text: string): boolean {
  const urlPattern = /^https?:\/\/.+/
  return urlPattern.test(text.trim())
}
