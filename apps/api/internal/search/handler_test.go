package search_test

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"docsearch/api/internal/auth"
	"docsearch/api/internal/platform/response"
	"docsearch/api/internal/search"
	"github.com/google/uuid"
	"github.com/labstack/echo/v4"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestSearch_QueryBuilder(t *testing.T) {
	parts := search.BuildSearchTierQuery("JO-01", "job_no", 1, nil, nil, nil, 20)
	assert.Contains(t, parts.SQL, "j.job_no_norm = $1")
	assert.Equal(t, "JO-01", parts.Args[0])
	assert.Equal(t, 20, parts.Args[1])
}

func TestSearchHandler_EndToEnd(t *testing.T) {
	svc := search.NewService(nil)
	handler := search.NewHandler(svc)
	validator := auth.NewTokenValidator(nil, []byte("dev-secret"), "iss", "aud")

	e := echo.New()
	handler.RegisterRoutes(e, validator)

	token, err := auth.GenerateTestToken(uuid.New(), "viewer_user", []string{"viewer"}, "s1", "t1", 5*time.Minute)
	require.NoError(t, err)

	// 1. Test /api/v1/search (Keyset cursor pagination)
	req := httptest.NewRequest(http.MethodGet, "/api/v1/search?q=JO-01&size=10", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	rec := httptest.NewRecorder()
	e.ServeHTTP(rec, req)

	assert.Equal(t, http.StatusOK, rec.Code)
	var env response.ResponseEnvelope
	err = json.Unmarshal(rec.Body.Bytes(), &env)
	require.NoError(t, err)
	assert.Equal(t, response.CodeSuccess, env.Code)

	// 2. Test /api/v1/system/status
	reqStatus := httptest.NewRequest(http.MethodGet, "/api/v1/system/status", nil)
	reqStatus.Header.Set("Authorization", "Bearer "+token)
	recStatus := httptest.NewRecorder()
	e.ServeHTTP(recStatus, reqStatus)

	assert.Equal(t, http.StatusOK, recStatus.Code)
}
