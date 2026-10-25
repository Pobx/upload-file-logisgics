package user

import (
	"context"
	"time"

	"github.com/google/uuid"
)

type UserProfile struct {
	Sub         uuid.UUID  `json:"sub"`
	Username    string     `json:"username"`
	FirstName   *string    `json:"first_name"`
	LastName    *string    `json:"last_name"`
	Position    *string    `json:"position"`
	Department  *string    `json:"department"`
	EmployeeID  *string    `json:"employee_id"`
	Email       *string    `json:"email"`
	Source      string     `json:"source"`
	IsActive    bool       `json:"is_active"`
	LastLoginAt *time.Time `json:"last_login_at"`
	SyncedAt    time.Time  `json:"synced_at"`
}

type CreateUserRequest struct {
	Username   string  `json:"username"`
	Password   string  `json:"password"`
	FirstName  string  `json:"first_name"`
	LastName   string  `json:"last_name"`
	Position   *string `json:"position"`
	Department *string `json:"department"`
	EmployeeID *string `json:"employee_id"`
	Email      *string `json:"email"`
	Roles      []string `json:"roles"`
}

// UserStore defines port to manage users in Keycloak Admin API
type UserStore interface {
	CreateUser(ctx context.Context, req CreateUserRequest) (uuid.UUID, error)
	UpdateUser(ctx context.Context, id uuid.UUID, req CreateUserRequest) error
	DisableUser(ctx context.Context, id uuid.UUID) error
	ResetPassword(ctx context.Context, id uuid.UUID, newPassword string) error
	AssignRoles(ctx context.Context, id uuid.UUID, roles []string) error
}

type Repository interface {
	GetProfile(ctx context.Context, sub uuid.UUID) (*UserProfile, error)
	UpsertProfile(ctx context.Context, profile *UserProfile) error
}
