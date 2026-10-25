package auth

import (
	"context"
	"errors"
	"net/http"
	"strings"

	"docsearch/api/internal/platform/logger"
	"docsearch/api/internal/platform/response"
	"github.com/google/uuid"
	"github.com/labstack/echo/v4"
)

const (
	ContextKeyClaims contextKey = "auth_claims"
)

type contextKey string

func RequireAuth(validator *TokenValidator) echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			authHeader := c.Request().Header.Get("Authorization")
			if authHeader == "" || !strings.HasPrefix(strings.ToLower(authHeader), "bearer ") {
				return response.Error(c, http.StatusUnauthorized, response.CodeUnauthorized, "Missing or invalid Authorization header", nil)
			}

			tokenStr := strings.TrimSpace(authHeader[7:])
			claims, err := validator.ValidateToken(tokenStr)
			if err != nil {
				if errors.Is(err, ErrTokenRevoked) {
					return response.Error(c, http.StatusUnauthorized, response.CodeTokenRevoked, "Token has been revoked", nil)
				}
				return response.Error(c, http.StatusUnauthorized, response.CodeUnauthorized, "Invalid token", nil)
			}

			// Attach to echo context and request context
			c.Set(string(ContextKeyClaims), claims)

			req := c.Request()
			ctx := context.WithValue(req.Context(), logger.UserIDKey, claims.Subject)
			c.SetRequest(req.WithContext(ctx))

			return next(c)
		}
	}
}

func RequireRole(roles ...string) echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			claims := GetClaims(c)
			if claims == nil {
				return response.Error(c, http.StatusUnauthorized, response.CodeUnauthorized, "Unauthorized", nil)
			}

			hasRole := false
			for _, r := range roles {
				for _, userRole := range claims.RealmAccess.Roles {
					if strings.EqualFold(r, userRole) {
						hasRole = true
						break
					}
				}
				if hasRole {
					break
				}
			}

			if !hasRole {
				return response.Error(c, http.StatusForbidden, response.CodeForbidden, "Forbidden: insufficient permissions", nil)
			}

			return next(c)
		}
	}
}

func GetClaims(c echo.Context) *UserClaims {
	if val := c.Get(string(ContextKeyClaims)); val != nil {
		if claims, ok := val.(*UserClaims); ok {
			return claims
		}
	}
	return nil
}

func GetUserID(c echo.Context) (uuid.UUID, error) {
	claims := GetClaims(c)
	if claims == nil {
		return uuid.Nil, errors.New("unauthenticated")
	}
	return uuid.Parse(claims.Subject)
}

func GetUsername(c echo.Context) string {
	claims := GetClaims(c)
	if claims == nil {
		return ""
	}
	return claims.PreferredUsername
}
