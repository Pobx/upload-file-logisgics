package audit

import (
	"context"
	"time"

	"github.com/google/uuid"
)

type AuditLog struct {
	ID        int64       `json:"id"`
	UserID    *uuid.UUID  `json:"user_id"`
	Action    string      `json:"action"`
	Entity    string      `json:"entity"`
	EntityID  *string     `json:"entity_id"`
	Detail    interface{} `json:"detail"`
	CreatedAt time.Time   `json:"created_at"`
}

type Service interface {
	Log(ctx context.Context, userID *uuid.UUID, action, entity string, entityID *string, detail interface{}) error
}
