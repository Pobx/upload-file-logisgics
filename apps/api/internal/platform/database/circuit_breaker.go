package database

import (
	"sync"
	"time"
)

type State string

const (
	StateClosed   State = "CLOSED"
	StateOpen     State = "OPEN"
	StateHalfOpen State = "HALF_OPEN"
)

// CircuitBreaker protects the application from cascading failures when DB is down
type CircuitBreaker struct {
	mu           sync.RWMutex
	state        State
	failures     int
	threshold    int
	window       time.Duration
	cooldown     time.Duration
	lastFailure  time.Time
	openedAt     time.Time
}

func NewCircuitBreaker(threshold int, window, cooldown time.Duration) *CircuitBreaker {
	return &CircuitBreaker{
		state:     StateClosed,
		threshold: threshold,
		window:    window,
		cooldown:  cooldown,
	}
}

// Allow checks if a request is allowed to proceed
func (cb *CircuitBreaker) Allow() bool {
	cb.mu.Lock()
	defer cb.mu.Unlock()

	now := time.Now()
	if cb.state == StateOpen {
		if now.Sub(cb.openedAt) >= cb.cooldown {
			cb.state = StateHalfOpen
			return true
		}
		return false
	}

	return true
}

// RecordSuccess records a successful database operation
func (cb *CircuitBreaker) RecordSuccess() {
	cb.mu.Lock()
	defer cb.mu.Unlock()

	if cb.state == StateHalfOpen {
		cb.state = StateClosed
		cb.failures = 0
	}
}

// RecordFailure records a failed database operation
func (cb *CircuitBreaker) RecordFailure() {
	cb.mu.Lock()
	defer cb.mu.Unlock()

	now := time.Now()
	if cb.state == StateHalfOpen {
		cb.state = StateOpen
		cb.openedAt = now
		return
	}

	if cb.state == StateClosed {
		if now.Sub(cb.lastFailure) > cb.window {
			cb.failures = 1
		} else {
			cb.failures++
		}
		cb.lastFailure = now

		if cb.failures >= cb.threshold {
			cb.state = StateOpen
			cb.openedAt = now
		}
	}
}

func (cb *CircuitBreaker) GetState() State {
	cb.mu.RLock()
	defer cb.mu.RUnlock()
	return cb.state
}
