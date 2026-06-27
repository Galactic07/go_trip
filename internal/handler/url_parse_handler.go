package handler

import (
	"net/http"
	"net/url"
	"strings"

	"gotrip/internal/service"

	"github.com/gin-gonic/gin"
)

type UrlParseHandler struct {
	svc *service.UrlParseService
}

func NewUrlParseHandler(svc *service.UrlParseService) *UrlParseHandler {
	return &UrlParseHandler{svc: svc}
}

func (h *UrlParseHandler) RegisterRoutes(r *gin.Engine) {
	r.POST("/api/v1/parse-url", h.ParseURL)
}

func (h *UrlParseHandler) ParseURL(c *gin.Context) {
	var input struct {
		URL string `json:"url" binding:"required"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, APIError{Error: "url is required", Code: "INVALID_BODY"})
		return
	}

	input.URL = strings.TrimSpace(input.URL)
	if input.URL == "" {
		c.JSON(http.StatusBadRequest, APIError{Error: "url cannot be empty", Code: "VALIDATION_ERROR"})
		return
	}

	// 验证是否是有效 URL
	if _, err := url.ParseRequestURI(input.URL); err != nil {
		c.JSON(http.StatusBadRequest, APIError{Error: "invalid URL format", Code: "VALIDATION_ERROR"})
		return
	}

	result, err := h.svc.ParseURL(input.URL)
	if err != nil {
		c.JSON(http.StatusBadGateway, APIError{
			Error:   "解析链接失败",
			Code:    "PARSE_ERROR",
			Details: gin.H{"message": err.Error()},
		})
		return
	}

	if !result.Success {
		c.JSON(http.StatusOK, gin.H{
			"data": gin.H{
				"success": false,
				"title":   "",
				"address": "",
				"message":  "无法识别链接中的地点信息，请手动输入名称",
			},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": result})
}
