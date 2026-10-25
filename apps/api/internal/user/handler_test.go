package user_test

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"docsearch/api/internal/auth"
	"docsearch/api/internal/platform/response"
	"docsearch/api/internal/user"
	"github.com/google/uuid"
	"github.com/labstack/echo/v4"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestUserHandler_CRUD(t *testing.T) {
	denylist := auth.NewDenylist()
	validator := auth.NewTokenValidator(denylist, []byte("dev-secret"), "iss", "aud")
	svc := user.NewService(nil, nil, denylist)
	handler := user.NewHandler(svc)

	e := echo.New()
	handler.RegisterRoutes(e, validator)

	adminID := uuid.New()
	adminToken, err := auth.GenerateTestToken(adminID, "admin", []string{"admin"}, "s1", "t1", 5*time.Minute)
	require.NoError(t, err)

	staffID := uuid.New()
	staffToken, err := auth.GenerateTestToken(staffID, "staff", []string{"staff"}, "s2", "t2", 5*time.Minute)
	require.NoError(t, err)

	// 1. Staff cannot access /api/v1/users (Must return 403 Forbidden)
	reqStaff := httptest.NewRequest(http.MethodGet, "/api/v1/users", nil)
	reqStaff.Header.Set("Authorization", "Bearer "+staffToken)
	recStaff := httptest.NewRecorder()
	e.ServeHTTP(recStaff, reqStaff)
	assert.Equal(t, http.StatusForbidden, recStaff.Code)

	// 2. Admin can access /api/v1/users
	reqAdmin := httptest.NewRequest(http.MethodGet, "/api/v1/users", nil)
	reqAdmin.Header.Set("Authorization", "Bearer "+adminToken)
	recAdmin := httptest.NewRecorder()
	e.ServeHTTP(recAdmin, reqAdmin)
	assert.Equal(t, http.StatusOK, recAdmin.Code)

	// 3. Admin creates user
	reqCreateBody, _ := json.Marshal(user.CreateUserRequest{
		Username:   "new_staff",
		Password:   "TempPassword123!",
		FirstName:  "Somchai",
		LastName:   "Jaidee",
		Roles:      []string{"staff"},
	})
	reqCreate := httptest.NewRequest(http.MethodPost, "/api/v1/users", bytes.NewReader(reqCreateBody))
	reqCreate.Header.Set("Content-Type", "application/json")
	reqCreate.Header.Set("Authorization", "Bearer "+adminToken)
	recCreate := httptest.NewRecorder()
	e.ServeHTTP(recCreate, reqCreate)
	assert.Equal(t, http.StatusCreated, recCreate.Code)

	var envCreate response.ResponseEnvelope
	err = json.Unmarshal(recCreate.Body.Bytes(), &envCreate)
	require.NoError(t, err)
	assert.Equal(t, response.CodeCreated, envCreate.Code)
}
