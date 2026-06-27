package handler

import (
	"net/http"
	"strconv"

	"gotrip/internal/service"

	"github.com/gin-gonic/gin"
)

type WeatherHandler struct {
	svc *service.WeatherService
}

func NewWeatherHandler(svc *service.WeatherService) *WeatherHandler {
	return &WeatherHandler{svc: svc}
}

func (h *WeatherHandler) RegisterRoutes(r *gin.Engine) {
	r.GET("/api/v1/weather", h.GetWeather)
}

func (h *WeatherHandler) GetWeather(c *gin.Context) {
	latStr := c.DefaultQuery("lat", "0")
	lngStr := c.DefaultQuery("lng", "0")

	lat, err := strconv.ParseFloat(latStr, 64)
	if err != nil || lat == 0 {
		c.JSON(http.StatusBadRequest, APIError{Error: "invalid lat parameter", Code: "INVALID_PARAM"})
		return
	}

	lng, err := strconv.ParseFloat(lngStr, 64)
	if err != nil || lng == 0 {
		c.JSON(http.StatusBadRequest, APIError{Error: "invalid lng parameter", Code: "INVALID_PARAM"})
		return
	}

	result, err := h.svc.GetWeather(lat, lng)
	if err != nil {
		c.JSON(http.StatusBadGateway, APIError{
			Error: "获取天气信息失败",
			Code:  "WEATHER_API_ERROR",
			Details: gin.H{"message": err.Error()},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": result})
}
