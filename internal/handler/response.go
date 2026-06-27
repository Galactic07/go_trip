package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

type APIError struct {
	Error   string `json:"error"`
	Code    string `json:"code,omitempty"`
	Details any    `json:"details,omitempty"`
}

func respondError(c *gin.Context, status int, message string) {
	c.JSON(status, APIError{Error: message})
}

func respondInternalError(c *gin.Context, message string) {
	c.JSON(http.StatusInternalServerError, APIError{Error: message, Code: "INTERNAL_ERROR"})
}
