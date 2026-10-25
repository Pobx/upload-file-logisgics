package storage

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"
)

var (
	ErrMountMissing = errors.New("storage mount missing marker: shared folder is unmounted")
)

type SharedFolderStorage struct {
	basePath  string
	secretKey []byte
}

func NewSharedFolderStorage(basePath string, secretKey []byte) *SharedFolderStorage {
	return &SharedFolderStorage{
		basePath:  basePath,
		secretKey: secretKey,
	}
}

func (s *SharedFolderStorage) checkMarker() error {
	// If basePath is in test or local dev without marker, allow directory check
	if strings.HasPrefix(s.basePath, "/mnt") {
		marker := filepath.Join(s.basePath, ".docsearch-mount")
		if _, err := os.Stat(marker); os.IsNotExist(err) {
			return ErrMountMissing
		}
	}
	return nil
}

func (s *SharedFolderStorage) Put(ctx context.Context, key string, r io.Reader, size int64) (string, error) {
	if err := s.checkMarker(); err != nil {
		return "", err
	}

	targetPath := filepath.Join(s.basePath, key)
	if err := os.MkdirAll(filepath.Dir(targetPath), 0755); err != nil {
		return "", err
	}

	partPath := targetPath + ".part"
	file, err := os.Create(partPath)
	if err != nil {
		return "", err
	}

	_, err = io.Copy(file, r)
	file.Close()
	if err != nil {
		_ = os.Remove(partPath)
		return "", err
	}

	// Atomic rename from .part to final target
	if err := os.Rename(partPath, targetPath); err != nil {
		_ = os.Remove(partPath)
		return "", err
	}

	return key, nil
}

func (s *SharedFolderStorage) Open(ctx context.Context, ref string) (io.ReadCloser, error) {
	if err := s.checkMarker(); err != nil {
		return nil, err
	}
	filePath := filepath.Join(s.basePath, ref)
	return os.Open(filePath)
}

func (s *SharedFolderStorage) Stat(ctx context.Context, ref string) (*FileInfo, error) {
	if err := s.checkMarker(); err != nil {
		return nil, err
	}
	filePath := filepath.Join(s.basePath, ref)
	info, err := os.Stat(filePath)
	if err != nil {
		return nil, err
	}
	return &FileInfo{
		Size:      info.Size(),
		UpdatedAt: info.ModTime(),
	}, nil
}

func (s *SharedFolderStorage) Delete(ctx context.Context, ref string) error {
	if err := s.checkMarker(); err != nil {
		return err
	}
	filePath := filepath.Join(s.basePath, ref)
	return os.Remove(filePath)
}

// Link generates an HMAC signed download token for /api/v1/dl/:token
func (s *SharedFolderStorage) Link(ctx context.Context, ref string, ttl time.Duration) (string, error) {
	exp := time.Now().Add(ttl).Unix()
	msg := fmt.Sprintf("%s:%d", ref, exp)

	h := hmac.New(sha256.New, s.secretKey)
	h.Write([]byte(msg))
	sig := hex.EncodeToString(h.Sum(nil))

	token := fmt.Sprintf("%s:%d:%s", ref, exp, sig)
	return "/api/v1/dl/" + token, nil
}

// VerifyDownloadToken checks if a signed download token is authentic and not expired
func VerifyDownloadToken(token string, secretKey []byte) (ref string, err error) {
	parts := strings.Split(token, ":")
	if len(parts) != 3 {
		return "", errors.New("invalid token format")
	}

	ref = parts[0]
	expStr := parts[1]
	sig := parts[2]

	exp, err := strconv.ParseInt(expStr, 10, 64)
	if err != nil {
		return "", errors.New("invalid expiration")
	}

	if time.Now().Unix() > exp {
		return "", errors.New("token expired")
	}

	msg := fmt.Sprintf("%s:%d", ref, exp)
	h := hmac.New(sha256.New, secretKey)
	h.Write([]byte(msg))
	expectedSig := hex.EncodeToString(h.Sum(nil))

	if !hmac.Equal([]byte(sig), []byte(expectedSig)) {
		return "", errors.New("signature mismatch")
	}

	return ref, nil
}
