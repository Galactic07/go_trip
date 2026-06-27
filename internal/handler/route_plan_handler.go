package handler

import (
	"net/http"
	"strconv"
	"strings"

	"gotrip/internal/model"
	"gotrip/internal/repo"
	"gotrip/internal/service"

	"github.com/gin-gonic/gin"
)

type RoutePlanHandler struct {
	repo      repo.RoutePlanRepoInterface
	placeRepo repo.PlaceRepoInterface
	service   *service.RoutePlanService
}

func NewRoutePlanHandler(r repo.RoutePlanRepoInterface, pr repo.PlaceRepoInterface, s *service.RoutePlanService) *RoutePlanHandler {
	return &RoutePlanHandler{repo: r, placeRepo: pr, service: s}
}

func (h *RoutePlanHandler) RegisterRoutes(r *gin.Engine) {
	api := r.Group("/api/routes")
	api.GET("", h.List)
	api.POST("", h.Create)
	api.GET("/:id", h.GetByID)
	api.PUT("/:id", h.Update)
	api.DELETE("/:id", h.Delete)
	api.PATCH("/:id/status", h.UpdateStatus)
}

// List 获取所有路线计划
func (h *RoutePlanHandler) List(c *gin.Context) {
	plans, err := h.repo.List()
	if err != nil {
		respondInternalError(c, "failed to list route plans")
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": plans})
}

// GetByID 获取单个路线计划详情
func (h *RoutePlanHandler) GetByID(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, APIError{Error: "invalid id", Code: "INVALID_ID"})
		return
	}
	plan, err := h.repo.GetByID(uint(id))
	if err != nil {
		c.JSON(http.StatusNotFound, APIError{Error: "路线不存在"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": plan})
}

// createRequest 创建路线计划请求
type createRequest struct {
	Title        string `json:"title"`
	PlaceIDs     []uint `json:"place_ids"`
	AutoOptimize bool   `json:"auto_optimize"`
	Driving      bool   `json:"driving"`
}

// Create 创建路线计划
func (h *RoutePlanHandler) Create(c *gin.Context) {
	var input createRequest
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, APIError{Error: "invalid request body", Code: "INVALID_BODY"})
		return
	}
	if strings.TrimSpace(input.Title) == "" {
		c.JSON(http.StatusBadRequest, APIError{Error: "title is required", Code: "VALIDATION_ERROR"})
		return
	}
	if len(input.PlaceIDs) < 2 {
		c.JSON(http.StatusBadRequest, APIError{Error: "至少需要2个地点", Code: "VALIDATION_ERROR"})
		return
	}

	// 获取所有地点信息
	places, err := h.getPlacesByIDs(input.PlaceIDs)
	if err != nil {
		respondInternalError(c, "failed to fetch places")
		return
	}

	var orderedPlaces []model.Place
	if input.AutoOptimize {
		orderedPlaces = h.service.OptimizeOrder(places, nil)
	} else {
		orderedPlaces = places
	}

	// 计算路线信息（距离/时间）
	routePlaces, err := h.service.CalculateRouteInfo(orderedPlaces, input.Driving)
	if err != nil {
		respondInternalError(c, "failed to calculate route info")
		return
	}

	// 计算总预估时间
	totalTime := 0
	for _, rp := range routePlaces {
		if rp.DriveDuration != nil {
			totalTime += *rp.DriveDuration
		}
		if rp.WalkDuration != nil {
			totalTime += *rp.WalkDuration
		}
	}

	plan := &model.RoutePlan{
		Title:         input.Title,
		Status:        "planned",
		EstimatedTime: &totalTime,
		Places:        routePlaces,
	}

	if err := h.repo.Create(plan); err != nil {
		respondInternalError(c, "failed to create route plan")
		return
	}

	// 重新查询获取完整数据（包含 Place 关联）
	created, err := h.repo.GetByID(plan.ID)
	if err != nil {
		respondInternalError(c, "failed to reload route plan")
		return
	}

	c.JSON(http.StatusCreated, gin.H{"data": created})
}

// updateRequest 更新路线计划请求
type updateRequest struct {
	Title   string            `json:"title"`
	Places  []updatePlaceItem `json:"places"`
	Driving bool              `json:"driving"`
}

