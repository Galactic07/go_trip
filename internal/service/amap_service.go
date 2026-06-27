package service

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"
)

type AmapService struct {
	apiKey string
	client *http.Client
}

func NewAmapService(apiKey string) *AmapService {
	return &AmapService{
		apiKey: apiKey,
		client: &http.Client{Timeout: 10 * time.Second},
	}
}

type RegeoResult struct {
	Province string `json:"province"`
	City     string `json:"city"`
	District string `json:"district"`
	Adcode   string `json:"adcode"`
	Township string `json:"township"`
	Towncode string `json:"towncode"`
}

type RouteResult struct {
	Distance int `json:"distance"`
	Duration int `json:"duration"`
}

type PoiResult struct {
	ID       string   `json:"id"`
	Name     string   `json:"name"`
	Type     string   `json:"type"`
	Address  string   `json:"address"`
	Lng      float64  `json:"lng"`
	Lat      float64  `json:"lat"`
	Tel      string   `json:"tel,omitempty"`
	Rating   *float64 `json:"rating,omitempty"`
	Cost     *string  `json:"cost,omitempty"`
	PhotoURL string   `json:"photo_url,omitempty"`
}

func (s *AmapService) doRequest(endpoint string, params url.Values) ([]byte, error) {
	if s.apiKey == "" {
		return nil, fmt.Errorf("amap api key is not configured")
	}
	params.Set("key", s.apiKey)
	reqURL := fmt.Sprintf("https://restapi.amap.com%s?%s", endpoint, params.Encode())

	resp, err := s.client.Get(reqURL)
	if err != nil {
		return nil, fmt.Errorf("http request failed: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("read response failed: %w", err)
	}
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("amap returned http status %d", resp.StatusCode)
	}
	return body, nil
}

func (s *AmapService) Regeo(lng, lat float64) (*RegeoResult, error) {
	params := url.Values{}
	params.Set("location", fmt.Sprintf("%f,%f", lng, lat))
	params.Set("extensions", "base")

	body, err := s.doRequest("/v3/geocode/regeo", params)
	if err != nil {
		return nil, err
	}

	var resp struct {
		Status    string `json:"status"`
		Info      string `json:"info"`
		Infocode  string `json:"infocode"`
		Regeocode struct {
			AddressComponent struct {
				Province interface{} `json:"province"`
				City     interface{} `json:"city"`
				District interface{} `json:"district"`
				Adcode   string      `json:"adcode"`
				Township interface{} `json:"township"`
				Towncode string      `json:"towncode"`
			} `json:"addressComponent"`
		} `json:"regeocode"`
	}
	if err := json.Unmarshal(body, &resp); err != nil {
		return nil, fmt.Errorf("parse regeo response failed: %w", err)
	}
	if resp.Status != "1" {
		return nil, fmt.Errorf("amap regeo error: %s (infocode=%s)", resp.Info, resp.Infocode)
	}

	result := &RegeoResult{
		Adcode:   resp.Regeocode.AddressComponent.Adcode,
		Towncode: resp.Regeocode.AddressComponent.Towncode,
	}
	result.Province = toString(resp.Regeocode.AddressComponent.Province)
	result.City = toString(resp.Regeocode.AddressComponent.City)
	result.District = toString(resp.Regeocode.AddressComponent.District)
	result.Township = toString(resp.Regeocode.AddressComponent.Township)
	return result, nil
}

func toString(v interface{}) string {
	switch val := v.(type) {
	case string:
		return val
	case []interface{}:
		if len(val) > 0 {
			if s, ok := val[0].(string); ok {
				return s
			}
		}
		return ""
	case nil:
		return ""
	default:
		return fmt.Sprintf("%v", val)
	}
}

func (s *AmapService) DistrictSearch(keywords string, subdistrict int) ([]byte, error) {
	if keywords == "" {
		return nil, fmt.Errorf("keywords is required")
	}
	params := url.Values{}
	params.Set("keywords", keywords)
	params.Set("subdistrict", strconv.Itoa(subdistrict))
	params.Set("extensions", "all")

	body, err := s.doRequest("/v3/config/district", params)
	if err != nil {
		return nil, err
	}

	var probe struct {
		Status   string `json:"status"`
		Info     string `json:"info"`
		Infocode string `json:"infocode"`
	}
	if err := json.Unmarshal(body, &probe); err != nil {
		return nil, fmt.Errorf("parse district response failed: %w", err)
	}
	if probe.Status != "1" {
		return nil, fmt.Errorf("amap district error: %s (infocode=%s)", probe.Info, probe.Infocode)
	}
	return body, nil
}

func (s *AmapService) DrivingRoute(originLng, originLat, destLng, destLat float64) (*RouteResult, error) {
	return s.route("/v3/direction/driving", originLng, originLat, destLng, destLat)
}

