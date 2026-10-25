package report

import (
	"context"
	"encoding/csv"
	"fmt"
	"io"
	"strconv"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

type ServiceImpl struct {
	pool *pgxpool.Pool
}

func NewService(pool *pgxpool.Pool) *ServiceImpl {
	return &ServiceImpl{pool: pool}
}

func (s *ServiceImpl) GetUploadsByUser(ctx context.Context, from, to time.Time) ([]UserUploadStat, error) {
	if s.pool == nil {
		return []UserUploadStat{}, nil
	}

	rows, err := s.pool.Query(ctx, `
		SELECT coalesce(u.department, '-'), coalesce(u.employee_id, '-'),
		       coalesce(u.first_name, ''), coalesce(u.last_name, ''),
		       coalesce(u.position, '-'), count(d.id) AS uploads
		FROM documents d
		JOIN user_profiles u ON u.sub = d.uploaded_by
		WHERE d.deleted_at IS NULL AND d.created_at >= $1 AND d.created_at <= $2
		GROUP BY u.department, u.employee_id, u.first_name, u.last_name, u.position
		ORDER BY uploads DESC
	`, from, to)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var stats []UserUploadStat
	for rows.Next() {
		var stat UserUploadStat
		err := rows.Scan(
			&stat.Department, &stat.EmployeeID, &stat.FirstName, &stat.LastName,
			&stat.Position, &stat.Uploads,
		)
		if err != nil {
			return nil, err
		}
		stats = append(stats, stat)
	}

	return stats, nil
}

func (s *ServiceImpl) GetMissingDocuments(ctx context.Context, limit, offset int) ([]MissingDocumentItem, int, error) {
	if s.pool == nil {
		return []MissingDocumentItem{}, 0, nil
	}

	rows, err := s.pool.Query(ctx, `
		SELECT j.id, j.job_no, c.name,
		       NOT EXISTS (SELECT 1 FROM documents d WHERE d.job_order_id = j.id AND d.document_type_id = 1 AND d.deleted_at IS NULL) AS missing_bl,
		       NOT EXISTS (SELECT 1 FROM documents d WHERE d.job_order_id = j.id AND d.document_type_id = 2 AND d.deleted_at IS NULL) AS missing_inv
		FROM job_orders j
		JOIN customers c ON c.id = j.customer_id
		WHERE (
		    NOT EXISTS (SELECT 1 FROM documents d WHERE d.job_order_id = j.id AND d.document_type_id = 1 AND d.deleted_at IS NULL)
		    OR
		    NOT EXISTS (SELECT 1 FROM documents d WHERE d.job_order_id = j.id AND d.document_type_id = 2 AND d.deleted_at IS NULL)
		)
		ORDER BY j.created_at DESC
		LIMIT $1 OFFSET $2
	`, limit, offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var items []MissingDocumentItem
	for rows.Next() {
		var it MissingDocumentItem
		err := rows.Scan(&it.JobOrderID, &it.JobNo, &it.CustomerName, &it.MissingBL, &it.MissingInv)
		if err != nil {
			return nil, 0, err
		}
		items = append(items, it)
	}

	var total int
	_ = s.pool.QueryRow(ctx, `
		SELECT count(*) FROM job_orders j
		WHERE (
		    NOT EXISTS (SELECT 1 FROM documents d WHERE d.job_order_id = j.id AND d.document_type_id = 1 AND d.deleted_at IS NULL)
		    OR
		    NOT EXISTS (SELECT 1 FROM documents d WHERE d.job_order_id = j.id AND d.document_type_id = 2 AND d.deleted_at IS NULL)
		)
	`).Scan(&total)

	return items, total, nil
}

func (s *ServiceImpl) ExportReportCSV(ctx context.Context, reportType string, w io.Writer) error {
	writer := csv.NewWriter(w)
	defer writer.Flush()

	if reportType == "uploads-by-user" {
		_ = writer.Write([]string{"Department", "Employee ID", "Name", "Position", "Uploads Count"})
		now := time.Now()
		stats, err := s.GetUploadsByUser(ctx, now.AddDate(0, -1, 0), now)
		if err == nil {
			for _, st := range stats {
				fullName := fmt.Sprintf("%s %s", st.FirstName, st.LastName)
				_ = writer.Write([]string{
					st.Department, st.EmployeeID, fullName, st.Position, strconv.FormatInt(st.Uploads, 10),
				})
			}
		}
	} else {
		// Missing documents export
		_ = writer.Write([]string{"Job Order", "Customer", "Missing B/L", "Missing Invoice"})
		items, _, err := s.GetMissingDocuments(ctx, 1000, 0)
		if err == nil {
			for _, it := range items {
				_ = writer.Write([]string{
					it.JobNo, it.CustomerName, strconv.FormatBool(it.MissingBL), strconv.FormatBool(it.MissingInv),
				})
			}
		}
	}

	return nil
}
