package report

import (
	"context"
	"io"
	"time"

	"github.com/google/uuid"
)

type UserUploadStat struct {
	Department string `json:"department"`
	EmployeeID string `json:"employee_id"`
	FirstName  string `json:"first_name"`
	LastName   string `json:"last_name"`
	Position   string `json:"position"`
	Uploads    int64  `json:"uploads"`
}

type MissingDocumentItem struct {
	JobOrderID   uuid.UUID `json:"job_order_id"`
	JobNo        string    `json:"job_no"`
	CustomerName string    `json:"customer_name"`
	MissingBL    bool      `json:"missing_bl"`
	MissingInv   bool      `json:"missing_inv"`
}

type Service interface {
	GetUploadsByUser(ctx context.Context, from, to time.Time) ([]UserUploadStat, error)
	GetMissingDocuments(ctx context.Context, limit, offset int) ([]MissingDocumentItem, int, error)
	ExportReportCSV(ctx context.Context, reportType string, w io.Writer) error
}