func (s *AmapService) WalkingRoute(originLng, originLat, destLng, destLat float64) (*RouteResult, error) {
	return s.route("/v3/direction/walking", originLng, originLat, destLng, destLat)
}

func (s *AmapService) route(endpoint string, originLng, originLat, destLng, destLat float64) (*RouteResult, error) {
	params := url.Values{}
	params.Set("origin", fmt.Sprintf("%f,%f", originLng, originLat))
	params.Set("destination", fmt.Sprintf("%f,%f", destLng, destLat))

	body, err := s.doRequest(endpoint, params)
	if err != nil {
		return nil, err
	}

	var resp struct {
		Status   string `json:"status"`
		Info     string `json:"info"`
		Infocode string `json:"infocode"`
		Route    struct {
			Paths []struct {
				Distance string `json:"distance"`
				Duration string `json:"duration"`
			} `json:"paths"`
		} `json:"route"`
	}
	if err := json.Unmarshal(body, &resp); err != nil {
		return nil, fmt.Errorf("parse route response failed: %w", err)
	}
	if resp.Status != "1" {
		return nil, fmt.Errorf("amap route error: %s (infocode=%s)", resp.Info, resp.Infocode)
	}
	if len(resp.Route.Paths) == 0 {
		return nil, fmt.Errorf("amap route returned no paths")
	}

	distance, err := strconv.Atoi(resp.Route.Paths[0].Distance)
	if err != nil {
		return nil, fmt.Errorf("invalid distance value: %s", resp.Route.Paths[0].Distance)
	}
	duration, err := strconv.Atoi(resp.Route.Paths[0].Duration)
	if err != nil {
		return nil, fmt.Errorf("invalid duration value: %s", resp.Route.Paths[0].Duration)
	}

	return &RouteResult{Distance: distance, Duration: duration}, nil
}

// PoiSearchRequest POI搜索请求参数
type PoiSearchRequest struct {
	Keywords string  // 关键词（可选，空则返回全部）
	City     string  // 城市名（如"深圳"）
	Type     string  // 分类（scenic/restaurant/shopping/hotel/entertainment/life）
	Page     int     // 页码（从1开始）
	PageSize int     // 每页数量（最大25）
	Lng      float64 // 中心点经度（用于周边搜索）
	Lat      float64 // 中心点纬度
	Radius   int     // 搜索半径（米）
}

// PoiSearchResponse POI搜索响应
type PoiSearchResponse struct {
	Pois       []PoiResult `json:"pois"`
	TotalCount int         `json:"total_count"`
	Page       int         `json:"page"`
	PageSize   int         `json:"page_size"`
}

// SearchPoi 搜索POI
func (s *AmapService) SearchPoi(req PoiSearchRequest) (*PoiSearchResponse, error) {
	params := url.Values{}

	if req.Keywords != "" {
		params.Set("keywords", req.Keywords)
	}
	if req.City != "" {
		params.Set("city", req.City)
	}
	if req.Type != "" {
		params.Set("types", convertPOIType(req.Type))
	}
	if req.Page > 0 {
		params.Set("offset", strconv.Itoa((req.Page-1)*req.PageSize))
	} else {
		params.Set("offset", "0")
	}
	if req.PageSize > 0 && req.PageSize <= 25 {
		params.Set("limit", strconv.Itoa(req.PageSize))
	} else {
		params.Set("limit", "20")
	}
	if req.Lng != 0 && req.Lat != 0 {
		params.Set("location", fmt.Sprintf("%f,%f", req.Lng, req.Lat))
		if req.Radius > 0 {
			params.Set("radius", strconv.Itoa(req.Radius))
		} else {
			params.Set("radius", "5000") // 默认5km
		}
	}

	body, err := s.doRequest("/v5/place/text", params)
	if err != nil {
		return nil, err
	}

	var resp struct {
		Status   string `json:"status"`
		Info     string `json:"info"`
		Infocode string `json:"infocode"`
		Pois     []struct {
			ID       string `json:"id"`
			Name     string `json:"name"`
			Type     string `json:"type"`
			Address  string `json:"address"`
			Location string `json:"location"`
			Tel      string `json:"tel,omitempty"`
			Rating   string `json:"rating,omitempty"` // 评分字符串如 "4.5"
			Cost     string `json:"cost,omitempty"`   // 人均消费
			Photos   []struct {
				URL string `json:"url"`
			} `json:"photos,omitempty"`
		} `json:"pois"`
		Count string `json:"count"`
	}
	if err := json.Unmarshal(body, &resp); err != nil {
		return nil, fmt.Errorf("parse poi response failed: %w", err)
	}
	if resp.Status != "1" {
		return nil, fmt.Errorf("amap poi error: %s (infocode=%s)", resp.Info, resp.Infocode)
	}

	pois := make([]PoiResult, 0, len(resp.Pois))
	for _, p := range resp.Pois {
		poi := PoiResult{
			ID:      p.ID,
			Name:    p.Name,
			Type:    p.Type,
			Address: p.Address,
			Tel:     p.Tel,
			Cost:    nil,
		}

		// 解析坐标
		if p.Location != "" {
			parts := strings.Split(p.Location, ",")
			if len(parts) == 2 {
				lng, err1 := strconv.ParseFloat(parts[0], 64)
				lat, err2 := strconv.ParseFloat(parts[1], 64)
				if err1 == nil && err2 == nil {
					poi.Lng = lng
					poi.Lat = lat
				}
			}
		}

		// 解析评分
		if p.Rating != "" {
			rating, err := strconv.ParseFloat(p.Rating, 64)
			if err == nil {
				poi.Rating = &rating
			}
		}

		// 解析人均消费
		if p.Cost != "" {
			cost := p.Cost
			poi.Cost = &cost
		}

		// 获取第一张图片
		if len(p.Photos) > 0 && p.Photos[0].URL != "" {
			poi.PhotoURL = p.Photos[0].URL
		}

		pois = append(pois, poi)
	}

	totalCount, _ := strconv.Atoi(resp.Count)

	result := &PoiSearchResponse{
		Pois:       pois,
		TotalCount: totalCount,
		Page:       req.Page,
		PageSize:   req.PageSize,
	}

	return result, nil
}

