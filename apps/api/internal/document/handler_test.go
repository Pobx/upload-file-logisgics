package document_test

import (
	"bytes"
	"encoding/json"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"
	"time"

	"docsearch/api/internal/auth"
	"docsearch/api/internal/document"
	"docsearch/api/internal/platform/response"
	"docsearch/api/internal/storage"
	"github.com/google/uuid"
	"github.com/labstack/echo/v4"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestDocumentHandler_Upload_And_SignedDownload(t *testing.T) {
	tempDir, err := os.MkdirTemp("", "doc_handler_test")
	require.NoError(t, err)
	defer os.RemoveAll(tempDir)

	secretKey := []byte("test-download-secret-key-1234567")
	store := storage.NewSharedFolderStorage(tempDir, secretKey)
	svc := document.NewService(nil, store, nil)
	handler := document.NewHandler(svc, secretKey)

	validator := auth.NewTokenValidator(nil, []byte("dev-secret"), "iss", "aud")
	e := echo.New()
	handler.RegisterRoutes(e, validator)

	jobOrderID := uuid.New()
	userID := uuid.New()
	token, _ := auth.GenerateTestToken(userID, "staff_user", []string{"staff"}, "s1", "t1", 5*time.Minute)

	// 1. Upload Document
	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)
	part, _ := writer.CreateFormFile("file", "bl_document.pdf")
	fileContent := "%PDF-1.4 sample bill of lading content"
	part.Write([]byte(fileContent))
	_ = writer.WriteField("document_type_id", "1")
	_ = writer.WriteField("provided_by_name", "Global Shipping Co.")
	_ = writer.WriteField("provided_by_type", "agent")
	writer.Close()

	req := httptest.NewRequest(http.MethodPost, "/api/v1/job-orders/"+jobOrderID.String()+"/documents", body)
	req.Header.Set("Content-Type", writer.FormDataContentType())
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Idempotency-Key", uuid.NewString())
	rec := httptest.NewRecorder()
	e.ServeHTTP(rec, req)

	assert.Equal(t, http.StatusCreated, rec.Code)
	var env response.ResponseEnvelope
	err = json.Unmarshal(rec.Body.Bytes(), &env)
	require.NoError(t, err)
	assert.Equal(t, response.CodeCreated, env.Code)

	// 2. Generate Signed Download Link
	docData := env.Data.(map[string]interface{})
	docIDStr := docData["id"].(string)

	reqLink := httptest.NewRequest(http.MethodGet, "/api/v1/documents/"+docIDStr+"/download-link", nil)
	reqLink.Header.Set("Authorization", "Bearer "+token)
	recLink := httptest.NewRecorder()
	e.ServeHTTP(recLink, reqLink)

	assert.Equal(t, http.StatusOK, recLink.Code)
	var envLink response.ResponseEnvelope
	err = json.Unmarshal(recLink.Body.Bytes(), &envLink)
	require.NoError(t, err)
	downloadURL := envLink.Data.(map[string]interface{})["download_url"].(string)
	assert.NotEmpty(t, downloadURL)

	// 3. Download via public signed URL (no Authorization header required)
	reqDownload := httptest.NewRequest(http.MethodGet, downloadURL, nil)
	recDownload := httptest.NewRecorder()
	e.ServeHTTP(recDownload, reqDownload)

	assert.Equal(t, http.StatusOK, recDownload.Code)
	assert.Equal(t, fileContent, recDownload.Body.String())
}

func TestDocumentHandler_ListByJobOrderID(t *testing.T) {
	secretKey := []byte("test-download-secret-key-1234567")
	svc := document.NewService(nil, nil, nil)
	handler := document.NewHandler(svc, secretKey)

	validator := auth.NewTokenValidator(nil, []byte("dev-secret"), "iss", "aud")
	e := echo.New()
	handler.RegisterRoutes(e, validator)

	jobOrderID := uuid.New()
	userID := uuid.New()
	viewerToken, _ := auth.GenerateTestToken(userID, "viewer_user", []string{"viewer"}, "s1", "t1", 5*time.Minute)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/job-orders/"+jobOrderID.String()+"/documents", nil)
	req.Header.Set("Authorization", "Bearer "+viewerToken)
	rec := httptest.NewRecorder()
	e.ServeHTTP(rec, req)

	assert.Equal(t, http.StatusOK, rec.Code)
}
