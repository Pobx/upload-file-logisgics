package joborder

import (
	"context"
	"time"

	"github.com/google/uuid"
)

type JobOrder struct {
	ID                 uuid.UUID  `json:"id"`
	JobNo              string     `json:"job_no"`
	BLNo               *string    `json:"bl_no"`
	InvoiceNo          *string    `json:"invoice_no"`
	CustomerID         uuid.UUID  `json:"customer_id"`
	ImportBatchID      *uuid.UUID `json:"import_batch_id"`
	AssigneeID         *uuid.UUID `json:"assignee_id"`
	DataSource         string     `json:"data_source"`
	VerificationStatus string     `json:"verification_status"`
	VerifiedAt         *time.Time `json:"verified_at"`
	VerifiedBatchID    *uuid.UUID `json:"verified_batch_id"`
	CreatedAt          time.Time  `json:"created_at"`
	UpdatedAt          time.Time  `json:"updated_at"`
}

type CreateJobOrderRequest struct {
	JobNo      string     `json:"job_no"`
	BLNo       *string    `json:"bl_no"`
	InvoiceNo  *string    `json:"invoice_no"`
	CustomerID uuid.UUID  `json:"customer_id"`
	AssigneeID *uuid.UUID `json:"assignee_id"`
}

type Repository interface {
	GetByID(ctx context.Context, id uuid.UUID) (*JobOrder, error)
	GetByJobNo(ctx context.Context, jobNo string) (*JobOrder, error)
	Create(ctx context.Context, jo *JobOrder) error
}

type Service interface {
	CreateJobOrder(ctx context.Context, req CreateJobOrderRequest) (*JobOrder, error)
	GetJobOrder(ctx context.Context, id uuid.UUID) (*JobOrder, error)
}