// SearchPoiAround 周边搜索POI（用于点击地图获取附近地点）
func (s *AmapService) SearchPoiAround(lng, lat float64, radius int, limit int) (*PoiSearchResponse, error) {
	params := url.Values{}

	params.Set("location", fmt.Sprintf("%f,%f", lng, lat))
	if radius > 0 {
		params.Set("radius", strconv.Itoa(radius))
	} else {
		params.Set("radius", "100") // 默认100米
	}
	if limit > 0 && limit <= 25 {
		params.Set("limit", strconv.Itoa(limit))
	} else {
		params.Set("limit", "5")
	}
	// 不需要keywords和city参数

	body, err := s.doRequest("/v5/place/around", params)
	if err != nil {
		return nil, err
	}

	var resp struct {
		Status   string `json:"status"`
		Info     string `json:"info"`
		Infocode string `json:"infocode"`
		Pois     []struct {
			ID       string `json:"id"`
			Name     string `json:"name"`
			Type     string `json:"type"`
			Address  string `json:"address"`
			Location string `json:"location"`
			Tel      string `json:"tel,omitempty"`
			Rating   string `json:"rating,omitempty"` // 评分字符串如 "4.5"
			Cost     string `json:"cost,omitempty"`   // 人均消费
			Photos   []struct {
				URL string `json:"url"`
			} `json:"photos,omitempty"`
		} `json:"pois"`
		Count string `json:"count"`
	}
	if err := json.Unmarshal(body, &resp); err != nil {
		return nil, fmt.Errorf("parse poi around response failed: %w", err)
	}
	if resp.Status != "1" {
		return nil, fmt.Errorf("amap poi around error: %s (infocode=%s)", resp.Info, resp.Infocode)
	}

	pois := make([]PoiResult, 0, len(resp.Pois))
	for _, p := range resp.Pois {
		poi := PoiResult{
			ID:      p.ID,
			Name:    p.Name,
			Type:    p.Type,
			Address: p.Address,
			Tel:     p.Tel,
			Cost:    nil,
		}

		// 解析坐标
		if p.Location != "" {
			parts := strings.Split(p.Location, ",")
			if len(parts) == 2 {
				lng, err1 := strconv.ParseFloat(parts[0], 64)
				lat, err2 := strconv.ParseFloat(parts[1], 64)
				if err1 == nil && err2 == nil {
					poi.Lng = lng
					poi.Lat = lat
				}
			}
		}

		// 解析评分
		if p.Rating != "" {
			rating, err := strconv.ParseFloat(p.Rating, 64)
			if err == nil {
				poi.Rating = &rating
			}
		}

		// 解析人均消费
		if p.Cost != "" {
			cost := p.Cost
			poi.Cost = &cost
		}

		// 获取第一张图片
		if len(p.Photos) > 0 && p.Photos[0].URL != "" {
			poi.PhotoURL = p.Photos[0].URL
		}

		pois = append(pois, poi)
	}

	totalCount, _ := strconv.Atoi(resp.Count)

	result := &PoiSearchResponse{
		Pois:       pois,
		TotalCount: totalCount,
		Page:       1,
		PageSize:   limit,
	}

	return result, nil
}

// convertPOIType 将前端分类转换为高德地图类型编码
func convertPOIType(t string) string {
	typeMap := map[string]string{
		"scenic":        "110000|110100|110101|110102|110103|110104|110105",
		"restaurant":    "050000",
		"shopping":      "060000",
		"hotel":         "100000",
		"entertainment": "070000|080000",
		"life":          "090000",
	}
	if code, ok := typeMap[t]; ok {
		return code
	}
	return ""
}
