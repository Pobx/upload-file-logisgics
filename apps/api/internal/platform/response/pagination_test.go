package response_test

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"docsearch/api/internal/platform/response"
	"github.com/labstack/echo/v4"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

type sampleCursor struct {
	ID   string `json:"id"`
	Tier int    `json:"tier"`
}

func TestPagination_Offset(t *testing.T) {
	e := echo.New()

	t.Run("default params", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/test", nil)
		c := e.NewContext(req, httptest.NewRecorder())
		p, err := response.ParseOffsetParams(c)
		require.NoError(t, err)
		assert.Equal(t, 1, p.Page)
		assert.Equal(t, response.DefaultPageSize, p.Size)
		assert.Equal(t, 0, p.Offset)
	})

	t.Run("custom params", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/test?page=3&size=50", nil)
		c := e.NewContext(req, httptest.NewRecorder())
		p, err := response.ParseOffsetParams(c)
		require.NoError(t, err)
		assert.Equal(t, 3, p.Page)
		assert.Equal(t, 50, p.Size)
		assert.Equal(t, 100, p.Offset)
	})

	t.Run("offset too deep exceeds 10000", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/test?page=1001&size=20", nil)
		c := e.NewContext(req, httptest.NewRecorder())
		_, err := response.ParseOffsetParams(c)
		assert.ErrorIs(t, err, response.ErrOffsetTooDeep)
	})
}

func TestPagination_KeysetCursor(t *testing.T) {
	original := sampleCursor{ID: "job-123", Tier: 1}
	encoded, err := response.EncodeCursor(original)
	require.NoError(t, err)
	assert.NotEmpty(t, encoded)

	var decoded sampleCursor
	err = response.DecodeCursor(encoded, &decoded)
	require.NoError(t, err)
	assert.Equal(t, original, decoded)

	// Invalid cursor
	err = response.DecodeCursor("not-a-valid-cursor-string!!!", &decoded)
	assert.ErrorIs(t, err, response.ErrInvalidCursor)
}
