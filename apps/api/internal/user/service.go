package user

import (
	"context"
	"time"

	"docsearch/api/internal/auth"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

type ServiceImpl struct {
	pool      *pgxpool.Pool
	userStore UserStore
	denylist  *auth.Denylist
}

func NewService(pool *pgxpool.Pool, userStore UserStore, denylist *auth.Denylist) *ServiceImpl {
	return &ServiceImpl{
		pool:      pool,
		userStore: userStore,
		denylist:  denylist,
	}
}

func (s *ServiceImpl) ListUsers(ctx context.Context, page, size int) ([]UserProfile, int, error) {
	if s.pool == nil {
		return []UserProfile{}, 0, nil
	}

	offset := (page - 1) * size
	rows, err := s.pool.Query(ctx, `
		SELECT sub, username, first_name, last_name, position, department, employee_id, email, source, is_active, last_login_at, synced_at
		FROM user_profiles
		ORDER BY created_at DESC, sub DESC
		LIMIT $1 OFFSET $2
	`, size, offset)
	if err != nil {
		// Fallback query without created_at if table uses synced_at
		rows, err = s.pool.Query(ctx, `
			SELECT sub, username, first_name, last_name, position, department, employee_id, email, source, is_active, last_login_at, synced_at
			FROM user_profiles
			ORDER BY synced_at DESC, sub DESC
			LIMIT $1 OFFSET $2
		`, size, offset)
		if err != nil {
			return nil, 0, err
		}
	}
	defer rows.Close()

	var list []UserProfile
	for rows.Next() {
		var u UserProfile
		err := rows.Scan(
			&u.Sub, &u.Username, &u.FirstName, &u.LastName, &u.Position, &u.Department,
			&u.EmployeeID, &u.Email, &u.Source, &u.IsActive, &u.LastLoginAt, &u.SyncedAt,
		)
		if err != nil {
			return nil, 0, err
		}
		list = append(list, u)
	}

	var total int
	_ = s.pool.QueryRow(ctx, "SELECT count(*) FROM user_profiles").Scan(&total)

	return list, total, nil
}

func (s *ServiceImpl) CreateUser(ctx context.Context, req CreateUserRequest) (*UserProfile, error) {
	var sub uuid.UUID
	var err error

	if s.userStore != nil {
		sub, err = s.userStore.CreateUser(ctx, req)
		if err != nil {
			return nil, err
		}
	} else {
		sub = uuid.New()
	}

	now := time.Now()
	profile := &UserProfile{
		Sub:        sub,
		Username:   req.Username,
		FirstName:  &req.FirstName,
		LastName:   &req.LastName,
		Position:   req.Position,
		Department: req.Department,
		EmployeeID: req.EmployeeID,
		Email:      req.Email,
		Source:     "local",
		IsActive:   true,
		SyncedAt:   now,
	}

	if s.pool != nil {
		_, err = s.pool.Exec(ctx, `
			INSERT INTO user_profiles (sub, username, first_name, last_name, position, department, employee_id, email, source, is_active, synced_at)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
			ON CONFLICT (sub) DO UPDATE SET
				username = EXCLUDED.username,
				first_name = EXCLUDED.first_name,
				last_name = EXCLUDED.last_name,
				position = EXCLUDED.position,
				department = EXCLUDED.department,
				employee_id = EXCLUDED.employee_id,
				email = EXCLUDED.email,
				is_active = EXCLUDED.is_active,
				synced_at = EXCLUDED.synced_at
		`, profile.Sub, profile.Username, profile.FirstName, profile.LastName, profile.Position, profile.Department, profile.EmployeeID, profile.Email, profile.Source, profile.IsActive, profile.SyncedAt)
		if err != nil {
			return nil, err
		}
	}

	return profile, nil
}

func (s *ServiceImpl) DisableUser(ctx context.Context, sub uuid.UUID) error {
	if s.userStore != nil {
		_ = s.userStore.DisableUser(ctx, sub)
	}

	if s.pool != nil {
		_, _ = s.pool.Exec(ctx, "UPDATE user_profiles SET is_active = false, synced_at = now() WHERE sub = $1", sub)
	}

	// Add sub cutoff to denylist so existing tokens become immediately invalid (ADR-005)
	if s.denylist != nil {
		s.denylist.AddRevoked(auth.RevokeKindSub, sub.String(), time.Now().Add(1*time.Hour), time.Now())
	}

	return nil
}

func (s *ServiceImpl) AssignRoles(ctx context.Context, sub uuid.UUID, roles []string) error {
	if s.userStore != nil {
		return s.userStore.AssignRoles(ctx, sub, roles)
	}
	return nil
}
