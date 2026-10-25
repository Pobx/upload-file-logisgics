package storage

import (
	"context"
	"io"
	"time"
)

type FileInfo struct {
	Size      int64
	MimeType  string
	UpdatedAt time.Time
}

// FileStorage defines the external document storage abstraction (SFTP and Shared Folder NAS)
type FileStorage interface {
	Put(ctx context.Context, key string, r io.Reader, size int64) (ref string, err error)
	Open(ctx context.Context, ref string) (io.ReadCloser, error)
	Stat(ctx context.Context, ref string) (*FileInfo, error)
	Delete(ctx context.Context, ref string) error
	Link(ctx context.Context, ref string, ttl time.Duration) (string, error)
}
