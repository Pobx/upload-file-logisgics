package document

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"io"
	"path/filepath"
	"time"

	"docsearch/api/internal/audit"
	"docsearch/api/internal/storage"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

var (
	ErrDocumentNotFound = errors.New("document not found")
)

type ServiceImpl struct {
	pool         *pgxpool.Pool
	storage      storage.FileStorage
	audit        audit.Service
	inMemoryDocs map[uuid.UUID]string
}

func NewService(pool *pgxpool.Pool, storage storage.FileStorage, audit audit.Service) *ServiceImpl {
	return &ServiceImpl{
		pool:         pool,
		storage:      storage,
		audit:        audit,
		inMemoryDocs: make(map[uuid.UUID]string),
	}
}

func (s *ServiceImpl) UploadDocument(ctx context.Context, req UploadDocumentRequest) (*Document, bool, error) {
	// 1. Calculate SHA256 while streaming to storage .part
	hasher := sha256.New()
	teeReader := io.TeeReader(req.Reader, hasher)

	now := time.Now()
	docID := uuid.New()
	cleanFileName := filepath.Base(req.FileName)
	storageKey := fmt.Sprintf("%04d/%02d/%s/%s-%s", now.Year(), int(now.Month()), req.JobOrderID, docID, cleanFileName)

	ref, err := s.storage.Put(ctx, storageKey, teeReader, req.SizeBytes)
	if err != nil {
		return nil, false, err
	}

	hashStr := hex.EncodeToString(hasher.Sum(nil))

	// 2. Check Deduplication: (job_order_id, sha256, document_type_id)
	s.inMemoryDocs[docID] = ref

	if s.pool != nil {
		var existing Document
		err := s.pool.QueryRow(ctx, `
			SELECT id, job_order_id, document_type_id, file_name, mime_type, size_bytes, sha256,
			       storage_provider, storage_ref, uploaded_by, provided_by_name, provided_by_type, created_at
			FROM documents
			WHERE job_order_id = $1 AND sha256 = $2 AND document_type_id = $3 AND deleted_at IS NULL
		`, req.JobOrderID, hashStr, req.DocumentTypeID).Scan(
			&existing.ID, &existing.JobOrderID, &existing.DocumentTypeID, &existing.FileName,
			&existing.MimeType, &existing.SizeBytes, &existing.SHA256, &existing.StorageProvider,
			&existing.StorageRef, &existing.UploadedBy, &existing.ProvidedByName, &existing.ProvidedByType,
			&existing.CreatedAt,
		)
		if err == nil {
			// Found duplicate! Delete newly written file and return existing document with duplicate=true
			_ = s.storage.Delete(ctx, ref)
			return &existing, true, nil
		}
	}

	// 3. Insert metadata to PostgreSQL
	doc := &Document{
		ID:              docID,
		JobOrderID:      req.JobOrderID,
		DocumentTypeID:  req.DocumentTypeID,
		FileName:        cleanFileName,
		MimeType:        req.MimeType,
		SizeBytes:       req.SizeBytes,
		SHA256:          hashStr,
		StorageProvider: "shared_folder",
		StorageRef:      ref,
		UploadedBy:      req.UploadedBy,
		ProvidedByName:  req.ProvidedByName,
		ProvidedByType:  req.ProvidedByType,
		CreatedAt:       now,
	}

	s.inMemoryDocs[docID] = ref

	if s.pool != nil {
		_, err := s.pool.Exec(ctx, `
			INSERT INTO documents (id, job_order_id, document_type_id, file_name, mime_type, size_bytes, sha256,
			                       storage_provider, storage_ref, uploaded_by, provided_by_name, provided_by_type, created_at)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
		`, doc.ID, doc.JobOrderID, doc.DocumentTypeID, doc.FileName, doc.MimeType, doc.SizeBytes,
			doc.SHA256, doc.StorageProvider, doc.StorageRef, doc.UploadedBy, doc.ProvidedByName,
			doc.ProvidedByType, doc.CreatedAt)
		if err != nil {
			_ = s.storage.Delete(ctx, ref)
			return nil, false, err
		}

		if s.audit != nil {
			_ = s.audit.Log(ctx, &req.UploadedBy, "UPLOAD", "documents", ptr(doc.ID.String()), map[string]interface{}{
				"job_order_id": doc.JobOrderID,
				"file_name":    doc.FileName,
				"sha256":       doc.SHA256,
			})
		}
	}

	return doc, false, nil
}

func (s *ServiceImpl) GetDownloadLink(ctx context.Context, id uuid.UUID, userID uuid.UUID) (string, error) {
	var ref string
	if s.pool == nil {
		var exists bool
		ref, exists = s.inMemoryDocs[id]
		if !exists {
			ref = id.String()
		}
	} else {
		err := s.pool.QueryRow(ctx, "SELECT storage_ref FROM documents WHERE id = $1 AND deleted_at IS NULL", id).Scan(&ref)
		if err != nil {
			return "", ErrDocumentNotFound
		}
	}

	link, err := s.storage.Link(ctx, ref, 60*time.Second)
	if err != nil {
		return "", err
	}

	if s.audit != nil {
		_ = s.audit.Log(ctx, &userID, "DOWNLOAD_LINK", "documents", ptr(id.String()), nil)
	}

	return link, nil
}

func (s *ServiceImpl) OpenFile(ctx context.Context, ref string) (io.ReadCloser, *storage.FileInfo, error) {
	stat, err := s.storage.Stat(ctx, ref)
	if err != nil {
		return nil, nil, err
	}

	r, err := s.storage.Open(ctx, ref)
	if err != nil {
		return nil, nil, err
	}

	return r, stat, nil
}

func (s *ServiceImpl) SoftDelete(ctx context.Context, id uuid.UUID, userID uuid.UUID) error {
	if s.pool == nil {
		return nil
	}

	_, err := s.pool.Exec(ctx, "UPDATE documents SET deleted_at = now() WHERE id = $1", id)
	if err != nil {
		return err
	}

	if s.audit != nil {
		_ = s.audit.Log(ctx, &userID, "DELETE", "documents", ptr(id.String()), nil)
	}

	return nil
}

func (s *ServiceImpl) ListByJobOrderID(ctx context.Context, jobOrderID uuid.UUID) ([]Document, error) {
	if s.pool == nil {
		return []Document{}, nil
	}

	rows, err := s.pool.Query(ctx, `
		SELECT id, job_order_id, document_type_id, file_name, mime_type, size_bytes, sha256,
		       storage_provider, storage_ref, uploaded_by, provided_by_name, provided_by_type, created_at
		FROM documents
		WHERE job_order_id = $1 AND deleted_at IS NULL
		ORDER BY created_at ASC
	`, jobOrderID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []Document
	for rows.Next() {
		var doc Document
		err := rows.Scan(
			&doc.ID, &doc.JobOrderID, &doc.DocumentTypeID, &doc.FileName,
			&doc.MimeType, &doc.SizeBytes, &doc.SHA256, &doc.StorageProvider,
			&doc.StorageRef, &doc.UploadedBy, &doc.ProvidedByName, &doc.ProvidedByType,
			&doc.CreatedAt,
		)
		if err != nil {
			return nil, err
		}
		list = append(list, doc)
	}
	return list, nil
}

func ptr(s string) *string {
	return &s
}
