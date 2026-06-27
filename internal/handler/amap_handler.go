package handler

import (
	"net/http"
	"strconv"

	"gotrip/internal/service"

	"github.com/gin-gonic/gin"
)

type AmapHandler struct {
	service *service.AmapService
}

func NewAmapHandler(service *service.AmapService) *AmapHandler {
	return &AmapHandler{service: service}
}

func (h *AmapHandler) RegisterRoutes(r *gin.Engine) {
	api := r.Group("/api/amap")
	api.GET("/regeo", h.Regeo)
	api.GET("/district", h.DistrictSearch)
	api.GET("/direction/driving", h.DrivingRoute)
	api.GET("/direction/walking", h.WalkingRoute)
	api.GET("/poi/search", h.PoiSearch)
	api.GET("/poi/around", h.PoiAround)
}

func (h *AmapHandler) Regeo(c *gin.Context) {
	lng, err := strconv.ParseFloat(c.Query("lng"), 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, APIError{Error: "invalid lng", Code: "INVALID_PARAM"})
		return
	}
	lat, err := strconv.ParseFloat(c.Query("lat"), 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, APIError{Error: "invalid lat", Code: "INVALID_PARAM"})
		return
	}

	result, err := h.service.Regeo(lng, lat)
	if err != nil {
		c.JSON(http.StatusBadGateway, APIError{Error: "高德地图服务暂时不可用", Code: "AMAP_ERROR"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": result})
}

func (h *AmapHandler) DistrictSearch(c *gin.Context) {
	keywords := c.Query("keywords")
	if keywords == "" {
		c.JSON(http.StatusBadRequest, APIError{Error: "keywords is required", Code: "INVALID_PARAM"})
		return
	}
	subdistrict, err := strconv.Atoi(c.DefaultQuery("subdistrict", "1"))
	if err != nil {
		c.JSON(http.StatusBadRequest, APIError{Error: "invalid subdistrict", Code: "INVALID_PARAM"})
		return
	}

	body, err := h.service.DistrictSearch(keywords, subdistrict)
	if err != nil {
		c.JSON(http.StatusBadGateway, APIError{Error: "高德地图服务暂时不可用", Code: "AMAP_ERROR"})
		return
	}

	c.Data(http.StatusOK, "application/json; charset=utf-8", body)
}

func (h *AmapHandler) DrivingRoute(c *gin.Context) {
	h.route(c, true)
}

func (h *AmapHandler) WalkingRoute(c *gin.Context) {
	h.route(c, false)
}

func (h *AmapHandler) route(c *gin.Context, driving bool) {
	originLng, err := strconv.ParseFloat(c.Query("origin_lng"), 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, APIError{Error: "invalid origin_lng", Code: "INVALID_PARAM"})
		return
	}
	originLat, err := strconv.ParseFloat(c.Query("origin_lat"), 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, APIError{Error: "invalid origin_lat", Code: "INVALID_PARAM"})
		return
	}
	destLng, err := strconv.ParseFloat(c.Query("dest_lng"), 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, APIError{Error: "invalid dest_lng", Code: "INVALID_PARAM"})
		return
	}
	destLat, err := strconv.ParseFloat(c.Query("dest_lat"), 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, APIError{Error: "invalid dest_lat", Code: "INVALID_PARAM"})
		return
	}

	var result *service.RouteResult
	if driving {
		result, err = h.service.DrivingRoute(originLng, originLat, destLng, destLat)
	} else {
		result, err = h.service.WalkingRoute(originLng, originLat, destLng, destLat)
	}
	if err != nil {
		c.JSON(http.StatusBadGateway, APIError{Error: "高德地图服务暂时不可用", Code: "AMAP_ERROR"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": result})
}

// PoiSearch 搜索POI
func (h *AmapHandler) PoiSearch(c *gin.Context) {
	keywords := c.Query("keywords")
	city := c.DefaultQuery("city", "")
	poiType := c.Query("type")
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))
	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 25 {
		pageSize = 20
	}

	lng, _ := strconv.ParseFloat(c.Query("lng"), 64)
	lat, _ := strconv.ParseFloat(c.Query("lat"), 64)
	radius, _ := strconv.Atoi(c.DefaultQuery("radius", "5000"))

	req := service.PoiSearchRequest{
		Keywords: keywords,
		City:     city,
		Type:     poiType,
		Page:     page,
		PageSize: pageSize,
		Lng:      lng,
		Lat:      lat,
		Radius:   radius,
	}

	result, err := h.service.SearchPoi(req)
	if err != nil {
		c.JSON(http.StatusBadGateway, APIError{Error: "高德地图服务暂时不可用", Code: "AMAP_ERROR"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": result})
}

// PoiAround 周边搜索POI（用于点击地图获取附近地点）
func (h *AmapHandler) PoiAround(c *gin.Context) {
	lng, err := strconv.ParseFloat(c.Query("lng"), 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, APIError{Error: "invalid lng", Code: "INVALID_PARAM"})
		return
	}
	lat, err := strconv.ParseFloat(c.Query("lat"), 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, APIError{Error: "invalid lat", Code: "INVALID_PARAM"})
		return
	}
	radius, _ := strconv.Atoi(c.DefaultQuery("radius", "100"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "5"))

	result, err := h.service.SearchPoiAround(lng, lat, radius, limit)
	if err != nil {
		c.JSON(http.StatusBadGateway, APIError{Error: "高德地图服务暂时不可用", Code: "AMAP_ERROR"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": result})
}
