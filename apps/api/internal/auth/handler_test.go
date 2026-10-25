package auth_test

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"docsearch/api/internal/auth"
	"docsearch/api/internal/platform/response"
	"github.com/google/uuid"
	"github.com/labstack/echo/v4"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestAuthHandler_Me_And_Logout(t *testing.T) {
	denylist := auth.NewDenylist()
	validator := auth.NewTokenValidator(denylist, []byte("dev-secret"), "iss", "aud")
	handler := auth.NewHandler(denylist, nil)

	e := echo.New()
	handler.RegisterRoutes(e, validator)

	userID := uuid.New()
	token, err := auth.GenerateTestToken(userID, "admin_user", []string{"admin"}, "session-abc", "token-xyz", 5*time.Minute)
	require.NoError(t, err)

	// 1. Test /me
	req := httptest.NewRequest(http.MethodGet, "/api/v1/me", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	rec := httptest.NewRecorder()
	e.ServeHTTP(rec, req)

	assert.Equal(t, http.StatusOK, rec.Code)
	var env response.ResponseEnvelope
	err = json.Unmarshal(rec.Body.Bytes(), &env)
	require.NoError(t, err)
	assert.Equal(t, response.CodeSuccess, env.Code)

	// 2. Test /auth/logout
	reqLogout := httptest.NewRequest(http.MethodPost, "/api/v1/auth/logout", nil)
	reqLogout.Header.Set("Authorization", "Bearer "+token)
	recLogout := httptest.NewRecorder()
	e.ServeHTTP(recLogout, reqLogout)

	assert.Equal(t, http.StatusOK, recLogout.Code)

	// 3. Replay token -> Must return 401 code 4011 (TOKEN_REVOKED)
	reqReplay := httptest.NewRequest(http.MethodGet, "/api/v1/me", nil)
	reqReplay.Header.Set("Authorization", "Bearer "+token)
	recReplay := httptest.NewRecorder()
	e.ServeHTTP(recReplay, reqReplay)

	assert.Equal(t, http.StatusUnauthorized, recReplay.Code)
	var envReplay response.ResponseEnvelope
	_ = json.Unmarshal(recReplay.Body.Bytes(), &envReplay)
	assert.Equal(t, response.CodeTokenRevoked, envReplay.Code)
}
