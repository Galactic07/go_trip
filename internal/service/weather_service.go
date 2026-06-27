package service

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strconv"
	"time"
)

type WeatherService struct {
	client *http.Client
}

func NewWeatherService() *WeatherService {
	return &WeatherService{
		client: &http.Client{Timeout: 5 * time.Second},
	}
}

type WeatherResponse struct {
	Current struct {
		Temperature  float64 `json:"temperature_2m"`
		ApparentTemp float64 `json:"apparent_temperature"`
		Humidity     float64 `json:"relative_humidity_2m"`
		WindSpeed    float64 `json:"wind_speed_10m"`
		WeatherCode  int     `json:"weather_code"`
		IsDay        int     `json:"is_day"`
	} `json:"current"`
	Daily struct {
		Time             []string  `json:"time"`
		TemperatureMax   []float64 `json:"temperature_2m_max"`
		TemperatureMin   []float64 `json:"temperature_2m_min"`
		WeatherCode      []int     `json:"weather_code"`
		PrecipitationSum []float64 `json:"precipitation_sum"`
	} `json:"daily"`
}

type WeatherResult struct {
	Temperature      float64 `json:"temperature"`
	ApparentTemp     float64 `json:"apparent_temp"`
	Humidity         float64 `json:"humidity"`
	WindSpeed        float64 `json:"wind_speed"`
	WeatherCode      int     `json:"weather_code"`
	Description      string  `json:"description"`
	IsRainy          bool    `json:"is_rainy"`
	IsHot            bool    `json:"is_hot"`
	IsCold           bool    `json:"is_cold"`
	MaxTempToday     float64 `json:"max_temp_today"`
	MinTempToday     float64 `json:"min_temp_today"`
	PrecipitationSum float64 `json:"precipitation_sum"`
}

// WMO Weather Code descriptions (simplified)
var wmoCodes = map[int]string{
	0:  "晴",
	1:  "大部晴朗",
	2:  "多云",
	3:  "阴天",
	45: "雾",
	48: "雾凇",
	51: "毛毛雨",
	53: "毛毛雨",
	55: "毛毛雨",
	61: "小雨",
	63: "中雨",
	65: "大雨",
	71: "小雪",
	73: "中雪",
	75: "大雪",
	80: "阵雨",
	81: "中阵雨",
	82: "大阵雨",
	95: "雷暴",
	96: "雷暴伴冰雹",
	99: "强雷暴伴冰雹",
}

func (s *WeatherService) GetWeather(lat, lng float64) (*WeatherResult, error) {
	baseURL := "https://api.open-meteo.com/v1/forecast"
	params := url.Values{}
	params.Set("latitude", strconv.FormatFloat(lat, 'f', 4, 64))
	params.Set("longitude", strconv.FormatFloat(lng, 'f', 4, 64))
	params.Set("current", "temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code,is_day")
	params.Set("daily", "temperature_2m_max,temperature_2m_min,weather_code,precipitation_sum")
	params.Set("forecast_days", "1")
	params.Set("timezone", "auto")

	reqURL := fmt.Sprintf("%s?%s", baseURL, params.Encode())

	resp, err := s.client.Get(reqURL)
	if err != nil {
		return nil, fmt.Errorf("weather request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("weather API error (%d): %s", resp.StatusCode, string(body))
	}

	var wr WeatherResponse
	if err := json.NewDecoder(resp.Body).Decode(&wr); err != nil {
		return nil, fmt.Errorf("decode weather response failed: %w", err)
	}

	desc := wmoCodes[wr.Current.WeatherCode]
	if desc == "" {
		desc = "未知天气"
	}

	result := &WeatherResult{
		Temperature:  wr.Current.Temperature,
		ApparentTemp: wr.Current.ApparentTemp,
		Humidity:     wr.Current.Humidity,
		WindSpeed:    wr.Current.WindSpeed,
		WeatherCode:  wr.Current.WeatherCode,
		Description:  desc,
		IsRainy:      isRainyCode(wr.Current.WeatherCode),
		IsHot:        wr.Current.Temperature >= 35,
		IsCold:       wr.Current.Temperature <= 5,
	}

	if len(wr.Daily.TemperatureMax) > 0 {
		result.MaxTempToday = wr.Daily.TemperatureMax[0]
	}
	if len(wr.Daily.TemperatureMin) > 0 {
		result.MinTempToday = wr.Daily.TemperatureMin[0]
	}
	if len(wr.Daily.PrecipitationSum) > 0 {
		result.PrecipitationSum = wr.Daily.PrecipitationSum[0]
	}

	return result, nil
}

func isRainyCode(code int) bool {
	return code >= 51 && code <= 67 || code >= 80 && code <= 82 || code >= 95 && code <= 99
}
