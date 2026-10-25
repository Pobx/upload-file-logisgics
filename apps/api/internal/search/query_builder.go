package search

import (
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
)

type KeysetCursor struct {
	Tier      int       `json:"t"`
	CreatedAt time.Time `json:"c"`
	ID        uuid.UUID `json:"id"`
}

type QueryParts struct {
	SQL  string
	Args []interface{}
}

// BuildSearchTierQuery builds parameterized SQL for each tier without `(col = $1 OR $1 IS NULL)`
func BuildSearchTierQuery(q string, field string, tier int, customerID *uuid.UUID, assigneeID *uuid.UUID, cursor *KeysetCursor, limit int) QueryParts {
	var sb strings.Builder
	var args []interface{}
	argIdx := 1

	sb.WriteString(`
		SELECT j.id, j.job_no, j.bl_no, j.invoice_no, j.customer_id, c.name,
		       (SELECT count(*) FROM documents d WHERE d.job_order_id = j.id AND d.deleted_at IS NULL),
		       u.username, j.created_at, ` + fmt.Sprintf("%d", tier) + ` AS match_tier
		FROM job_orders j
		JOIN customers c ON c.id = j.customer_id
		LEFT JOIN user_profiles u ON u.sub = j.assignee_id
		WHERE 1=1
	`)

	normQ := strings.ToUpper(strings.TrimSpace(q))

	if normQ != "" {
		switch tier {
		case 1: // Exact Match
			if field == "job_no" {
				sb.WriteString(fmt.Sprintf(" AND j.job_no_norm = $%d", argIdx))
				args = append(args, normQ)
				argIdx++
			} else if field == "bl_no" {
				sb.WriteString(fmt.Sprintf(" AND j.bl_no_norm = $%d", argIdx))
				args = append(args, normQ)
				argIdx++
			} else if field == "invoice_no" {
				sb.WriteString(fmt.Sprintf(" AND j.invoice_no_norm = $%d", argIdx))
				args = append(args, normQ)
				argIdx++
			} else {
				sb.WriteString(fmt.Sprintf(" AND (j.job_no_norm = $%d OR j.bl_no_norm = $%d OR j.invoice_no_norm = $%d)", argIdx, argIdx, argIdx))
				args = append(args, normQ)
				argIdx++
			}
		case 2: // Prefix Match (LIKE 'ABC%')
			prefix := normQ + "%"
			if field == "job_no" {
				sb.WriteString(fmt.Sprintf(" AND j.job_no_norm LIKE $%d AND j.job_no_norm <> $%d", argIdx, argIdx+1))
				args = append(args, prefix, normQ)
				argIdx += 2
			} else if field == "bl_no" {
				sb.WriteString(fmt.Sprintf(" AND j.bl_no_norm LIKE $%d AND j.bl_no_norm <> $%d", argIdx, argIdx+1))
				args = append(args, prefix, normQ)
				argIdx += 2
			} else if field == "invoice_no" {
				sb.WriteString(fmt.Sprintf(" AND j.invoice_no_norm LIKE $%d AND j.invoice_no_norm <> $%d", argIdx, argIdx+1))
				args = append(args, prefix, normQ)
				argIdx += 2
			} else {
				sb.WriteString(fmt.Sprintf(" AND ((j.job_no_norm LIKE $%d AND j.job_no_norm <> $%d) OR (j.bl_no_norm LIKE $%d AND j.bl_no_norm <> $%d) OR (j.invoice_no_norm LIKE $%d AND j.invoice_no_norm <> $%d))", argIdx, argIdx+1, argIdx, argIdx+1, argIdx, argIdx+1))
				args = append(args, prefix, normQ)
				argIdx += 2
			}
		case 3: // Contains Match (LIKE '%ABC%')
			contains := "%" + normQ + "%"
			prefix := normQ + "%"
			if field == "job_no" {
				sb.WriteString(fmt.Sprintf(" AND j.job_no_norm LIKE $%d AND j.job_no_norm NOT LIKE $%d", argIdx, argIdx+1))
				args = append(args, contains, prefix)
				argIdx += 2
			} else {
				sb.WriteString(fmt.Sprintf(" AND ((j.job_no_norm LIKE $%d AND j.job_no_norm NOT LIKE $%d) OR (j.bl_no_norm LIKE $%d AND j.bl_no_norm NOT LIKE $%d) OR (j.invoice_no_norm LIKE $%d AND j.invoice_no_norm NOT LIKE $%d) OR c.name_normalized ILIKE $%d)", argIdx, argIdx+1, argIdx, argIdx+1, argIdx, argIdx+1, argIdx))
				args = append(args, contains, prefix)
				argIdx += 2
			}
		}
	}

	if customerID != nil {
		sb.WriteString(fmt.Sprintf(" AND j.customer_id = $%d", argIdx))
		args = append(args, *customerID)
		argIdx++
	}

	if assigneeID != nil {
		sb.WriteString(fmt.Sprintf(" AND j.assignee_id = $%d", argIdx))
		args = append(args, *assigneeID)
		argIdx++
	}

	// Keyset pagination condition
	if cursor != nil && cursor.Tier == tier {
		sb.WriteString(fmt.Sprintf(" AND (j.created_at, j.id) < ($%d, $%d)", argIdx, argIdx+1))
		args = append(args, cursor.CreatedAt, cursor.ID)
		argIdx += 2
	}

	sb.WriteString(fmt.Sprintf(" ORDER BY j.created_at DESC, j.id DESC LIMIT $%d", argIdx))
	args = append(args, limit)

	return QueryParts{
		SQL:  sb.String(),
		Args: args,
	}
}
