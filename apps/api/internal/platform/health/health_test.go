package health_test

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"docsearch/api/internal/platform/health"
	"docsearch/api/internal/platform/response"
	"github.com/labstack/echo/v4"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestHealth_Healthz(t *testing.T) {
	e := echo.New()
	handler := health.NewHandler(nil)

	req := httptest.NewRequest(http.MethodGet, "/healthz", nil)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)

	err := handler.Healthz(c)
	require.NoError(t, err)

	assert.Equal(t, http.StatusOK, rec.Code)

	var env response.ResponseEnvelope
	err = json.Unmarshal(rec.Body.Bytes(), &env)
	require.NoError(t, err)
	assert.Equal(t, response.CodeSuccess, env.Code)
}

func TestHealth_Readyz_NilDB(t *testing.T) {
	e := echo.New()
	handler := health.NewHandler(nil)

	req := httptest.NewRequest(http.MethodGet, "/readyz", nil)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)

	err := handler.Readyz(c)
	require.NoError(t, err)

	assert.Equal(t, http.StatusServiceUnavailable, rec.Code)
	assert.Equal(t, "5", rec.Header().Get("Retry-After"))

	var env response.ResponseEnvelope
	err = json.Unmarshal(rec.Body.Bytes(), &env)
	require.NoError(t, err)
	assert.Equal(t, response.CodeDBUnavailable, env.Code)
}
