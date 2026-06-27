import { MapPin } from 'lucide-react'

export default function EmptyState() {
  return (
    <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
      <div className="flex flex-col items-center gap-3 rounded-xl bg-white/80 px-8 py-6 shadow-lg backdrop-blur-sm">
        <MapPin className="h-10 w-10 text-primary" />
        <p className="max-w-xs text-center text-sm text-text-secondary">
          在上方搜索框输入你想去的地方，开始创建你的心愿地图
        </p>
      </div>
    </div>
  )
}
