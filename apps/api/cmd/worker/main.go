package main

import (
	"context"
	"log/slog"
	"os"
	"os/signal"
	"syscall"
	"time"

	"docsearch/api/internal/platform/config"
	"docsearch/api/internal/platform/database"
	"docsearch/api/internal/platform/logger"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		slog.Error("failed to load configuration", "error", err)
		os.Exit(1)
	}

	appLogger := logger.Init(cfg.LogLevel)
	appLogger.Info("starting docsearch background worker", "env", cfg.Env)

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	db, err := database.ConnectWithRetry(ctx, cfg)
	if err != nil {
		appLogger.Error("worker could not connect to database", "error", err)
		os.Exit(1)
	}
	defer db.Close()

	appLogger.Info("worker connected to database, ready to consume jobs")

	// Wait for termination signal
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, os.Interrupt, syscall.SIGTERM)
	<-quit

	appLogger.Info("worker received shutdown signal, draining jobs...")
	time.Sleep(1 * time.Second)
	appLogger.Info("worker shutdown complete")
}
