package importer

import (
	"net/http"
	"strings"

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

func (h *Handler) Upload(c echo.Context) error {
	// 1. Validate Idempotency-Key header (ADR-014)
	idemKey := c.Request().Header.Get("Idempotency-Key")
	if idemKey == "" {
		return response.Error(c, http.StatusBadRequest, response.CodeMissingIdempotency, "Missing required Idempotency-Key header", nil)
	}

	// 2. Read multipart file
	file, err := c.FormFile("file")
	if err != nil {
		return response.Error(c, http.StatusBadRequest, response.CodeValidationFailed, "File is required", nil)
	}

	src, err := file.Open()
	if err != nil {
		return response.Error(c, http.StatusInternalServerError, response.CodeInternalError, "Cannot read file", nil)
	}
	defer src.Close()

	userID, _ := auth.GetUserID(c)
	summary, err := h.service.UploadAndPreview(c.Request().Context(), file.Filename, src, userID)
	if err != nil {
		return response.Error(c, http.StatusBadRequest, response.CodeValidationFailed, err.Error(), nil)
	}

	return response.OK(c, summary)
}

func (h *Handler) Commit(c echo.Context) error {
	idStr := c.Param("id")
	batchID, err := uuid.Parse(idStr)
	if err != nil {
		return response.NotFound(c, "Import batch not found")
	}

	var body struct {
		ConflictPolicy string `json:"conflict_policy"`
	}
	_ = c.Bind(&body)

	policy := ConflictPolicyKeepExisting
	if strings.ToLower(body.ConflictPolicy) == "use_csv" {
		policy = ConflictPolicyUseCSV
	}

	if err := h.service.Commit(c.Request().Context(), batchID, policy); err != nil {
		return response.Error(c, http.StatusInternalServerError, response.CodeInternalError, "Failed to commit batch", nil)
	}

	return response.Accepted(c, map[string]interface{}{
		"batch_id": batchID,
		"status":   "queued",
		"policy":   policy,
	})
}

func (h *Handler) GetStatus(c echo.Context) error {
	idStr := c.Param("id")
	batchID, err := uuid.Parse(idStr)
	if err != nil {
		return response.NotFound(c, "Import batch not found")
	}

	batch, err := h.service.GetBatch(c.Request().Context(), batchID)
	if err != nil {
		return response.NotFound(c, "Import batch not found")
	}

	return response.OK(c, batch)
}

func (h *Handler) RegisterRoutes(e *echo.Echo, validator *auth.TokenValidator) {
	group := e.Group("/api/v1/imports", auth.RequireAuth(validator), auth.RequireRole("admin", "staff"))
	group.POST("", h.Upload)
	group.POST("/:id/commit", h.Commit)
	group.GET("/:id", h.GetStatus)
}
