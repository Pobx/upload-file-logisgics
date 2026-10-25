package report

import (
	"net/http"
	"time"

	"docsearch/api/internal/auth"
	"docsearch/api/internal/platform/response"
	"github.com/labstack/echo/v4"
)

type Handler struct {
	service *ServiceImpl
}

func NewHandler(service *ServiceImpl) *Handler {
	return &Handler{service: service}
}

func (h *Handler) UploadsByUser(c echo.Context) error {
	now := time.Now()
	from := now.AddDate(0, -1, 0)
	to := now

	if fromStr := c.QueryParam("from"); fromStr != "" {
		if t, err := time.Parse("2006-01-02", fromStr); err == nil {
			from = t
		}
	}
	if toStr := c.QueryParam("to"); toStr != "" {
		if t, err := time.Parse("2006-01-02", toStr); err == nil {
			to = t
		}
	}

	stats, err := h.service.GetUploadsByUser(c.Request().Context(), from, to)
	if err != nil {
		return response.Error(c, http.StatusInternalServerError, response.CodeInternalError, "Failed to fetch report", nil)
	}

	return response.OK(c, stats)
}

func (h *Handler) MissingDocuments(c echo.Context) error {
	params, err := response.ParseOffsetParams(c)
	if err != nil {
		return response.Error(c, http.StatusBadRequest, response.CodeValidationFailed, err.Error(), nil)
	}

	items, total, err := h.service.GetMissingDocuments(c.Request().Context(), params.Size, params.Offset)
	if err != nil {
		return response.Error(c, http.StatusInternalServerError, response.CodeInternalError, "Failed to fetch missing documents", nil)
	}

	meta := response.PageMeta{
		Page:  params.Page,
		Size:  params.Size,
		Total: total,
	}

	return response.OK(c, items, meta)
}

func (h *Handler) ExportCSV(c echo.Context) error {
	reportType := c.Param("type")
	c.Response().Header().Set("Content-Type", "text/csv; charset=utf-8")
	c.Response().Header().Set("Content-Disposition", `attachment; filename="`+reportType+`.csv"`)

	return h.service.ExportReportCSV(c.Request().Context(), reportType, c.Response().Writer)
}

func (h *Handler) RegisterRoutes(e *echo.Echo, validator *auth.TokenValidator) {
	group := e.Group("/api/v1/reports", auth.RequireAuth(validator))
	group.GET("/uploads-by-user", h.UploadsByUser, auth.RequireRole("admin", "staff"))
	group.GET("/missing-documents", h.MissingDocuments)
	group.GET("/:type/export.csv", h.ExportCSV)
}
