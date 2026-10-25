package response

import (
	"net/http"

	"github.com/labstack/echo/v4"
)

// ResponseEnvelope represents the standard API response structure
type ResponseEnvelope struct {
	Code    string      `json:"code"`
	Message string      `json:"message"`
	Data    interface{} `json:"data"`
	Meta    interface{} `json:"meta,omitempty"`
}

// PageMeta represents metadata for offset pagination
type PageMeta struct {
	Page  int `json:"page"`
	Size  int `json:"size"`
	Total int `json:"total"`
}

// CursorMeta represents metadata for keyset pagination
type CursorMeta struct {
	Size       int     `json:"size"`
	NextCursor *string `json:"next_cursor"`
	HasNext    bool    `json:"has_next"`
}

// FieldError represents validation error detail for a field
type FieldError struct {
	Field   string `json:"field"`
	Message string `json:"message"`
}

// Standard Code constants
const (
	CodeSuccess            = "2000" // 200
	CodeCreated            = "2010" // 201
	CodeAccepted           = "2020" // 202
	CodeValidationFailed   = "4000" // 400
	CodeMissingIdempotency = "4001" // 400
	CodeUnauthorized       = "4010" // 401
	CodeTokenRevoked       = "4011" // 401
	CodeForbidden          = "4030" // 403
	CodeNotFound           = "4040" // 404
	CodeConflict           = "4090" // 409
	CodeRequestInProgress  = "4091" // 409
	CodeIdempotencyReused  = "4220" // 422
	CodeRateLimited        = "4290" // 429
	CodeInternalError      = "5000" // 500
	CodeDBUnavailable      = "5030" // 503
	CodeStorageUnavailable = "5031" // 503
	CodeTimeout            = "5040" // 504
)

// JSON sends a standard success envelope
func JSON(c echo.Context, status int, code, message string, data interface{}, meta ...interface{}) error {
	env := ResponseEnvelope{
		Code:    code,
		Message: message,
		Data:    data,
	}
	if len(meta) > 0 && meta[0] != nil {
		env.Meta = meta[0]
	}
	return c.JSON(status, env)
}

// OK sends HTTP 200 with code 2000
func OK(c echo.Context, data interface{}, meta ...interface{}) error {
	return JSON(c, http.StatusOK, CodeSuccess, "Successfully", data, meta...)
}

// Created sends HTTP 201 with code 2010
func Created(c echo.Context, data interface{}) error {
	return JSON(c, http.StatusCreated, CodeCreated, "Created", data)
}

// Accepted sends HTTP 202 with code 2020
func Accepted(c echo.Context, data interface{}) error {
	return JSON(c, http.StatusAccepted, CodeAccepted, "Accepted", data)
}

// NoContentSuccess sends HTTP 200 with data: null (as 204 is forbidden in SPEC)
func NoContentSuccess(c echo.Context) error {
	return JSON(c, http.StatusOK, CodeSuccess, "Successfully", nil)
}

// Error sends a standard error envelope
func Error(c echo.Context, status int, code, message string, data interface{}) error {
	return c.JSON(status, ResponseEnvelope{
		Code:    code,
		Message: message,
		Data:    data,
	})
}

// NotFound sends HTTP 404 with code 4040
func NotFound(c echo.Context, message string) error {
	if message == "" {
		message = "Resource not found"
	}
	return Error(c, http.StatusNotFound, CodeNotFound, message, nil)
}

// ValidationError sends HTTP 400 with code 4000 and field errors
func ValidationError(c echo.Context, fieldErrors []FieldError) error {
	return Error(c, http.StatusBadRequest, CodeValidationFailed, "Validation failed", fieldErrors)
}

// DBUnavailable sends HTTP 503 with code 5030 and Retry-After header
func DBUnavailable(c echo.Context, retryAfterSec int) error {
	if retryAfterSec > 0 {
		c.Response().Header().Set("Retry-After", "5")
	}
	return Error(c, http.StatusServiceUnavailable, CodeDBUnavailable, "Database unavailable", nil)
}

// StorageUnavailable sends HTTP 503 with code 5031
func StorageUnavailable(c echo.Context, retryAfterSec int) error {
	if retryAfterSec > 0 {
		c.Response().Header().Set("Retry-After", "5")
	}
	return Error(c, http.StatusServiceUnavailable, CodeStorageUnavailable, "Storage unavailable", nil)
}
