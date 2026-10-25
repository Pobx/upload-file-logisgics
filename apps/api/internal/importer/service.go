package importer

import (
	"bytes"
	"context"
	"errors"
	"io"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

var (
	ErrBatchNotFound = errors.New("import batch not found")
)

type DryRunSummary struct {
	BatchID     uuid.UUID `json:"batch_id"`
	FileName    string    `json:"file_name"`
	TotalRows   int       `json:"total_rows"`
	NewRows     int       `json:"new_rows"`
	MatchedRows int       `json:"matched_rows"`
	FillsBlank  int       `json:"fills_blank"`
	Conflicts   int       `json:"conflicts"`
	Errors      int       `json:"errors"`
	PreviewRows []CSVRow  `json:"preview_rows"`
}

type ServiceImpl struct {
	pool *pgxpool.Pool
}

func NewService(pool *pgxpool.Pool) *ServiceImpl {
	return &ServiceImpl{pool: pool}
}

func (s *ServiceImpl) UploadAndPreview(ctx context.Context, fileName string, r io.Reader, userID uuid.UUID) (*DryRunSummary, error) {
	// Read full file into memory/temp buffer
	data, err := io.ReadAll(r)
	if err != nil {
		return nil, err
	}

	parser, err := NewCSVParser(bytes.NewReader(data))
	if err != nil {
		return nil, err
	}

	batchID := uuid.New()
	summary := &DryRunSummary{
		BatchID:  batchID,
		FileName: fileName,
	}

	// Fetch existing job orders for matching (if DB connected)
	existingMap := make(map[string]*ExistingJobRecord)
	if s.pool != nil {
		rows, err := s.pool.Query(ctx, `
			SELECT j.job_no, c.name, coalesce(j.bl_no, ''), coalesce(j.invoice_no, '')
			FROM job_orders j
			JOIN customers c ON c.id = j.customer_id
		`)
		if err == nil {
			defer rows.Close()
			for rows.Next() {
				var rec ExistingJobRecord
				if err := rows.Scan(&rec.JobNo, &rec.CustomerName, &rec.BLNo, &rec.InvoiceNo); err == nil {
					existingMap[rec.JobNo] = &rec
				}
			}
		}
	}

	for {
		row, err := parser.Next()
		if err == io.EOF {
			break
		}
		if err != nil {
			summary.Errors++
			continue
		}

		summary.TotalRows++
		if len(summary.PreviewRows) < 100 {
			summary.PreviewRows = append(summary.PreviewRows, *row)
		}

		decision := ClassifyRow(row, existingMap[row.JobNo])
		switch decision.Result {
		case ReconcileNew:
			summary.NewRows++
		case ReconcileMatched:
			summary.MatchedRows++
		case ReconcileFillsBlank:
			summary.FillsBlank++
		case ReconcileConflict:
			summary.Conflicts++
		case ReconcileError:
			summary.Errors++
		}
	}

	// Create batch record in DB if connected
	if s.pool != nil {
		_, _ = s.pool.Exec(ctx, `
			INSERT INTO import_batches (id, file_name, status, total_rows, created_by, created_at)
			VALUES ($1, $2, 'ready', $3, $4, now())
		`, batchID, fileName, summary.TotalRows, userID)
	}

	return summary, nil
}

func (s *ServiceImpl) Commit(ctx context.Context, batchID uuid.UUID, policy ConflictPolicy) error {
	if s.pool == nil {
		return nil
	}

	_, err := s.pool.Exec(ctx, `
		UPDATE import_batches
		SET status = 'queued', started_at = now()
		WHERE id = $1
	`, batchID)
	return err
}

func (s *ServiceImpl) GetBatch(ctx context.Context, batchID uuid.UUID) (*ImportBatch, error) {
	if s.pool == nil {
		return &ImportBatch{ID: batchID, Status: "completed"}, nil
	}

	var b ImportBatch
	err := s.pool.QueryRow(ctx, `
		SELECT id, file_name, status, total_rows, success_rows, error_rows, created_by, started_at, finished_at, created_at
		FROM import_batches
		WHERE id = $1
	`, batchID).Scan(
		&b.ID, &b.FileName, &b.Status, &b.TotalRows, &b.SuccessRows, &b.ErrorRows,
		&b.CreatedBy, &b.StartedAt, &b.FinishedAt, &b.CreatedAt,
	)
	if err != nil {
		return nil, ErrBatchNotFound
	}

	return &b, nil
}
