package response

import (
	"encoding/base64"
	"encoding/json"
	"errors"
	"strconv"

	"github.com/labstack/echo/v4"
)

const (
	DefaultPageSize = 20
	MaxPageSize     = 100
	MaxOffsetDepth  = 10000
)

var (
	ErrOffsetTooDeep = errors.New("page out of range: offset exceeds limit 10000")
	ErrInvalidCursor = errors.New("invalid cursor format")
)

type OffsetParams struct {
	Page   int
	Size   int
	Offset int
}

func ParseOffsetParams(c echo.Context) (OffsetParams, error) {
	page := 1
	if pStr := c.QueryParam("page"); pStr != "" {
		if p, err := strconv.Atoi(pStr); err == nil && p > 0 {
			page = p
		}
	}

	size := DefaultPageSize
	if sStr := c.QueryParam("size"); sStr != "" {
		if s, err := strconv.Atoi(sStr); err == nil && s > 0 {
			if s > MaxPageSize {
				size = MaxPageSize
			} else {
				size = s
			}
		}
	}

	offset := (page - 1) * size
	if offset+size > MaxOffsetDepth {
		return OffsetParams{}, ErrOffsetTooDeep
	}

	return OffsetParams{
		Page:   page,
		Size:   size,
		Offset: offset,
	}, nil
}

type KeysetParams struct {
	Cursor string
	Size   int
}

func ParseKeysetParams(c echo.Context) KeysetParams {
	cursor := c.QueryParam("cursor")
	size := DefaultPageSize
	if sStr := c.QueryParam("size"); sStr != "" {
		if s, err := strconv.Atoi(sStr); err == nil && s > 0 {
			if s > MaxPageSize {
				size = MaxPageSize
			} else {
				size = s
			}
		}
	}
	return KeysetParams{
		Cursor: cursor,
		Size:   size,
	}
}

// EncodeCursor encodes any cursor struct to opaque Base64 string
func EncodeCursor(v interface{}) (string, error) {
	bytes, err := json.Marshal(v)
	if err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(bytes), nil
}

// DecodeCursor decodes opaque Base64 cursor string into target struct
func DecodeCursor(cursorStr string, target interface{}) error {
	bytes, err := base64.RawURLEncoding.DecodeString(cursorStr)
	if err != nil {
		return ErrInvalidCursor
	}
	if err := json.Unmarshal(bytes, target); err != nil {
		return ErrInvalidCursor
	}
	return nil
}
