package search

import (
	"errors"
	"net/http"
	"strconv"

	"docsearch/api/internal/auth"
	"docsearch/api/internal/platform/response"
	"github.com/google/uuid"
	"github.com/labstack/echo/v4"
)

type Handler struct {
	service *ServiceImpl
}

func NewHandler(service *ServiceImpl) *Handler {
	return &Handler{service: service}
}

func (h *Handler) Search(c echo.Context) error {
	keyset := response.ParseKeysetParams(c)

	filter := SearchFilter{
		Query:  c.QueryParam("q"),
		Field:  c.QueryParam("field"),
		Cursor: keyset.Cursor,
		Size:   keyset.Size,
	}

	if custIDStr := c.QueryParam("customer_id"); custIDStr != "" {
		if u, err := uuid.Parse(custIDStr); err == nil {
			filter.CustomerID = &u
		}
	}

	if assigneeIDStr := c.QueryParam("assignee_id"); assigneeIDStr != "" {
		if u, err := uuid.Parse(assigneeIDStr); err == nil {
			filter.AssigneeID = &u
		}
	}

	results, nextCursor, hasNext, err := h.service.Search(c.Request().Context(), filter)
	if err != nil {
		if errors.Is(err, response.ErrInvalidCursor) {
			return response.Error(c, http.StatusBadRequest, response.CodeValidationFailed, "Invalid cursor format", nil)
		}
		return response.Error(c, http.StatusInternalServerError, response.CodeInternalError, "Search failed", nil)
	}

	meta := response.CursorMeta{
		Size:       len(results),
		NextCursor: nextCursor,
		HasNext:    hasNext,
	}

	return response.OK(c, results, meta)
}

func (h *Handler) QuickLookup(c echo.Context) error {
	q := c.QueryParam("q")
	item, err := h.service.QuickLookup(c.Request().Context(), q)
	if err != nil {
		return response.NotFound(c, "No exact match found")
	}
	return response.OK(c, item)
}

func (h *Handler) BulkSearch(c echo.Context) error {
	var body struct {
		Numbers []string `json:"numbers"`
	}
	if err := c.Bind(&body); err != nil || len(body.Numbers) == 0 {
		return response.ValidationError(c, []response.FieldError{
			{Field: "numbers", Message: "numbers array is required (max 200 items)"},
		})
	}
	if len(body.Numbers) > 200 {
		return response.ValidationError(c, []response.FieldError{
			{Field: "numbers", Message: "cannot search more than 200 numbers at once"},
		})
	}

	found, notFound, err := h.service.BulkSearch(c.Request().Context(), body.Numbers)
	if err != nil {
		return response.Error(c, http.StatusInternalServerError, response.CodeInternalError, "Bulk search failed", nil)
	}

	return response.OK(c, map[string]interface{}{
		"found":     found,
		"not_found": notFound,
	})
}

func (h *Handler) RecentDocuments(c echo.Context) error {
	limit := 10
	if lStr := c.QueryParam("limit"); lStr != "" {
		if l, err := strconv.Atoi(lStr); err == nil && l > 0 && l <= 50 {
			limit = l
		}
	}

	docs, err := h.service.GetRecentDocuments(c.Request().Context(), limit)
	if err != nil {
		return response.Error(c, http.StatusInternalServerError, response.CodeInternalError, "Failed to fetch recent documents", nil)
	}

	return response.OK(c, docs)
}

func (h *Handler) WorkQueue(c echo.Context) error {
	params, err := response.ParseOffsetParams(c)
	if err != nil {
		return response.Error(c, http.StatusBadRequest, response.CodeValidationFailed, err.Error(), nil)
	}

	filter := c.QueryParam("filter")
	var currentUserID *uuid.UUID
	if uID, err := auth.GetUserID(c); err == nil {
		currentUserID = &uID
	}

	items, total, err := h.service.GetWorkQueue(c.Request().Context(), filter, params.Page, params.Size, currentUserID)
	if err != nil {
		return response.Error(c, http.StatusInternalServerError, response.CodeInternalError, "Failed to fetch work queue", nil)
	}

	meta := response.PageMeta{
		Page:  params.Page,
		Size:  params.Size,
		Total: total,
	}

	return response.OK(c, items, meta)
}

func (h *Handler) SystemStatus(c echo.Context) error {
	// Status summary for notification banner
	return response.OK(c, map[string]string{
		"database": "OK",
		"storage":  "OK",
		"system":   "OK",
	})
}

func (h *Handler) RegisterRoutes(e *echo.Echo, validator *auth.TokenValidator) {
	api := e.Group("/api/v1", auth.RequireAuth(validator))

	api.GET("/search", h.Search)
	api.GET("/search/quick", h.QuickLookup)
	api.POST("/search/bulk", h.BulkSearch)
	api.GET("/dashboard/recent-documents", h.RecentDocuments)
	api.GET("/dashboard/work-queue", h.WorkQueue)
	api.GET("/system/status", h.SystemStatus)
}
