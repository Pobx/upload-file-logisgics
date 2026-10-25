package auth

import (
	"context"
	"encoding/json"
	"errors"
	"log/slog"
	"sync"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type RevokeKind string

const (
	RevokeKindSID RevokeKind = "sid"
	RevokeKindJTI RevokeKind = "jti"
	RevokeKindSub RevokeKind = "sub"
)

type RevokeEvent struct {
	Kind      RevokeKind `json:"kind"`
	Value     string     `json:"value"`
	ExpiresAt time.Time  `json:"expires_at"`
	Cutoff    time.Time  `json:"cutoff,omitempty"`
}

type Denylist struct {
	mu      sync.RWMutex
	sids    map[string]time.Time
	jtis    map[string]time.Time
	subCuts map[string]time.Time // sub -> cutoff time
}

func NewDenylist() *Denylist {
	return &Denylist{
		sids:    make(map[string]time.Time),
		jtis:    make(map[string]time.Time),
		subCuts: make(map[string]time.Time),
	}
}

// IsRevoked checks if a token has been revoked
func (d *Denylist) IsRevoked(sid, jti, sub string, issuedAt time.Time) bool {
	d.mu.RLock()
	defer d.mu.RUnlock()

	now := time.Now()

	if sid != "" {
		if exp, exists := d.sids[sid]; exists && exp.After(now) {
			return true
		}
	}

	if jti != "" {
		if exp, exists := d.jtis[jti]; exists && exp.After(now) {
			return true
		}
	}

	if sub != "" {
		if cutoff, exists := d.subCuts[sub]; exists && issuedAt.Before(cutoff) {
			return true
		}
	}

	return false
}

// AddRevoked registers a revoked token or session in memory
func (d *Denylist) AddRevoked(kind RevokeKind, value string, expiresAt time.Time, cutoff ...time.Time) {
	d.mu.Lock()
	defer d.mu.Unlock()

	switch kind {
	case RevokeKindSID:
		d.sids[value] = expiresAt
	case RevokeKindJTI:
		d.jtis[value] = expiresAt
	case RevokeKindSub:
		cut := time.Now()
		if len(cutoff) > 0 && !cutoff[0].IsZero() {
			cut = cutoff[0]
		}
		d.subCuts[value] = cut
	}
}

// Cleanup removes expired tokens from the in-memory sets
func (d *Denylist) Cleanup() {
	d.mu.Lock()
	defer d.mu.Unlock()

	now := time.Now()
	for k, exp := range d.sids {
		if exp.Before(now) {
			delete(d.sids, k)
		}
	}
	for k, exp := range d.jtis {
		if exp.Before(now) {
			delete(d.jtis, k)
		}
	}
}

// StartListener starts listening for Postgres NOTIFY on channel 'token_revoked'
func (d *Denylist) StartListener(ctx context.Context, dbURL string, pool *pgxpool.Pool) {
	go func() {
		for {
			select {
			case <-ctx.Done():
				return
			default:
				err := d.listen(ctx, dbURL)
				if err != nil && !errors.Is(err, context.Canceled) {
					slog.Warn("denylist listen connection lost, retrying in 3s...", "error", err)
					time.Sleep(3 * time.Second)
				}
			}
		}
	}()
}

func (d *Denylist) listen(ctx context.Context, dbURL string) error {
	conn, err := pgx.Connect(ctx, dbURL)
	if err != nil {
		return err
	}
	defer conn.Close(ctx)

	_, err = conn.Exec(ctx, "LISTEN token_revoked")
	if err != nil {
		return err
	}
	slog.Info("connected to Postgres LISTEN token_revoked")

	for {
		notification, err := conn.WaitForNotification(ctx)
		if err != nil {
			return err
		}

		var ev RevokeEvent
		if err := json.Unmarshal([]byte(notification.Payload), &ev); err == nil {
			d.AddRevoked(ev.Kind, ev.Value, ev.ExpiresAt, ev.Cutoff)
			slog.Debug("denylist updated via NOTIFY", "kind", ev.Kind, "value", ev.Value)
		}
	}
}
