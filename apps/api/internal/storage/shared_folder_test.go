package storage_test

import (
	"bytes"
	"context"
	"io"
	"os"
	"path/filepath"
	"testing"
	"time"

	"docsearch/api/internal/storage"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestSharedFolderStorage(t *testing.T) {
	tempDir, err := os.MkdirTemp("", "docstore_test")
	require.NoError(t, err)
	defer os.RemoveAll(tempDir)

	secretKey := []byte("download-secret-test-key-12345")
	store := storage.NewSharedFolderStorage(tempDir, secretKey)

	// 1. Put file
	ctx := context.Background()
	content := "Sample PDF content for document upload"
	key := filepath.Join("2026", "10", "doc-123.pdf")
	ref, err := store.Put(ctx, key, bytes.NewReader([]byte(content)), int64(len(content)))
	require.NoError(t, err)
	assert.Equal(t, key, ref)

	// 2. Open and read file
	reader, err := store.Open(ctx, ref)
	require.NoError(t, err)
	defer reader.Close()

	readBytes, err := io.ReadAll(reader)
	require.NoError(t, err)
	assert.Equal(t, content, string(readBytes))

	// 3. Stat file
	stat, err := store.Stat(ctx, ref)
	require.NoError(t, err)
	assert.Equal(t, int64(len(content)), stat.Size)

	// 4. Signed link test
	link, err := store.Link(ctx, ref, 60*time.Second)
	require.NoError(t, err)
	assert.Contains(t, link, "/api/v1/dl/")

	token := link[len("/api/v1/dl/"):]
	verifiedRef, err := storage.VerifyDownloadToken(token, secretKey)
	require.NoError(t, err)
	assert.Equal(t, ref, verifiedRef)

	// 5. Delete file
	err = store.Delete(ctx, ref)
	require.NoError(t, err)

	_, err = store.Open(ctx, ref)
	assert.Error(t, err)
}
