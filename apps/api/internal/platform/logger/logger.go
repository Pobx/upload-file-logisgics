package logger

import (
	"context"
	"log/slog"
	"os"
	"strings"
)

type contextKey string

const (
	RequestIDKey contextKey = "request_id"
	TraceIDKey   contextKey = "trace_id"
	UserIDKey    contextKey = "user_id"
)

type ContextHandler struct {
	slog.Handler
}

func (h *ContextHandler) Handle(ctx context.Context, r slog.Record) error {
	if reqID, ok := ctx.Value(RequestIDKey).(string); ok && reqID != "" {
		r.AddAttrs(slog.String("request_id", reqID))
	}
	if traceID, ok := ctx.Value(TraceIDKey).(string); ok && traceID != "" {
		r.AddAttrs(slog.String("trace_id", traceID))
	}
	if userID, ok := ctx.Value(UserIDKey).(string); ok && userID != "" {
		r.AddAttrs(slog.String("user_id", userID))
	}
	return h.Handler.Handle(ctx, r)
}

func Init(level string) *slog.Logger {
	var logLevel slog.Level
	switch strings.ToLower(level) {
	case "debug":
		logLevel = slog.LevelDebug
	case "warn":
		logLevel = slog.LevelWarn
	case "error":
		logLevel = slog.LevelError
	default:
		logLevel = slog.LevelInfo
	}

	opts := &slog.HandlerOptions{
		Level: logLevel,
	}
	baseHandler := slog.NewJSONHandler(os.Stdout, opts)
	handler := &ContextHandler{Handler: baseHandler}
	logger := slog.New(handler)
	slog.SetDefault(logger)
	return logger
}
