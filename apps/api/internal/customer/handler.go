package customer

import (
	"errors"
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

func (h *Handler) List(c echo.Context) error {
	params, err := response.ParseOffsetParams(c)
	if err != nil {
		return response.Error(c, http.StatusBadRequest, response.CodeValidationFailed, err.Error(), nil)
	}

	q := c.QueryParam("q")
	list, total, err := h.service.ListCustomers(c.Request().Context(), params.Page, params.Size, q)
	if err != nil {
		return response.Error(c, http.StatusInternalServerError, response.CodeInternalError, "Failed to list customers", nil)
	}

	meta := response.PageMeta{
		Page:  params.Page,
		Size:  params.Size,
		Total: total,
	}

	return response.OK(c, list, meta)
}

func (h *Handler) Create(c echo.Context) error {
	var req CreateCustomerRequest
	if err := c.Bind(&req); err != nil {
		return response.Error(c, http.StatusBadRequest, response.CodeValidationFailed, "Invalid request body", nil)
	}

	if req.Name == "" {
		return response.ValidationError(c, []response.FieldError{
			{Field: "name", Message: "Customer name is required"},
		})
	}

	cust, err := h.service.CreateCustomer(c.Request().Context(), req)
	if err != nil {
		if errors.Is(err, ErrCustomerConflict) {
			return response.Error(c, http.StatusConflict, response.CodeConflict, "Customer name already exists", nil)
		}
		return response.Error(c, http.StatusInternalServerError, response.CodeInternalError, err.Error(), nil)
	}

	return response.Created(c, cust)
}

func (h *Handler) Get(c echo.Context) error {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		return response.NotFound(c, "Customer not found")
	}

	cust, err := h.service.GetCustomer(c.Request().Context(), id)
	if err != nil {
		return response.NotFound(c, "Customer not found")
	}

	return response.OK(c, cust)
}

func (h *Handler) Merge(c echo.Context) error {
	targetIDStr := c.Param("id")
	targetID, err := uuid.Parse(targetIDStr)
	if err != nil {
		return response.NotFound(c, "Target customer not found")
	}

	var body struct {
		SourceCustomerID string `json:"source_customer_id"`
	}
	if err := c.Bind(&body); err != nil || body.SourceCustomerID == "" {
		return response.ValidationError(c, []response.FieldError{
			{Field: "source_customer_id", Message: "source_customer_id is required"},
		})
	}

	sourceID, err := uuid.Parse(body.SourceCustomerID)
	if err != nil {
		return response.ValidationError(c, []response.FieldError{
			{Field: "source_customer_id", Message: "Invalid UUID format"},
		})
	}

	userID, _ := auth.GetUserID(c)
	err = h.service.Merge(c.Request().Context(), targetID, sourceID, userID)
	if err != nil {
		return response.Error(c, http.StatusInternalServerError, response.CodeInternalError, "Failed to merge customer", nil)
	}

	return response.NoContentSuccess(c)
}

func (h *Handler) RegisterRoutes(e *echo.Echo, validator *auth.TokenValidator) {
	readGroup := e.Group("/api/v1/customers", auth.RequireAuth(validator), auth.RequireRole("admin", "staff", "viewer"))
	readGroup.GET("", h.List)
	readGroup.GET("/:id", h.Get)

	writeGroup := e.Group("/api/v1/customers", auth.RequireAuth(validator), auth.RequireRole("admin", "staff"))
	writeGroup.POST("", h.Create)

	// Admin only
	adminGroup := e.Group("/api/v1/customers", auth.RequireAuth(validator), auth.RequireRole("admin"))
	adminGroup.POST("/:id/merge", h.Merge)
}
