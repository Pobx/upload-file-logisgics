package database

import (
	"context"
	"errors"
	"log/slog"
	"math/rand"
	"time"

	"docsearch/api/internal/platform/config"
	"github.com/jackc/pgx/v5/pgxpool"
)

var (
	ErrCircuitOpen = errors.New("circuit breaker open: database unavailable")
)

type DB struct {
	Pool           *pgxpool.Pool
	CircuitBreaker *CircuitBreaker
	QueryTimeout   time.Duration
}

// ConnectWithRetry connects to PostgreSQL with exponential backoff and jitter
func ConnectWithRetry(ctx context.Context, cfg *config.Config) (*DB, error) {
	cb := NewCircuitBreaker(5, 10*time.Second, 10*time.Second)

	poolConfig, err := pgxpool.ParseConfig(cfg.DatabaseURL)
	if err != nil {
		return nil, err
	}

	poolConfig.MaxConns = cfg.DBMaxConns
	poolConfig.MinConns = cfg.DBMinConns
	poolConfig.MaxConnLifetime = 1 * time.Hour
	poolConfig.MaxConnIdleTime = 30 * time.Minute
	poolConfig.HealthCheckPeriod = 30 * time.Second

	var pool *pgxpool.Pool
	deadline := time.Now().Add(cfg.DBConnectRetry)
	backoff := 1 * time.Second

	for {
		slog.Info("attempting to connect to database", "url", poolConfig.ConnString())
		connectCtx, cancel := context.WithTimeout(ctx, cfg.ConnectTimeout)
		pool, err = pgxpool.NewWithConfig(connectCtx, poolConfig)
		if err == nil {
			err = pool.Ping(connectCtx)
		}
		cancel()

		if err == nil {
			slog.Info("connected to database successfully")
			break
		}

		slog.Warn("database connection failed, retrying...", "error", err, "backoff", backoff)
		if time.Now().Add(backoff).After(deadline) {
			return nil, errors.New("exceeded maximum retry time connecting to database")
		}

		// Jitter
		jitter := time.Duration(rand.Int63n(int64(backoff / 2)))
		time.Sleep(backoff + jitter)

		backoff *= 2
		if backoff > 30*time.Second {
			backoff = 30 * time.Second
		}
	}

	return &DB{
		Pool:           pool,
		CircuitBreaker: cb,
		QueryTimeout:   cfg.QueryTimeout,
	}, nil
}

// Ping checks if DB connection is active and healthy
func (db *DB) Ping(ctx context.Context) error {
	if db == nil || db.Pool == nil {
		return errors.New("database pool is not initialized")
	}
	if !db.CircuitBreaker.Allow() {
		return ErrCircuitOpen
	}

	pingCtx, cancel := context.WithTimeout(ctx, 2*time.Second)
	defer cancel()

	err := db.Pool.Ping(pingCtx)
	if err != nil {
		db.CircuitBreaker.RecordFailure()
		return err
	}

	db.CircuitBreaker.RecordSuccess()
	return nil
}

// Close gracefully closes the database pool
func (db *DB) Close() {
	if db != nil && db.Pool != nil {
		db.Pool.Close()
	}
}
