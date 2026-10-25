package customer

import (
	"context"
	"time"

	"github.com/google/uuid"
)

type Customer struct {
	ID             uuid.UUID `json:"id"`
	Name           string    `json:"name"`
	NameNormalized string    `json:"name_normalized"`
	CustomerCode   *string   `json:"customer_code"`
	TaxID          *string   `json:"tax_id"`
	ContactName    *string   `json:"contact_name"`
	ContactEmail   *string   `json:"contact_email"`
	ContactPhone   *string   `json:"contact_phone"`
	Note           *string   `json:"note"`
	IsActive       bool      `json:"is_active"`
	CreatedAt      time.Time `json:"created_at"`
}

type CreateCustomerRequest struct {
	Name         string  `json:"name"`
	CustomerCode *string `json:"customer_code"`
	TaxID        *string `json:"tax_id"`
	ContactName  *string `json:"contact_name"`
	ContactEmail *string `json:"contact_email"`
	ContactPhone *string `json:"contact_phone"`
	Note         *string `json:"note"`
}

type Repository interface {
	GetByID(ctx context.Context, id uuid.UUID) (*Customer, error)
	Create(ctx context.Context, c *Customer) error
}

type Service interface {
	GetCustomer(ctx context.Context, id uuid.UUID) (*Customer, error)
	CreateCustomer(ctx context.Context, req CreateCustomerRequest) (*Customer, error)
}
