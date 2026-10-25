package document

import (
	"errors"
	"io"
	"net/http"
	"path/filepath"
	"strconv"

	"docsearch/api/internal/auth"
	"docsearch/api/internal/platform/response"
	"docsearch/api/internal/storage"
	"github.com/google/uuid"
	"github.com/labstack/echo/v4"
)

type Handler struct {
	service   *ServiceImpl
	secretKey []byte
}

func NewHandler(service *ServiceImpl, secretKey []byte) *Handler {
	return &Handler{
		service:   service,
		secretKey: secretKey,
	}
}

func (h *Handler) Upload(c echo.Context) error {
	// 1. Check Idempotency-Key header
	idemKey := c.Request().Header.Get("Idempotency-Key")
	if idemKey == "" {
		return response.Error(c, http.StatusBadRequest, response.CodeMissingIdempotency, "Missing required Idempotency-Key header", nil)
	}

	jobOrderIDStr := c.Param("id")
	jobOrderID, err := uuid.Parse(jobOrderIDStr)
	if err != nil {
		return response.NotFound(c, "Job order not found")
	}

	docTypeIDStr := c.FormValue("document_type_id")
	docTypeID, _ := strconv.Atoi(docTypeIDStr)
	if docTypeID <= 0 {
		docTypeID = 1 // default to B/L
	}

	providedByName := c.FormValue("provided_by_name")
	providedByType := c.FormValue("provided_by_type")

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

	req := UploadDocumentRequest{
		JobOrderID:     jobOrderID,
		DocumentTypeID: docTypeID,
		FileName:       file.Filename,
		MimeType:       file.Header.Get("Content-Type"),
		SizeBytes:      file.Size,
		Reader:         src,
		UploadedBy:     userID,
		IdempotencyKey: idemKey,
	}
	if providedByName != "" {
		req.ProvidedByName = &providedByName
	}
	if providedByType != "" {
		req.ProvidedByType = &providedByType
	}

	doc, isDuplicate, err := h.service.UploadDocument(c.Request().Context(), req)
	if err != nil {
		if errors.Is(err, storage.ErrMountMissing) {
			return response.StorageUnavailable(c, 5)
		}
		return response.Error(c, http.StatusInternalServerError, response.CodeInternalError, err.Error(), nil)
	}

	if isDuplicate {
		return response.JSON(c, http.StatusOK, response.CodeSuccess, "File already exists", map[string]interface{}{
			"document":  doc,
			"duplicate": true,
		})
	}

	return response.Created(c, doc)
}

func (h *Handler) GetDownloadLink(c echo.Context) error {
	idStr := c.Param("id")
	docID, err := uuid.Parse(idStr)
	if err != nil {
		return response.NotFound(c, "Document not found")
	}

	userID, _ := auth.GetUserID(c)
	link, err := h.service.GetDownloadLink(c.Request().Context(), docID, userID)
	if err != nil {
		if errors.Is(err, ErrDocumentNotFound) {
			return response.NotFound(c, "Document not found")
		}
		return response.Error(c, http.StatusInternalServerError, response.CodeInternalError, "Failed to generate link", nil)
	}

	return response.OK(c, map[string]string{
		"download_url": link,
	})
}

// Download handles public signed link download: /api/v1/dl/:token
func (h *Handler) Download(c echo.Context) error {
	token := c.Param("token")
	ref, err := storage.VerifyDownloadToken(token, h.secretKey)
	if err != nil {
		return response.Error(c, http.StatusUnauthorized, response.CodeUnauthorized, "Invalid or expired download link", nil)
	}

	reader, stat, err := h.service.OpenFile(c.Request().Context(), ref)
	if err != nil {
		return response.NotFound(c, "File not found on storage")
	}
	defer reader.Close()

	fileName := filepath.Base(ref)
	c.Response().Header().Set("Content-Disposition", `attachment; filename="`+fileName+`"`)
	if stat != nil && stat.Size > 0 {
		c.Response().Header().Set("Content-Length", strconv.FormatInt(stat.Size, 10))
	}

	_, err = io.Copy(c.Response().Writer, reader)
	return err
}

func (h *Handler) Delete(c echo.Context) error {
	idStr := c.Param("id")
	docID, err := uuid.Parse(idStr)
	if err != nil {
		return response.NotFound(c, "Document not found")
	}

	userID, _ := auth.GetUserID(c)
	if err := h.service.SoftDelete(c.Request().Context(), docID, userID); err != nil {
		return response.Error(c, http.StatusInternalServerError, response.CodeInternalError, "Failed to delete document", nil)
	}

	return response.NoContentSuccess(c)
}

func (h *Handler) ListByJobOrderID(c echo.Context) error {
	jobOrderIDStr := c.Param("id")
	jobOrderID, err := uuid.Parse(jobOrderIDStr)
	if err != nil {
		return response.NotFound(c, "Job order not found")
	}

	docs, err := h.service.ListByJobOrderID(c.Request().Context(), jobOrderID)
	if err != nil {
		return response.Error(c, http.StatusInternalServerError, response.CodeInternalError, "Failed to list documents", nil)
	}

	return response.OK(c, docs)
}

func (h *Handler) RegisterRoutes(e *echo.Echo, validator *auth.TokenValidator) {
	staffGroup := e.Group("/api/v1", auth.RequireAuth(validator), auth.RequireRole("admin", "staff"))
	staffGroup.POST("/job-orders/:id/documents", h.Upload)

	allGroup := e.Group("/api/v1", auth.RequireAuth(validator))
	allGroup.GET("/job-orders/:id/documents", h.ListByJobOrderID)
	allGroup.GET("/documents/:id/download-link", h.GetDownloadLink)

	adminGroup := e.Group("/api/v1", auth.RequireAuth(validator), auth.RequireRole("admin"))
	adminGroup.DELETE("/documents/:id", h.Delete)

	// Public signed download link (No Bearer required, verified by HMAC token)
	e.GET("/api/v1/dl/:token", h.Download)
}
