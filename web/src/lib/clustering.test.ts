import { describe, it, expect } from 'vitest'
import { groupByDistrict, calculateCenter, getBubbleStyle } from './clustering'
import type { Place } from '@/types'

const mockPlace = (overrides: Partial<Place> = {}): Place => ({
  id: 1,
  name: '测试地点',
  address: '测试地址',
  lng: 114.0,
  lat: 22.5,
  province: '广东省',
  city: '深圳市',
  district: '南山区',
  street: '粤海街道',
  adcode: '440305',
  tags: [],
  note: '',
  status: 'wishlist',
  visited_at: null,
  stay_duration: 60,
  estimated_cost: null,
  scene_type: 'unknown',
  created_at: '2026-06-18T00:00:00Z',
  updated_at: '2026-06-18T00:00:00Z',
  ...overrides,
})

describe('groupByDistrict', () => {
  it('应该按区分组地点', () => {
    const places = [
      mockPlace({ id: 1, name: '地点A', street: '粤海街道' }),
      mockPlace({ id: 2, name: '地点B', street: '蛇口街道' }),
      mockPlace({ id: 3, name: '地点C', district: '福田区' }),
    ]
    const groups = groupByDistrict(places)
    expect(groups).toHaveLength(2)
    const nanshan = groups.find(g => g.district === '南山区')
    expect(nanshan).toBeDefined()
    expect(nanshan!.count).toBe(2)
    expect(nanshan!.places).toHaveLength(2)
    const futian = groups.find(g => g.district === '福田区')
    expect(futian).toBeDefined()
    expect(futian!.count).toBe(1)
  })

  it('空数组应返回空分组', () => {
    expect(groupByDistrict([])).toHaveLength(0)
  })

  it('应该计算分组的几何中心', () => {
    const places = [
      mockPlace({ id: 1, lng: 114.0, lat: 22.0 }),
      mockPlace({ id: 2, lng: 116.0, lat: 24.0 }),
    ]
    const groups = groupByDistrict(places)
    expect(groups[0].center.lng).toBeCloseTo(115.0)
    expect(groups[0].center.lat).toBeCloseTo(23.0)
  })
})

describe('calculateCenter', () => {
  it('应该计算几何中心', () => {
    const places = [
      mockPlace({ lng: 114.0, lat: 22.0 }),
      mockPlace({ lng: 116.0, lat: 24.0 }),
    ]
    const center = calculateCenter(places)
    expect(center.lng).toBeCloseTo(115.0)
    expect(center.lat).toBeCloseTo(23.0)
  })

  it('空数组返回 0,0', () => {
    const center = calculateCenter([])
    expect(center.lng).toBe(0)
    expect(center.lat).toBe(0)
  })
})

describe('getBubbleStyle', () => {
  it('2-3个地点返回小号蓝色气泡', () => {
    const style = getBubbleStyle(3)
    expect(style.size).toBe(28)
    expect(style.color).toBe('#2563EB')
  })

  it('4-6个地点返回中号橙色气泡', () => {
    const style = getBubbleStyle(5)
    expect(style.size).toBe(36)
    expect(style.color).toBe('#F59E0B')
  })

  it('7个以上地点返回大号红色气泡', () => {
    const style = getBubbleStyle(10)
    expect(style.size).toBe(44)
    expect(style.color).toBe('#EF4444')
  })
})
