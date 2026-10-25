package health

import (
	"context"
	"net/http"
	"time"

	"docsearch/api/internal/platform/database"
	"docsearch/api/internal/platform/response"
	"github.com/labstack/echo/v4"
)

type Handler struct {
	db *database.DB
}

func NewHandler(db *database.DB) *Handler {
	return &Handler{db: db}
}

// Healthz handles liveness probe (checks process only, no dependencies)
func (h *Handler) Healthz(c echo.Context) error {
	return response.JSON(c, http.StatusOK, response.CodeSuccess, "OK", map[string]string{
		"status": "UP",
	})
}

// Readyz handles readiness probe (checks DB connectivity)
func (h *Handler) Readyz(c echo.Context) error {
	if h.db == nil {
		return response.DBUnavailable(c, 5)
	}

	ctx, cancel := context.WithTimeout(c.Request().Context(), 2*time.Second)
	defer cancel()

	if err := h.db.Ping(ctx); err != nil {
		return response.DBUnavailable(c, 5)
	}

	return response.JSON(c, http.StatusOK, response.CodeSuccess, "Ready", map[string]string{
		"status":   "READY",
		"database": "UP",
	})
}

// RegisterRoutes mounts healthcheck endpoints
func (h *Handler) RegisterRoutes(e *echo.Echo) {
	e.GET("/healthz", h.Healthz)
	e.GET("/readyz", h.Readyz)
}