type updatePlaceItem struct {
	PlaceID   uint `json:"place_id"`
	SortOrder int  `json:"sort_order"`
}

// Update 更新路线计划（支持手动排序）
func (h *RoutePlanHandler) Update(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, APIError{Error: "invalid id", Code: "INVALID_ID"})
		return
	}

	existing, err := h.repo.GetByID(uint(id))
	if err != nil {
		c.JSON(http.StatusNotFound, APIError{Error: "路线不存在"})
		return
	}

	var input updateRequest
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, APIError{Error: "invalid request body", Code: "INVALID_BODY"})
		return
	}

	if strings.TrimSpace(input.Title) != "" {
		existing.Title = input.Title
	}

	// 如果提供了地点列表，则更新排序
	if len(input.Places) > 0 {
		// 获取所有地点
		placeIDs := make([]uint, len(input.Places))
		for i, p := range input.Places {
			placeIDs[i] = p.PlaceID
		}
		places, err := h.getPlacesByIDs(placeIDs)
		if err != nil {
			respondInternalError(c, "failed to fetch places")
			return
		}

		// 按 input 中的 sort_order 排序
		placeMap := make(map[uint]model.Place)
		for _, p := range places {
			placeMap[p.ID] = p
		}

		// 构建有序地点列表
		orderedPlaces := make([]model.Place, 0, len(input.Places))
		for _, item := range input.Places {
			if p, ok := placeMap[item.PlaceID]; ok {
				orderedPlaces = append(orderedPlaces, p)
			}
		}

		// 重新计算路线信息
		routePlaces, err := h.service.CalculateRouteInfo(orderedPlaces, input.Driving)
		if err != nil {
			respondInternalError(c, "failed to calculate route info")
			return
		}

		// 覆盖 sort_order
		for i := range routePlaces {
			routePlaces[i].SortOrder = i
		}

		existing.Places = routePlaces

		// 重新计算总时间
		totalTime := 0
		for _, rp := range routePlaces {
			if rp.DriveDuration != nil {
				totalTime += *rp.DriveDuration
			}
			if rp.WalkDuration != nil {
				totalTime += *rp.WalkDuration
			}
		}
		existing.EstimatedTime = &totalTime
	}

	if err := h.repo.Update(existing); err != nil {
		respondInternalError(c, "failed to update route plan")
		return
	}

	updated, err := h.repo.GetByID(uint(id))
	if err != nil {
		respondInternalError(c, "failed to reload route plan")
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": updated})
}

// UpdateStatus 更新路线状态
func (h *RoutePlanHandler) UpdateStatus(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, APIError{Error: "invalid id", Code: "INVALID_ID"})
		return
	}

	var input struct {
		Status string `json:"status"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, APIError{Error: "invalid request body", Code: "INVALID_BODY"})
		return
	}

	// 验证状态值
	validStatuses := map[string]bool{
		"planned":     true,
		"in_progress": true,
		"completed":   true,
	}
	if !validStatuses[input.Status] {
		c.JSON(http.StatusBadRequest, APIError{Error: "invalid status, must be planned/in_progress/completed", Code: "VALIDATION_ERROR"})
		return
	}

	if err := h.repo.UpdateStatus(uint(id), input.Status); err != nil {
		respondInternalError(c, "failed to update status")
		return
	}

	updated, err := h.repo.GetByID(uint(id))
	if err != nil {
		respondInternalError(c, "failed to reload route plan")
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": updated})
}

// Delete 删除路线计划
func (h *RoutePlanHandler) Delete(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, APIError{Error: "invalid id", Code: "INVALID_ID"})
		return
	}
	if err := h.repo.Delete(uint(id)); err != nil {
		respondInternalError(c, "failed to delete route plan")
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": gin.H{"id": id, "deleted": true}})
}

// getPlacesByIDs 通过 placeRepo 获取地点列表
func (h *RoutePlanHandler) getPlacesByIDs(ids []uint) ([]model.Place, error) {
	places := make([]model.Place, 0, len(ids))
	for _, id := range ids {
		p, err := h.placeRepo.GetByID(id)
		if err != nil {
			continue
		}
		places = append(places, *p)
	}
	return places, nil
}
