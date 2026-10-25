package joborder

import (
	"context"
	"errors"
	"strings"
	"time"

	"docsearch/api/internal/audit"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

var (
	ErrJobOrderNotFound = errors.New("job order not found")
	ErrJobOrderConflict = errors.New("job order number already exists")
)

type ServiceImpl struct {
	pool  *pgxpool.Pool
	audit audit.Service
}

func NewService(pool *pgxpool.Pool, audit audit.Service) *ServiceImpl {
	return &ServiceImpl{
		pool:  pool,
		audit: audit,
	}
}

func (s *ServiceImpl) CreateJobOrder(ctx context.Context, req CreateJobOrderRequest) (*JobOrder, error) {
	jobNo := strings.TrimSpace(req.JobNo)
	if jobNo == "" {
		return nil, errors.New("job_no is required")
	}
	if req.CustomerID == uuid.Nil {
		return nil, errors.New("customer_id is required")
	}

	id := uuid.New()
	now := time.Now()

	jo := &JobOrder{
		ID:                 id,
		JobNo:              jobNo,
		BLNo:               req.BLNo,
		InvoiceNo:          req.InvoiceNo,
		CustomerID:         req.CustomerID,
		AssigneeID:         req.AssigneeID,
		DataSource:         "manual",
		VerificationStatus: "unverified",
		CreatedAt:          now,
		UpdatedAt:          now,
	}

	if s.pool != nil {
		_, err := s.pool.Exec(ctx, `
			INSERT INTO job_orders (id, job_no, bl_no, invoice_no, customer_id, assignee_id, data_source, verification_status, created_at, updated_at)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
		`, jo.ID, jo.JobNo, jo.BLNo, jo.InvoiceNo, jo.CustomerID, jo.AssigneeID, jo.DataSource, jo.VerificationStatus, jo.CreatedAt, jo.UpdatedAt)
		if err != nil {
			if strings.Contains(err.Error(), "duplicate key") || strings.Contains(err.Error(), "23505") {
				return nil, ErrJobOrderConflict
			}
			return nil, err
		}
	}

	return jo, nil
}

func (s *ServiceImpl) GetJobOrder(ctx context.Context, id uuid.UUID) (*JobOrder, error) {
	if s.pool == nil {
		return &JobOrder{ID: id, JobNo: "JO-MOCK-1"}, nil
	}

	var jo JobOrder
	err := s.pool.QueryRow(ctx, `
		SELECT id, job_no, bl_no, invoice_no, customer_id, import_batch_id, assignee_id,
		       data_source, verification_status, verified_at, verified_batch_id, created_at, updated_at
		FROM job_orders
		WHERE id = $1
	`, id).Scan(
		&jo.ID, &jo.JobNo, &jo.BLNo, &jo.InvoiceNo, &jo.CustomerID, &jo.ImportBatchID,
		&jo.AssigneeID, &jo.DataSource, &jo.VerificationStatus, &jo.VerifiedAt,
		&jo.VerifiedBatchID, &jo.CreatedAt, &jo.UpdatedAt,
	)
	if err != nil {
		return nil, ErrJobOrderNotFound
	}

	return &jo, nil
}

func (s *ServiceImpl) AssignGroup(ctx context.Context, jobOrderIDs []uuid.UUID, assigneeID *uuid.UUID, userID uuid.UUID) (int64, error) {
	if s.pool == nil || len(jobOrderIDs) == 0 {
		return 0, nil
	}

	cmdTag, err := s.pool.Exec(ctx, `
		UPDATE job_orders
		SET assignee_id = $1, updated_at = now()
		WHERE id = ANY($2)
	`, assigneeID, jobOrderIDs)
	if err != nil {
		return 0, err
	}

	count := cmdTag.RowsAffected()
	if s.audit != nil {
		_ = s.audit.Log(ctx, &userID, "ASSIGN", "job_orders", nil, map[string]interface{}{
			"count":       count,
			"assignee_id": assigneeID,
		})
	}

	return count, nil
}
