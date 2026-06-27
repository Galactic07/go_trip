package service

import (
	"math"
	"sort"

	"gotrip/internal/model"
)

type RoutePlanService struct {
	amap *AmapService
}

func NewRoutePlanService(amap *AmapService) *RoutePlanService {
	return &RoutePlanService{amap: amap}
}

// OptimizeOrder 使用最近邻算法生成推荐游览顺序
// origin 为起点（通常为聚类中心），若为 nil 则以第一个地点为起点
func (s *RoutePlanService) OptimizeOrder(places []model.Place, origin *model.Place) []model.Place {
	if len(places) == 0 {
		return places
	}
	if len(places) == 1 {
		return places
	}

	// 复制一份避免修改原数据
	remaining := make([]model.Place, len(places))
	copy(remaining, places)

	ordered := make([]model.Place, 0, len(places))

	// 确定起点
	var startIdx int
	if origin != nil {
		// 找到距离起点最近的地点作为起始点
		minDist := math.MaxFloat64
		for i, p := range remaining {
			d := haversineDistance(origin.Lat, origin.Lng, p.Lat, p.Lng)
			if d < minDist {
				minDist = d
				startIdx = i
			}
		}
	}

	// 将起点加入有序列表
	ordered = append(ordered, remaining[startIdx])
	remaining = append(remaining[:startIdx], remaining[startIdx+1:]...)

	// 贪心最近邻算法
	for len(remaining) > 0 {
		last := ordered[len(ordered)-1]
		minDist := math.MaxFloat64
		nearestIdx := 0
		for i, p := range remaining {
			d := haversineDistance(last.Lat, last.Lng, p.Lat, p.Lng)
			if d < minDist {
				minDist = d
				nearestIdx = i
			}
		}
		ordered = append(ordered, remaining[nearestIdx])
		remaining = append(remaining[:nearestIdx], remaining[nearestIdx+1:]...)
	}

	return ordered
}

// CalculateRouteInfo 计算相邻地点之间的距离和时间
// driving=true 使用驾车API，false 使用步行API
func (s *RoutePlanService) CalculateRouteInfo(orderedPlaces []model.Place, driving bool) ([]model.RoutePlanPlace, error) {
	if len(orderedPlaces) == 0 {
		return nil, nil
	}

	routePlaces := make([]model.RoutePlanPlace, 0, len(orderedPlaces))
	totalEstimatedTime := 0

	for i, place := range orderedPlaces {
		rp := model.RoutePlanPlace{
			PlaceID:   place.ID,
			Place:     place,
			SortOrder: i,
		}

		if i > 0 {
			prev := orderedPlaces[i-1]
			result, err := s.fetchRoute(prev, place, driving)
			if err == nil && result != nil {
				dist := result.Distance
				dur := result.Duration
				if driving {
					rp.DriveDistance = &dist
					rp.DriveDuration = &dur
				} else {
					rp.WalkDistance = &dist
					rp.WalkDuration = &dur
				}
				totalEstimatedTime += dur
			}
		}

		routePlaces = append(routePlaces, rp)
	}

	// 估算总时间存储在第一个元素上（前端汇总）
	if len(routePlaces) > 0 {
		_ = totalEstimatedTime
	}

	return routePlaces, nil
}

func (s *RoutePlanService) fetchRoute(origin, dest model.Place, driving bool) (*RouteResult, error) {
	if s.amap == nil {
		return nil, nil
	}
	if driving {
		return s.amap.DrivingRoute(origin.Lng, origin.Lat, dest.Lng, dest.Lat)
	}
	return s.amap.WalkingRoute(origin.Lng, origin.Lat, dest.Lng, dest.Lat)
}

// haversineDistance 计算两个经纬度坐标之间的直线距离（米）
func haversineDistance(lat1, lng1, lat2, lng2 float64) float64 {
	const earthRadius = 6371000
	lat1Rad := lat1 * math.Pi / 180
	lat2Rad := lat2 * math.Pi / 180
	deltaLat := (lat2 - lat1) * math.Pi / 180
	deltaLng := (lng2 - lng1) * math.Pi / 180
	a := math.Sin(deltaLat/2)*math.Sin(deltaLat/2) +
		math.Cos(lat1Rad)*math.Cos(lat2Rad)*math.Sin(deltaLng/2)*math.Sin(deltaLng/2)
	c := 2 * math.Atan2(math.Sqrt(a), math.Sqrt(1-a))
	return earthRadius * c
}

// SortBySortOrder 按 SortOrder 排序 RoutePlanPlace
func SortBySortOrder(places []model.RoutePlanPlace) {
	sort.Slice(places, func(i, j int) bool {
		return places[i].SortOrder < places[j].SortOrder
	})
}
