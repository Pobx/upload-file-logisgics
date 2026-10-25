package joborder

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

func (h *Handler) Create(c echo.Context) error {
	var req CreateJobOrderRequest
	if err := c.Bind(&req); err != nil {
		return response.Error(c, http.StatusBadRequest, response.CodeValidationFailed, "Invalid request body", nil)
	}

	var fieldErrors []response.FieldError
	if req.JobNo == "" {
		fieldErrors = append(fieldErrors, response.FieldError{Field: "job_no", Message: "Job order number is required"})
	}
	if req.CustomerID == uuid.Nil {
		fieldErrors = append(fieldErrors, response.FieldError{Field: "customer_id", Message: "Customer ID is required"})
	}
	if len(fieldErrors) > 0 {
		return response.ValidationError(c, fieldErrors)
	}

	jo, err := h.service.CreateJobOrder(c.Request().Context(), req)
	if err != nil {
		if errors.Is(err, ErrJobOrderConflict) {
			return response.Error(c, http.StatusConflict, response.CodeConflict, "Job order number already exists", nil)
		}
		return response.Error(c, http.StatusInternalServerError, response.CodeInternalError, err.Error(), nil)
	}

	return response.Created(c, jo)
}

func (h *Handler) Get(c echo.Context) error {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		return response.NotFound(c, "Job order not found")
	}

	jo, err := h.service.GetJobOrder(c.Request().Context(), id)
	if err != nil {
		return response.NotFound(c, "Job order not found")
	}

	return response.OK(c, jo)
}

func (h *Handler) Assign(c echo.Context) error {
	var body struct {
		JobOrderIDs []string `json:"job_order_ids"`
		AssigneeID  *string  `json:"assignee_id"`
	}
	if err := c.Bind(&body); err != nil || len(body.JobOrderIDs) == 0 {
		return response.ValidationError(c, []response.FieldError{
			{Field: "job_order_ids", Message: "job_order_ids array is required"},
		})
	}

	var ids []uuid.UUID
	for _, idStr := range body.JobOrderIDs {
		if u, err := uuid.Parse(idStr); err == nil {
			ids = append(ids, u)
		}
	}

	var assigneeUUID *uuid.UUID
	if body.AssigneeID != nil && *body.AssigneeID != "" {
		if u, err := uuid.Parse(*body.AssigneeID); err == nil {
			assigneeUUID = &u
		}
	}

	userID, _ := auth.GetUserID(c)
	count, err := h.service.AssignGroup(c.Request().Context(), ids, assigneeUUID, userID)
	if err != nil {
		return response.Error(c, http.StatusInternalServerError, response.CodeInternalError, "Failed to assign job orders", nil)
	}

	return response.OK(c, map[string]interface{}{
		"assigned_count": count,
	})
}

func (h *Handler) RegisterRoutes(e *echo.Echo, validator *auth.TokenValidator) {
	readGroup := e.Group("/api/v1/job-orders", auth.RequireAuth(validator), auth.RequireRole("admin", "staff", "viewer"))
	readGroup.GET("/:id", h.Get)

	writeGroup := e.Group("/api/v1/job-orders", auth.RequireAuth(validator), auth.RequireRole("admin", "staff"))
	writeGroup.POST("", h.Create)
	writeGroup.POST("/assign", h.Assign)
}
