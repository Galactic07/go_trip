package handler

import (
	"net/http"
	"strconv"
	"strings"
	"time"

	"gotrip/internal/model"
	"gotrip/internal/repo"

	"github.com/gin-gonic/gin"
)

type PlaceHandler struct {
	repo repo.PlaceRepoInterface
}

func NewPlaceHandler(repo repo.PlaceRepoInterface) *PlaceHandler {
	return &PlaceHandler{repo: repo}
}

func (h *PlaceHandler) RegisterRoutes(r *gin.Engine) {
	api := r.Group("/api/places")
	api.GET("", h.List)
	api.POST("", h.Create)
	api.GET("/:id", h.GetByID)
	api.PUT("/:id", h.Update)
	api.DELETE("/:id", h.Delete)
	api.PATCH("/:id/status", h.UpdateStatus)
	api.PATCH("/batch-status", h.BatchUpdateStatus)
}

func (h *PlaceHandler) List(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "50"))
	if page < 1 {
		page = 1
	}
	if pageSize < 1 {
		pageSize = 50
	}
	offset := (page - 1) * pageSize

	var places []model.Place
	var err error
	status := c.Query("status")
	if status != "" {
		places, err = h.repo.ListByStatus(status, offset, pageSize)
	} else {
		places, err = h.repo.List(offset, pageSize)
	}
	if err != nil {
		respondInternalError(c, "failed to list places")
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data":      places,
		"total":     len(places),
		"page":      page,
		"page_size": pageSize,
	})
}

func (h *PlaceHandler) Create(c *gin.Context) {
	var input model.Place
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, APIError{Error: "invalid request body", Code: "INVALID_BODY"})
		return
	}

	if strings.TrimSpace(input.Name) == "" {
		c.JSON(http.StatusBadRequest, APIError{Error: "name is required", Code: "VALIDATION_ERROR"})
		return
	}
	if input.Lng == 0 && input.Lat == 0 {
		c.JSON(http.StatusBadRequest, APIError{Error: "lng and lat are required", Code: "VALIDATION_ERROR"})
		return
	}

	existing, err := h.repo.FindByNameAndLocation(input.Name, input.Lng, input.Lat)
	if err != nil {
		respondInternalError(c, "failed to check duplicate place")
		return
	}
	if existing != nil {
		c.JSON(http.StatusConflict, APIError{
			Error: "该地点已在心愿单中",
			Code:  "DUPLICATE_PLACE",
		})
		return
	}

	nearby, err := h.repo.FindNearby(input.City, input.Lng, input.Lat)
	if err != nil {
		respondInternalError(c, "failed to check nearby places")
		return
	}
	if len(nearby) > 0 {
		c.JSON(http.StatusConflict, APIError{
			Error:   "该地点附近已存在标记",
			Code:    "NEARBY_PLACE_EXISTS",
			Details: gin.H{"existing_place": nearby[0]},
		})
		return
	}

	place := &model.Place{
		Name:     input.Name,
		Address:  input.Address,
		Lng:      input.Lng,
		Lat:      input.Lat,
		Province: input.Province,
		City:     input.City,
		District: input.District,
		Street:   input.Street,
		Adcode:   input.Adcode,
		Tags:     input.Tags,
		Note:     input.Note,
	}

	if err := h.repo.Create(place); err != nil {
		if strings.Contains(err.Error(), "is required") || strings.Contains(err.Error(), "invalid") {
			c.JSON(http.StatusBadRequest, APIError{Error: err.Error(), Code: "VALIDATION_ERROR"})
			return
		}
		respondInternalError(c, "failed to create place")
		return
	}

	c.JSON(http.StatusCreated, gin.H{"data": place})
}

