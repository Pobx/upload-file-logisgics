package customer

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
	ErrCustomerNotFound = errors.New("customer not found")
	ErrCustomerConflict = errors.New("customer name already exists")
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

// NormalizeName normalizes customer name (trim, collapse internal whitespace, lowercase for match)
func NormalizeName(name string) string {
	fields := strings.Fields(strings.TrimSpace(name))
	normalized := strings.Join(fields, " ")
	return strings.ToLower(normalized)
}

func (s *ServiceImpl) CreateCustomer(ctx context.Context, req CreateCustomerRequest) (*Customer, error) {
	name := strings.TrimSpace(req.Name)
	if name == "" {
		return nil, errors.New("customer name is required")
	}

	normName := NormalizeName(name)
	id := uuid.New()
	now := time.Now()

	c := &Customer{
		ID:             id,
		Name:           name,
		NameNormalized: normName,
		CustomerCode:   req.CustomerCode,
		TaxID:          req.TaxID,
		ContactName:    req.ContactName,
		ContactEmail:   req.ContactEmail,
		ContactPhone:   req.ContactPhone,
		Note:           req.Note,
		IsActive:       true,
		CreatedAt:      now,
	}

	if s.pool != nil {
		_, err := s.pool.Exec(ctx, `
			INSERT INTO customers (id, name, name_normalized, customer_code, tax_id, contact_name, contact_email, contact_phone, note, is_active, created_at)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
		`, c.ID, c.Name, c.NameNormalized, c.CustomerCode, c.TaxID, c.ContactName, c.ContactEmail, c.ContactPhone, c.Note, c.IsActive, c.CreatedAt)
		if err != nil {
			if strings.Contains(err.Error(), "duplicate key") || strings.Contains(err.Error(), "23505") {
				return nil, ErrCustomerConflict
			}
			return nil, err
		}
	}

	return c, nil
}

func (s *ServiceImpl) GetCustomer(ctx context.Context, id uuid.UUID) (*Customer, error) {
	if s.pool == nil {
		return &Customer{ID: id, Name: "Mock Customer"}, nil
	}

	var c Customer
	err := s.pool.QueryRow(ctx, `
		SELECT id, name, name_normalized, customer_code, tax_id, contact_name, contact_email, contact_phone, note, is_active, created_at
		FROM customers
		WHERE id = $1
	`, id).Scan(
		&c.ID, &c.Name, &c.NameNormalized, &c.CustomerCode, &c.TaxID,
		&c.ContactName, &c.ContactEmail, &c.ContactPhone, &c.Note, &c.IsActive, &c.CreatedAt,
	)
	if err != nil {
		return nil, ErrCustomerNotFound
	}

	return &c, nil
}

func (s *ServiceImpl) ListCustomers(ctx context.Context, page, size int, query string) ([]Customer, int, error) {
	if s.pool == nil {
		return []Customer{}, 0, nil
	}

	offset := (page - 1) * size
	q := strings.TrimSpace(query)

	var rowsQuery string
	var countQuery string
	var args []interface{}

	if q != "" {
		norm := NormalizeName(q)
		rowsQuery = `
			SELECT id, name, name_normalized, customer_code, tax_id, contact_name, contact_email, contact_phone, note, is_active, created_at
			FROM customers
			WHERE name_normalized ILIKE '%' || $1 || '%' OR customer_code ILIKE '%' || $1 || '%'
			ORDER BY created_at DESC
			LIMIT $2 OFFSET $3
		`
		countQuery = `
			SELECT count(*) FROM customers
			WHERE name_normalized ILIKE '%' || $1 || '%' OR customer_code ILIKE '%' || $1 || '%'
		`
		args = []interface{}{norm, size, offset}
	} else {
		rowsQuery = `
			SELECT id, name, name_normalized, customer_code, tax_id, contact_name, contact_email, contact_phone, note, is_active, created_at
			FROM customers
			ORDER BY created_at DESC
			LIMIT $1 OFFSET $2
		`
		countQuery = `SELECT count(*) FROM customers`
		args = []interface{}{size, offset}
	}

	rows, err := s.pool.Query(ctx, rowsQuery, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var list []Customer
	for rows.Next() {
		var c Customer
		err := rows.Scan(
			&c.ID, &c.Name, &c.NameNormalized, &c.CustomerCode, &c.TaxID,
			&c.ContactName, &c.ContactEmail, &c.ContactPhone, &c.Note, &c.IsActive, &c.CreatedAt,
		)
		if err != nil {
			return nil, 0, err
		}
		list = append(list, c)
	}

	var total int
	if q != "" {
		_ = s.pool.QueryRow(ctx, countQuery, NormalizeName(q)).Scan(&total)
	} else {
		_ = s.pool.QueryRow(ctx, countQuery).Scan(&total)
	}

	return list, total, nil
}

// Merge merges source customer into target customer (moving all job orders)
func (s *ServiceImpl) Merge(ctx context.Context, targetID, sourceID uuid.UUID, userID uuid.UUID) error {
	if s.pool == nil {
		return nil
	}

	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	// Move job orders
	cmdTag, err := tx.Exec(ctx, `
		UPDATE job_orders SET customer_id = $1, updated_at = now()
		WHERE customer_id = $2
	`, targetID, sourceID)
	if err != nil {
		return err
	}

	// Deactivate source customer
	_, err = tx.Exec(ctx, `
		UPDATE customers SET is_active = false, note = coalesce(note, '') || ' [Merged into ' || $1 || ']'
		WHERE id = $2
	`, targetID.String(), sourceID)
	if err != nil {
		return err
	}

	// Audit log
	if s.audit != nil {
		movedCount := cmdTag.RowsAffected()
		_ = s.audit.Log(ctx, &userID, "MERGE", "customer", ptr(targetID.String()), map[string]interface{}{
			"source_customer_id": sourceID.String(),
			"job_orders_moved":   movedCount,
		})
	}

	return tx.Commit(ctx)
}

func ptr(s string) *string {
	return &s
}
