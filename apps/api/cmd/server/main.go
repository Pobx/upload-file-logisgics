package main

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"docsearch/api/internal/auth"
	"docsearch/api/internal/customer"
	"docsearch/api/internal/importer"
	"docsearch/api/internal/joborder"
	"docsearch/api/internal/platform/config"
	"docsearch/api/internal/platform/database"
	"docsearch/api/internal/platform/health"
	"docsearch/api/internal/platform/logger"
	platmiddleware "docsearch/api/internal/platform/middleware"
	"docsearch/api/internal/platform/response"
	"docsearch/api/internal/user"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		slog.Error("failed to load configuration", "error", err)
		os.Exit(1)
	}

	appLogger := logger.Init(cfg.LogLevel)
	appLogger.Info("starting docsearch api server", "env", cfg.Env, "port", cfg.Port)

	// Attempt DB connection with retry
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	var db *database.DB
	db, err = database.ConnectWithRetry(ctx, cfg)
	if err != nil {
		appLogger.Error("could not establish database connection within retry period", "error", err)
		// We still start the server so /healthz can report process is up, while /readyz will report 503
	} else {
		defer db.Close()
	}

	e := echo.New()
	e.HideBanner = true
	e.HidePort = true

	// Standard middleware
	e.Use(platmiddleware.RequestID())
	e.Use(middleware.Recover())
	e.Use(middleware.CORSWithConfig(middleware.CORSConfig{
		AllowOrigins: []string{"*"},
		AllowHeaders: []string{echo.HeaderOrigin, echo.HeaderContentType, echo.HeaderAccept, echo.HeaderAuthorization, "X-Request-ID", "Idempotency-Key"},
		AllowMethods: []string{http.MethodGet, http.MethodPost, http.MethodPut, http.MethodDelete, http.MethodOptions},
	}))

	// Central HTTP Error Handler (maps errors to standard JSON envelope)
	e.HTTPErrorHandler = func(err error, c echo.Context) {
		if c.Response().Committed {
			return
		}

		var he *echo.HTTPError
		if errors.As(err, &he) {
			status := he.Code
			msg := http.StatusText(status)
			if m, ok := he.Message.(string); ok && m != "" {
				msg = m
			}
			code := response.CodeInternalError
			if status == http.StatusNotFound {
				code = response.CodeNotFound
			} else if status == http.StatusBadRequest {
				code = response.CodeValidationFailed
			} else if status == http.StatusUnauthorized {
				code = response.CodeUnauthorized
			} else if status == http.StatusForbidden {
				code = response.CodeForbidden
			}
			_ = response.Error(c, status, code, msg, nil)
			return
		}

		appLogger.Error("unhandled internal error", "error", err)
		_ = response.Error(c, http.StatusInternalServerError, response.CodeInternalError, "Internal Server Error", nil)
	}

	// Register Health endpoints
	healthHandler := health.NewHandler(db)
	healthHandler.RegisterRoutes(e)

	// Auth & Denylist
	denylist := auth.NewDenylist()
	if db != nil && db.Pool != nil {
		denylist.StartListener(ctx, cfg.DatabaseURL, db.Pool)
	}
	tokenValidator := auth.NewTokenValidator(denylist, []byte("dev-secret-key-12345678901234567890"), cfg.KeycloakURL, cfg.KeycloakClientID)

	authHandler := auth.NewHandler(denylist, nil)
	if db != nil {
		authHandler = auth.NewHandler(denylist, db.Pool)
	}
	authHandler.RegisterRoutes(e, tokenValidator)

	// User Management
	var dbPool *pgxpool.Pool
	if db != nil {
		dbPool = db.Pool
	}
	userService := user.NewService(dbPool, nil, denylist)
	userHandler := user.NewHandler(userService)
	userHandler.RegisterRoutes(e, tokenValidator)

	// Customer Management
	customerService := customer.NewService(dbPool, nil)
	customerHandler := customer.NewHandler(customerService)
	customerHandler.RegisterRoutes(e, tokenValidator)

	// Job Order Management
	jobOrderService := joborder.NewService(dbPool, nil)
	jobOrderHandler := joborder.NewHandler(jobOrderService)
	jobOrderHandler.RegisterRoutes(e, tokenValidator)

	// CSV Import & Reconcile
	importerService := importer.NewService(dbPool)
	importerHandler := importer.NewHandler(importerService)
	importerHandler.RegisterRoutes(e, tokenValidator)

	// Register API v1 placeholder group
	v1 := e.Group("/api/v1")
	v1.GET("/ping", func(c echo.Context) error {
		return response.OK(c, map[string]string{"message": "pong"})
	})

	// Start server in background
	go func() {
		addr := ":" + cfg.Port
		if err := e.Start(addr); err != nil && !errors.Is(err, http.ErrServerClosed) {
			appLogger.Error("shutting down server due to error", "error", err)
			os.Exit(1)
		}
	}()

	// Graceful shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, os.Interrupt, syscall.SIGTERM)
	<-quit
	appLogger.Info("received termination signal, initiating graceful shutdown (30s timeout)")

	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer shutdownCancel()

	if err := e.Shutdown(shutdownCtx); err != nil {
		appLogger.Error("graceful shutdown failed", "error", err)
	} else {
		appLogger.Info("server shutdown completed successfully")
	}
}
