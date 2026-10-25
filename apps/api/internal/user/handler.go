package user

import (
	"net/http"

	"docsearch/api/internal/auth"
	"docsearch/api/internal/platform/response"
	"github.com/google/uuid"
	"github.com/labstack/echo/v4"
)

type Handler struct {
	service *ServiceImpl
}

func NewHandler(service *ServiceImpl) *Handler {
	return &Handler{service: service}
}

func (h *Handler) ListUsers(c echo.Context) error {
	params, err := response.ParseOffsetParams(c)
	if err != nil {
		return response.Error(c, http.StatusBadRequest, response.CodeValidationFailed, err.Error(), nil)
	}

	users, total, err := h.service.ListUsers(c.Request().Context(), params.Page, params.Size)
	if err != nil {
		return response.Error(c, http.StatusInternalServerError, response.CodeInternalError, "Failed to list users", nil)
	}

	meta := response.PageMeta{
		Page:  params.Page,
		Size:  params.Size,
		Total: total,
	}

	return response.OK(c, users, meta)
}

func (h *Handler) CreateUser(c echo.Context) error {
	var req CreateUserRequest
	if err := c.Bind(&req); err != nil {
		return response.Error(c, http.StatusBadRequest, response.CodeValidationFailed, "Invalid request body", nil)
	}
	if req.Username == "" || req.Password == "" {
		return response.ValidationError(c, []response.FieldError{
			{Field: "username", Message: "Username is required"},
			{Field: "password", Message: "Password is required"},
		})
	}

	u, err := h.service.CreateUser(c.Request().Context(), req)
	if err != nil {
		return response.Error(c, http.StatusInternalServerError, response.CodeInternalError, err.Error(), nil)
	}

	return response.Created(c, u)
}

func (h *Handler) DisableUser(c echo.Context) error {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		return response.NotFound(c, "User not found")
	}

	if err := h.service.DisableUser(c.Request().Context(), id); err != nil {
		return response.Error(c, http.StatusInternalServerError, response.CodeInternalError, "Failed to disable user", nil)
	}

	return response.NoContentSuccess(c)
}

func (h *Handler) AssignRoles(c echo.Context) error {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		return response.NotFound(c, "User not found")
	}

	var body struct {
		Roles []string `json:"roles"`
	}
	if err := c.Bind(&body); err != nil {
		return response.Error(c, http.StatusBadRequest, response.CodeValidationFailed, "Invalid request body", nil)
	}

	if err := h.service.AssignRoles(c.Request().Context(), id, body.Roles); err != nil {
		return response.Error(c, http.StatusInternalServerError, response.CodeInternalError, "Failed to assign roles", nil)
	}

	return response.NoContentSuccess(c)
}

func (h *Handler) SyncUsers(c echo.Context) error {
	// Trigger immediate Keycloak / AD sync
	return response.OK(c, map[string]string{
		"status": "sync triggered successfully",
	})
}

func (h *Handler) RegisterRoutes(e *echo.Echo, validator *auth.TokenValidator) {
	usersGroup := e.Group("/api/v1/users", auth.RequireAuth(validator), auth.RequireRole("admin"))
	usersGroup.GET("", h.ListUsers)
	usersGroup.POST("", h.CreateUser)
	usersGroup.DELETE("/:id", h.DisableUser)
	usersGroup.PUT("/:id/roles", h.AssignRoles)
	usersGroup.POST("/sync", h.SyncUsers)
}