func (h *PlaceHandler) GetByID(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, APIError{Error: "invalid id", Code: "INVALID_ID"})
		return
	}

	place, err := h.repo.GetByID(uint(id))
	if err != nil {
		c.JSON(http.StatusNotFound, APIError{Error: "地点不存在"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": place})
}

func (h *PlaceHandler) Update(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, APIError{Error: "invalid id", Code: "INVALID_ID"})
		return
	}

	existing, err := h.repo.GetByID(uint(id))
	if err != nil {
		c.JSON(http.StatusNotFound, APIError{Error: "地点不存在"})
		return
	}

	var input struct {
		Tags          []string           `json:"tags"`
		Note          string             `json:"note"`
		Status        *model.PlaceStatus `json:"status"`
		StayDuration  *int               `json:"stay_duration"`
		EstimatedCost *int               `json:"estimated_cost"`
		SceneType     *model.SceneType   `json:"scene_type"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, APIError{Error: "invalid request body", Code: "INVALID_BODY"})
		return
	}

	existing.Tags = model.StringArray(input.Tags)
	existing.Note = input.Note
	if input.Status != nil {
		existing.Status = *input.Status
		if existing.Status == model.PlaceStatusVisited && existing.VisitedAt == nil {
			now := time.Now()
			existing.VisitedAt = &now
		}
	}
	if input.StayDuration != nil {
		existing.StayDuration = *input.StayDuration
	}
	if input.EstimatedCost != nil {
		existing.EstimatedCost = input.EstimatedCost
	}
	if input.SceneType != nil {
		existing.SceneType = *input.SceneType
	}

	if err := h.repo.Update(existing); err != nil {
		respondInternalError(c, "failed to update place")
		return
	}

	updated, err := h.repo.GetByID(uint(id))
	if err != nil {
		respondInternalError(c, "failed to reload place")
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": updated})
}

func (h *PlaceHandler) Delete(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, APIError{Error: "invalid id", Code: "INVALID_ID"})
		return
	}

	if err := h.repo.Delete(uint(id)); err != nil {
		respondInternalError(c, "failed to delete place")
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": gin.H{"id": id, "deleted": true}})
}

func (h *PlaceHandler) UpdateStatus(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, APIError{Error: "invalid id", Code: "INVALID_ID"})
		return
	}

	var input struct {
		Status model.PlaceStatus `json:"status" binding:"required"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, APIError{Error: "invalid request body", Code: "INVALID_BODY"})
		return
	}

	validStatuses := map[model.PlaceStatus]bool{
		model.PlaceStatusWishlist:  true,
		model.PlaceStatusVisited:   true,
		model.PlaceStatusPending:   true,
		model.PlaceStatusAbandoned: true,
	}
	if !validStatuses[input.Status] {
		c.JSON(http.StatusBadRequest, APIError{Error: "invalid status value", Code: "VALIDATION_ERROR"})
		return
	}

	var visitedAt *time.Time
	if input.Status == model.PlaceStatusVisited {
		now := time.Now()
		visitedAt = &now
	}

	if err := h.repo.UpdateStatus(uint(id), input.Status, visitedAt); err != nil {
		respondInternalError(c, "failed to update status")
		return
	}

	updated, err := h.repo.GetByID(uint(id))
	if err != nil {
		respondInternalError(c, "failed to reload place")
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": updated})
}

func (h *PlaceHandler) BatchUpdateStatus(c *gin.Context) {
	var input struct {
		IDs    []uint            `json:"ids" binding:"required,min=1"`
		Status model.PlaceStatus `json:"status" binding:"required"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, APIError{Error: "invalid request body", Code: "INVALID_BODY"})
		return
	}

	validStatuses := map[model.PlaceStatus]bool{
		model.PlaceStatusWishlist:  true,
		model.PlaceStatusVisited:   true,
		model.PlaceStatusPending:   true,
		model.PlaceStatusAbandoned: true,
	}
	if !validStatuses[input.Status] {
		c.JSON(http.StatusBadRequest, APIError{Error: "invalid status value", Code: "VALIDATION_ERROR"})
		return
	}

	if err := h.repo.BatchUpdateStatus(input.IDs, input.Status); err != nil {
		respondInternalError(c, "failed to batch update status")
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": gin.H{
			"updated_count": len(input.IDs),
			"status":        input.Status,
		},
	})
}
