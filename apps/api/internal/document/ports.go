package document

import (
	"context"
	"io"
	"time"

	"github.com/google/uuid"
)

type Document struct {
	ID              uuid.UUID  `json:"id"`
	JobOrderID      uuid.UUID  `json:"job_order_id"`
	DocumentTypeID  int        `json:"document_type_id"`
	FileName        string     `json:"file_name"`
	MimeType        string     `json:"mime_type"`
	SizeBytes       int64      `json:"size_bytes"`
	SHA256          string     `json:"sha256"`
	StorageProvider string     `json:"storage_provider"`
	StorageRef      string     `json:"storage_ref"`
	UploadedBy      uuid.UUID  `json:"uploaded_by"`
	ProvidedByName  *string    `json:"provided_by_name"`
	ProvidedByType  *string    `json:"provided_by_type"`
	DeletedAt       *time.Time `json:"deleted_at,omitempty"`
	CreatedAt       time.Time  `json:"created_at"`
}

type UploadDocumentRequest struct {
	JobOrderID     uuid.UUID
	DocumentTypeID int
	FileName       string
	MimeType       string
	SizeBytes      int64
	Reader         io.Reader
	UploadedBy     uuid.UUID
	ProvidedByName *string
	ProvidedByType *string
	IdempotencyKey string
}

type Repository interface {
	GetByID(ctx context.Context, id uuid.UUID) (*Document, error)
	GetExisting(ctx context.Context, jobOrderID uuid.UUID, sha256 string, docTypeID int) (*Document, error)
	Create(ctx context.Context, doc *Document) error
	SoftDelete(ctx context.Context, id uuid.UUID) error
}

type Service interface {
	UploadDocument(ctx context.Context, req UploadDocumentRequest) (*Document, bool, error)
	GetDownloadLink(ctx context.Context, id uuid.UUID, userID uuid.UUID) (string, error)
}
