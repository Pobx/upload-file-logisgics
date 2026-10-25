package search

import (
	"context"
	"time"

	"github.com/google/uuid"
)

type SearchResultItem struct {
	ID             uuid.UUID `json:"id"`
	JobNo          string    `json:"job_no"`
	BLNo           *string   `json:"bl_no"`
	InvoiceNo      *string   `json:"invoice_no"`
	CustomerID     uuid.UUID `json:"customer_id"`
	CustomerName   string    `json:"customer_name"`
	DocumentCount  int       `json:"document_count"`
	AssigneeName   *string   `json:"assignee_name"`
	CreatedAt      time.Time `json:"created_at"`
	MatchTier      int       `json:"match_tier"`
}

type SearchFilter struct {
	Query              string
	Field              string // all, job_no, bl_no, invoice_no
	CustomerID         *uuid.UUID
	DocumentTypeID     *int
	FromDate           *time.Time
	ToDate             *time.Time
	AssigneeID         *uuid.UUID
	VerificationStatus *string
	Cursor             string
	Size               int
}

type Service interface {
	Search(ctx context.Context, filter SearchFilter) ([]SearchResultItem, *string, bool, error)
	QuickLookup(ctx context.Context, query string) (*SearchResultItem, error)
	BulkSearch(ctx context.Context, numbers []string) ([]SearchResultItem, []string, error)
}
