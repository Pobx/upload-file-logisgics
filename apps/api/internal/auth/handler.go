package auth

import (
	"context"
	"encoding/json"
	"net/http"
	"time"

	"docsearch/api/internal/platform/response"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/labstack/echo/v4"
)

type Handler struct {
	denylist *Denylist
	pool     *pgxpool.Pool
}

func NewHandler(denylist *Denylist, pool *pgxpool.Pool) *Handler {
	return &Handler{
		denylist: denylist,
		pool:     pool,
	}
}

// Me returns information about the currently authenticated user
func (h *Handler) Me(c echo.Context) error {
	claims := GetClaims(c)
	if claims == nil {
		return response.Error(c, http.StatusUnauthorized, response.CodeUnauthorized, "Unauthorized", nil)
	}

	return response.OK(c, map[string]interface{}{
		"sub":        claims.Subject,
		"username":   claims.PreferredUsername,
		"email":      claims.Email,
		"first_name": claims.GivenName,
		"last_name":  claims.FamilyName,
		"position":   claims.Position,
		"department": claims.Department,
		"roles":      claims.RealmAccess.Roles,
	})
}

// Logout revokes the current session and token, notifies nodes, and returns 200 with data: null
func (h *Handler) Logout(c echo.Context) error {
	claims := GetClaims(c)
	if claims == nil {
		return response.NoContentSuccess(c)
	}

	now := time.Now()
	expiresAt := now.Add(10 * time.Minute)
	if claims.ExpiresAt != nil {
		expiresAt = claims.ExpiresAt.Time
	}

	// Add to in-memory denylist
	if claims.SID != "" {
		h.denylist.AddRevoked(RevokeKindSID, claims.SID, expiresAt)
	}
	if claims.ID != "" {
		h.denylist.AddRevoked(RevokeKindJTI, claims.ID, expiresAt)
	}

	// Persist to Postgres and broadcast NOTIFY if DB pool is connected
	if h.pool != nil {
		ctx, cancel := context.WithTimeout(c.Request().Context(), 3*time.Second)
		defer cancel()

		if claims.SID != "" {
			_, _ = h.pool.Exec(ctx,
				"INSERT INTO revoked_tokens (kind, value, expires_at, reason) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING",
				"sid", claims.SID, expiresAt, "user logout",
			)
			payload, _ := json.Marshal(RevokeEvent{Kind: RevokeKindSID, Value: claims.SID, ExpiresAt: expiresAt})
			_, _ = h.pool.Exec(ctx, "SELECT pg_notify('token_revoked', $1)", string(payload))
		}
	}

	return response.NoContentSuccess(c)
}

// BackchannelLogout handles Keycloak backchannel logout requests
func (h *Handler) BackchannelLogout(c echo.Context) error {
	logoutToken := c.FormValue("logout_token")
	if logoutToken == "" {
		return c.String(http.StatusBadRequest, "missing logout_token")
	}

	// Keycloak spec: respond with 200 OK
	return c.NoContent(http.StatusOK)
}

func (h *Handler) RegisterRoutes(e *echo.Echo, validator *TokenValidator) {
	api := e.Group("/api/v1")
	api.GET("/me", h.Me, RequireAuth(validator))
	api.POST("/auth/logout", h.Logout, RequireAuth(validator))

	internal := e.Group("/internal")
	internal.POST("/auth/backchannel-logout", h.BackchannelLogout)
}
