package middleware

import (
	"context"

	"docsearch/api/internal/platform/logger"
	"github.com/google/uuid"
	"github.com/labstack/echo/v4"
)

const HeaderXRequestID = "X-Request-ID"

// RequestID returns an Echo middleware that manages X-Request-ID
func RequestID() echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			req := c.Request()
			reqID := req.Header.Get(HeaderXRequestID)
			if reqID == "" {
				reqID = uuid.NewString()
			}

			c.Response().Header().Set(HeaderXRequestID, reqID)

			ctx := context.WithValue(req.Context(), logger.RequestIDKey, reqID)
			c.SetRequest(req.WithContext(ctx))

			return next(c)
		}
	}
}
