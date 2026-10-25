package report_test

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"docsearch/api/internal/auth"
	"docsearch/api/internal/platform/response"
	"docsearch/api/internal/report"
	"github.com/google/uuid"
	"github.com/labstack/echo/v4"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestReportHandler(t *testing.T) {
	svc := report.NewService(nil)
	handler := report.NewHandler(svc)
	validator := auth.NewTokenValidator(nil, []byte("dev-secret"), "iss", "aud")

	e := echo.New()
	handler.RegisterRoutes(e, validator)

	token, _ := auth.GenerateTestToken(uuid.New(), "staff", []string{"staff"}, "s1", "t1", 5*time.Minute)

	// 1. Missing documents report
	req := httptest.NewRequest(http.MethodGet, "/api/v1/reports/missing-documents", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	rec := httptest.NewRecorder()
	e.ServeHTTP(rec, req)

	assert.Equal(t, http.StatusOK, rec.Code)
	var env response.ResponseEnvelope
	err := json.Unmarshal(rec.Body.Bytes(), &env)
	require.NoError(t, err)
	assert.Equal(t, response.CodeSuccess, env.Code)

	// 2. Export CSV report
	reqCSV := httptest.NewRequest(http.MethodGet, "/api/v1/reports/missing-documents/export.csv", nil)
	reqCSV.Header.Set("Authorization", "Bearer "+token)
	recCSV := httptest.NewRecorder()
	e.ServeHTTP(recCSV, reqCSV)

	assert.Equal(t, http.StatusOK, recCSV.Code)
	assert.Contains(t, recCSV.Header().Get("Content-Type"), "text/csv")
	assert.Contains(t, recCSV.Body.String(), "Job Order")
}
