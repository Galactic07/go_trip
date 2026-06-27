import AMapLoader from '@amap/amap-jsapi-loader'

let AMapInstance: any = null

export async function loadAMap(): Promise<any> {
  if (AMapInstance) return AMapInstance

  const key = import.meta.env.VITE_AMAP_KEY || ''
  const secret = import.meta.env.VITE_AMAP_SECRET || ''

  if (!key) {
    throw new Error('缺少高德地图 API Key，请配置 VITE_AMAP_KEY 环境变量')
  }

  if (secret) {
    ;(window as any)._AMapSecurityConfig = {
      securityJsCode: secret,
    }
  }

  AMapInstance = await AMapLoader.load({
    key,
    version: '2.0',
    plugins: [
      'AMap.Geocoder',
      'AMap.PlaceSearch',
      'AMap.AutoComplete',
      'AMap.DistrictSearch',
      'AMap.Driving',
      'AMap.Walking',
    ],
  })

  return AMapInstance
}
