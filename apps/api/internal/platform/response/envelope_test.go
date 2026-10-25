package response_test

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"docsearch/api/internal/platform/response"
	"github.com/labstack/echo/v4"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestEnvelope_OK(t *testing.T) {
	e := echo.New()
	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)

	data := map[string]string{"name": "test"}
	err := response.OK(c, data)
	require.NoError(t, err)

	assert.Equal(t, http.StatusOK, rec.Code)

	var env response.ResponseEnvelope
	err = json.Unmarshal(rec.Body.Bytes(), &env)
	require.NoError(t, err)

	assert.Equal(t, response.CodeSuccess, env.Code)
	assert.Equal(t, "Successfully", env.Message)
	assert.NotNil(t, env.Data)
	assert.Nil(t, env.Meta)
}

func TestEnvelope_OK_WithOffsetMeta(t *testing.T) {
	e := echo.New()
	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)

	list := []string{"item1", "item2"}
	meta := response.PageMeta{Page: 1, Size: 2, Total: 10}
	err := response.OK(c, list, meta)
	require.NoError(t, err)

	assert.Equal(t, http.StatusOK, rec.Code)

	var env response.ResponseEnvelope
	err = json.Unmarshal(rec.Body.Bytes(), &env)
	require.NoError(t, err)

	assert.Equal(t, response.CodeSuccess, env.Code)
	assert.NotNil(t, env.Meta)
}

func TestEnvelope_NoContentSuccess(t *testing.T) {
	e := echo.New()
	req := httptest.NewRequest(http.MethodDelete, "/test/1", nil)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)

	err := response.NoContentSuccess(c)
	require.NoError(t, err)

	assert.Equal(t, http.StatusOK, rec.Code)

	var env response.ResponseEnvelope
	err = json.Unmarshal(rec.Body.Bytes(), &env)
	require.NoError(t, err)

	assert.Equal(t, response.CodeSuccess, env.Code)
	assert.Nil(t, env.Data)
}

func TestEnvelope_DBUnavailable(t *testing.T) {
	e := echo.New()
	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)

	err := response.DBUnavailable(c, 5)
	require.NoError(t, err)

	assert.Equal(t, http.StatusServiceUnavailable, rec.Code)
	assert.Equal(t, "5", rec.Header().Get("Retry-After"))

	var env response.ResponseEnvelope
	err = json.Unmarshal(rec.Body.Bytes(), &env)
	require.NoError(t, err)

	assert.Equal(t, response.CodeDBUnavailable, env.Code)
	assert.Equal(t, "Database unavailable", env.Message)
}
