package importer

import (
	"context"
	"io"
	"time"

	"github.com/google/uuid"
)

type ReconcileResult string

const (
	ReconcileNew        ReconcileResult = "new"
	ReconcileMatched    ReconcileResult = "matched"
	ReconcileFillsBlank ReconcileResult = "fills_blank"
	ReconcileConflict   ReconcileResult = "conflict"
	ReconcileError      ReconcileResult = "error"
)

type ConflictPolicy string

const (
	ConflictPolicyKeepExisting ConflictPolicy = "keep_existing"
	ConflictPolicyUseCSV       ConflictPolicy = "use_csv"
)

type ImportBatch struct {
	ID          uuid.UUID  `json:"id"`
	FileName    string     `json:"file_name"`
	Status      string     `json:"status"`
	TotalRows   int        `json:"total_rows"`
	SuccessRows int        `json:"success_rows"`
	ErrorRows   int        `json:"error_rows"`
	CreatedBy   *uuid.UUID `json:"created_by"`
	StartedAt   *time.Time `json:"started_at"`
	FinishedAt  *time.Time `json:"finished_at"`
	CreatedAt   time.Time  `json:"created_at"`
}

type Service interface {
	UploadCSV(ctx context.Context, fileName string, reader io.Reader, userID uuid.UUID, idemKey string) (*ImportBatch, error)
	CommitBatch(ctx context.Context, batchID uuid.UUID, policy ConflictPolicy) error
	GetBatch(ctx context.Context, batchID uuid.UUID) (*ImportBatch, error)
}
