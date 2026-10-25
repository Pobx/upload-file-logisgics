package database_test

import (
	"testing"
	"time"

	"docsearch/api/internal/platform/database"
	"github.com/stretchr/testify/assert"
)

func TestCircuitBreaker(t *testing.T) {
	cb := database.NewCircuitBreaker(3, 100*time.Millisecond, 50*time.Millisecond)

	assert.True(t, cb.Allow())
	assert.Equal(t, database.StateClosed, cb.GetState())

	// 2 failures: still closed
	cb.RecordFailure()
	cb.RecordFailure()
	assert.True(t, cb.Allow())
	assert.Equal(t, database.StateClosed, cb.GetState())

	// 3rd failure: opens
	cb.RecordFailure()
	assert.Equal(t, database.StateOpen, cb.GetState())
	assert.False(t, cb.Allow())

	// Wait cooldown
	time.Sleep(60 * time.Millisecond)
	assert.True(t, cb.Allow()) // Half-open
	assert.Equal(t, database.StateHalfOpen, cb.GetState())

	// Success restores to Closed
	cb.RecordSuccess()
	assert.Equal(t, database.StateClosed, cb.GetState())
	assert.True(t, cb.Allow())
}
