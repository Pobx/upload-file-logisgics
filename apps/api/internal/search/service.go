package search

import (
	"context"
	"errors"
	"strings"
	"time"

	"docsearch/api/internal/platform/response"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

type WorkQueueItem struct {
	JobOrderID         uuid.UUID `json:"job_order_id"`
	JobNo              string    `json:"job_no"`
	CustomerName       string    `json:"customer_name"`
	MissingBL          bool      `json:"missing_bl"`
	MissingInvoice     bool      `json:"missing_invoice"`
	AssigneeName       *string   `json:"assignee_name"`
	VerificationStatus string    `json:"verification_status"`
	CreatedAt          time.Time `json:"created_at"`
}

type RecentDocumentItem struct {
	ID             uuid.UUID `json:"id"`
	FileName       string    `json:"file_name"`
	JobNo          string    `json:"job_no"`
	DocumentType   string    `json:"document_type"`
	SizeBytes      int64     `json:"size_bytes"`
	ProvidedByName *string   `json:"provided_by_name"`
	UploadedBy     string    `json:"uploaded_by"`
	CreatedAt      time.Time `json:"created_at"`
}

type ServiceImpl struct {
	pool *pgxpool.Pool
}

func NewService(pool *pgxpool.Pool) *ServiceImpl {
	return &ServiceImpl{pool: pool}
}

func (s *ServiceImpl) Search(ctx context.Context, filter SearchFilter) ([]SearchResultItem, *string, bool, error) {
	if s.pool == nil {
		return []SearchResultItem{}, nil, false, nil
	}

	size := filter.Size
	if size <= 0 || size > response.MaxPageSize {
		size = response.DefaultPageSize
	}

	var cursor *KeysetCursor
	if filter.Cursor != "" {
		cursor = &KeysetCursor{}
		if err := response.DecodeCursor(filter.Cursor, cursor); err != nil {
			return nil, nil, false, response.ErrInvalidCursor
		}
	}

	startTier := 1
	if cursor != nil {
		startTier = cursor.Tier
	}

	var combinedResults []SearchResultItem
	targetCount := size + 1 // Fetch size + 1 to detect has_next

	for tier := startTier; tier <= 3; tier++ {
		needed := targetCount - len(combinedResults)
		if needed <= 0 {
			break
		}

		tierCursor := cursor
		if cursor != nil && cursor.Tier != tier {
			tierCursor = nil // only apply cursor in the starting tier
		}

		parts := BuildSearchTierQuery(filter.Query, filter.Field, tier, filter.CustomerID, filter.AssigneeID, tierCursor, needed)
		rows, err := s.pool.Query(ctx, parts.SQL, parts.Args...)
		if err != nil {
			return nil, nil, false, err
		}

		for rows.Next() {
			var item SearchResultItem
			err := rows.Scan(
				&item.ID, &item.JobNo, &item.BLNo, &item.InvoiceNo, &item.CustomerID,
				&item.CustomerName, &item.DocumentCount, &item.AssigneeName, &item.CreatedAt,
				&item.MatchTier,
			)
			if err != nil {
				rows.Close()
				return nil, nil, false, err
			}
			combinedResults = append(combinedResults, item)
		}
		rows.Close()
	}

	hasNext := len(combinedResults) > size
	var finalResults []SearchResultItem
	if hasNext {
		finalResults = combinedResults[:size]
	} else {
		finalResults = combinedResults
	}

	var nextCursorStr *string
	if hasNext && len(finalResults) > 0 {
		last := finalResults[len(finalResults)-1]
		nextC := KeysetCursor{
			Tier:      last.MatchTier,
			CreatedAt: last.CreatedAt,
			ID:        last.ID,
		}
		encoded, err := response.EncodeCursor(nextC)
		if err == nil {
			nextCursorStr = &encoded
		}
	}

	return finalResults, nextCursorStr, hasNext, nil
}

func (s *ServiceImpl) QuickLookup(ctx context.Context, query string) (*SearchResultItem, error) {
	if s.pool == nil {
		return nil, errors.New("not found")
	}

	norm := strings.ToUpper(strings.TrimSpace(query))
	if norm == "" {
		return nil, errors.New("query is required")
	}

	var item SearchResultItem
	err := s.pool.QueryRow(ctx, `
		SELECT j.id, j.job_no, j.bl_no, j.invoice_no, j.customer_id, c.name,
		       (SELECT count(*) FROM documents d WHERE d.job_order_id = j.id AND d.deleted_at IS NULL),
		       u.username, j.created_at, 1 AS match_tier
		FROM job_orders j
		JOIN customers c ON c.id = j.customer_id
		LEFT JOIN user_profiles u ON u.sub = j.assignee_id
		WHERE j.job_no_norm = $1 OR j.bl_no_norm = $1 OR j.invoice_no_norm = $1
		LIMIT 1
	`, norm).Scan(
		&item.ID, &item.JobNo, &item.BLNo, &item.InvoiceNo, &item.CustomerID,
		&item.CustomerName, &item.DocumentCount, &item.AssigneeName, &item.CreatedAt,
		&item.MatchTier,
	)
	if err != nil {
		return nil, err
	}

	return &item, nil
}

func (s *ServiceImpl) BulkSearch(ctx context.Context, numbers []string) ([]SearchResultItem, []string, error) {
	if s.pool == nil || len(numbers) == 0 {
		return []SearchResultItem{}, numbers, nil
	}

	var normNumbers []string
	inputMap := make(map[string]bool)
	for _, n := range numbers {
		norm := strings.ToUpper(strings.TrimSpace(n))
		if norm != "" {
			normNumbers = append(normNumbers, norm)
			inputMap[norm] = true
		}
	}

	rows, err := s.pool.Query(ctx, `
		SELECT j.id, j.job_no, j.bl_no, j.invoice_no, j.customer_id, c.name,
		       (SELECT count(*) FROM documents d WHERE d.job_order_id = j.id AND d.deleted_at IS NULL),
		       u.username, j.created_at, 1 AS match_tier
		FROM job_orders j
		JOIN customers c ON c.id = j.customer_id
		LEFT JOIN user_profiles u ON u.sub = j.assignee_id
		WHERE j.job_no_norm = ANY($1) OR j.bl_no_norm = ANY($1) OR j.invoice_no_norm = ANY($1)
	`, normNumbers)
	if err != nil {
		return nil, nil, err
	}
	defer rows.Close()

	var list []SearchResultItem
	foundMap := make(map[string]bool)
	for rows.Next() {
		var item SearchResultItem
		_ = rows.Scan(
			&item.ID, &item.JobNo, &item.BLNo, &item.InvoiceNo, &item.CustomerID,
			&item.CustomerName, &item.DocumentCount, &item.AssigneeName, &item.CreatedAt,
			&item.MatchTier,
		)
		list = append(list, item)
		foundMap[strings.ToUpper(item.JobNo)] = true
		if item.BLNo != nil {
			foundMap[strings.ToUpper(*item.BLNo)] = true
		}
		if item.InvoiceNo != nil {
			foundMap[strings.ToUpper(*item.InvoiceNo)] = true
		}
	}

	var notFound []string
	for n := range inputMap {
		if !foundMap[n] {
			notFound = append(notFound, n)
		}
	}

	return list, notFound, nil
}

func (s *ServiceImpl) GetRecentDocuments(ctx context.Context, limit int) ([]RecentDocumentItem, error) {
	if s.pool == nil {
		return []RecentDocumentItem{}, nil
	}

	rows, err := s.pool.Query(ctx, `
		SELECT d.id, d.file_name, j.job_no, dt.name, d.size_bytes, d.provided_by_name,
		       coalesce(u.username, 'System'), d.created_at
		FROM documents d
		JOIN job_orders j ON j.id = d.job_order_id
		JOIN document_types dt ON dt.id = d.document_type_id
		LEFT JOIN user_profiles u ON u.sub = d.uploaded_by
		WHERE d.deleted_at IS NULL
		ORDER BY d.created_at DESC
		LIMIT $1
	`, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var docs []RecentDocumentItem
	for rows.Next() {
		var doc RecentDocumentItem
		err := rows.Scan(
			&doc.ID, &doc.FileName, &doc.JobNo, &doc.DocumentType, &doc.SizeBytes,
			&doc.ProvidedByName, &doc.UploadedBy, &doc.CreatedAt,
		)
		if err != nil {
			return nil, err
		}
		docs = append(docs, doc)
	}

	return docs, nil
}

func (s *ServiceImpl) GetWorkQueue(ctx context.Context, filter string, page, size int, currentUserID *uuid.UUID) ([]WorkQueueItem, int, error) {
	if s.pool == nil {
		return []WorkQueueItem{}, 0, nil
	}

	offset := (page - 1) * size

	// Uses NOT EXISTS index on documents to detect missing B/L or Invoice as per SPEC 2.3
	baseQuery := `
		SELECT j.id, j.job_no, c.name,
		       NOT EXISTS (SELECT 1 FROM documents d WHERE d.job_order_id = j.id AND d.document_type_id = 1 AND d.deleted_at IS NULL) AS missing_bl,
		       NOT EXISTS (SELECT 1 FROM documents d WHERE d.job_order_id = j.id AND d.document_type_id = 2 AND d.deleted_at IS NULL) AS missing_inv,
		       u.username, j.verification_status, j.created_at
		FROM job_orders j
		JOIN customers c ON c.id = j.customer_id
		LEFT JOIN user_profiles u ON u.sub = j.assignee_id
		WHERE (
		    NOT EXISTS (SELECT 1 FROM documents d WHERE d.job_order_id = j.id AND d.document_type_id = 1 AND d.deleted_at IS NULL)
		    OR
		    NOT EXISTS (SELECT 1 FROM documents d WHERE d.job_order_id = j.id AND d.document_type_id = 2 AND d.deleted_at IS NULL)
		)
	`

	if filter == "mine" && currentUserID != nil {
		baseQuery += " AND j.assignee_id = '" + currentUserID.String() + "'"
	} else if filter == "unassigned" {
		baseQuery += " AND j.assignee_id IS NULL"
	} else if filter == "conflict" {
		baseQuery += " AND j.verification_status = 'conflict'"
	} else if filter == "unverified" {
		baseQuery += " AND j.verification_status = 'unverified'"
	}

	baseQuery += " ORDER BY j.created_at DESC LIMIT $1 OFFSET $2"

	rows, err := s.pool.Query(ctx, baseQuery, size, offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var items []WorkQueueItem
	for rows.Next() {
		var it WorkQueueItem
		err := rows.Scan(
			&it.JobOrderID, &it.JobNo, &it.CustomerName, &it.MissingBL,
			&it.MissingInvoice, &it.AssigneeName, &it.VerificationStatus, &it.CreatedAt,
		)
		if err != nil {
			return nil, 0, err
		}
		items = append(items, it)
	}

	var total int
	_ = s.pool.QueryRow(ctx, "SELECT count(*) FROM job_orders WHERE data_source = 'manual' OR verification_status = 'conflict'").Scan(&total)

	return items, total, nil
}
