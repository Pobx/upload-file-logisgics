package customer_test

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"docsearch/api/internal/auth"
	"docsearch/api/internal/customer"
	"github.com/google/uuid"
	"github.com/labstack/echo/v4"
	"github.com/stretchr/testify/assert"
)

func TestCustomerHandler_ViewerRoleAccess(t *testing.T) {
	svc := customer.NewService(nil, nil)
	handler := customer.NewHandler(svc)

	validator := auth.NewTokenValidator(nil, []byte("dev-secret"), "iss", "aud")
	e := echo.New()
	handler.RegisterRoutes(e, validator)

	viewerToken, _ := auth.GenerateTestToken(uuid.New(), "viewer_user", []string{"viewer"}, "s1", "t1", 5*time.Minute)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/customers", nil)
	req.Header.Set("Authorization", "Bearer "+viewerToken)
	rec := httptest.NewRecorder()
	e.ServeHTTP(rec, req)

	// In TDD Step 1, this currently fails with 403 Forbidden because route only allows admin & staff
	assert.Equal(t, http.StatusOK, rec.Code)
}
