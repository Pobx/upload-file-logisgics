package importer_test

import (
	"bytes"
	"encoding/json"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"docsearch/api/internal/auth"
	"docsearch/api/internal/importer"
	"docsearch/api/internal/platform/response"
	"github.com/google/uuid"
	"github.com/labstack/echo/v4"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestImportHandler_Upload_IdempotencyRequired(t *testing.T) {
	validator := auth.NewTokenValidator(nil, []byte("secret"), "iss", "aud")
	svc := importer.NewService(nil)
	handler := importer.NewHandler(svc)

	e := echo.New()
	handler.RegisterRoutes(e, validator)

	token, _ := auth.GenerateTestToken(uuid.New(), "staff", []string{"staff"}, "s1", "t1", 5*time.Minute)

	// 1. Missing Idempotency-Key -> 400 with code 4001
	req := httptest.NewRequest(http.MethodPost, "/api/v1/imports", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	rec := httptest.NewRecorder()
	e.ServeHTTP(rec, req)

	assert.Equal(t, http.StatusBadRequest, rec.Code)
	var env response.ResponseEnvelope
	_ = json.Unmarshal(rec.Body.Bytes(), &env)
	assert.Equal(t, response.CodeMissingIdempotency, env.Code)

	// 2. With Idempotency-Key and valid CSV
	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)
	part, _ := writer.CreateFormFile("file", "test.csv")
	part.Write([]byte("JobOrder,B/L,Invoice,Customer Name\nJO-01,BL-01,INV-01,Test Corp\n"))
	writer.Close()

	reqValid := httptest.NewRequest(http.MethodPost, "/api/v1/imports", body)
	reqValid.Header.Set("Content-Type", writer.FormDataContentType())
	reqValid.Header.Set("Authorization", "Bearer "+token)
	reqValid.Header.Set("Idempotency-Key", uuid.NewString())
	recValid := httptest.NewRecorder()
	e.ServeHTTP(recValid, reqValid)

	assert.Equal(t, http.StatusOK, recValid.Code)
	var envValid response.ResponseEnvelope
	err := json.Unmarshal(recValid.Body.Bytes(), &envValid)
	require.NoError(t, err)
	assert.Equal(t, response.CodeSuccess, envValid.Code)
}
