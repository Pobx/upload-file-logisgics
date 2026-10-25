package auth_test

import (
	"testing"
	"time"

	"docsearch/api/internal/auth"
	"github.com/stretchr/testify/assert"
)

func TestDenylist(t *testing.T) {
	dl := auth.NewDenylist()

	now := time.Now()
	// Test normal token (not revoked)
	assert.False(t, dl.IsRevoked("sid-1", "jti-1", "user-1", now))

	// Revoke by JTI
	dl.AddRevoked(auth.RevokeKindJTI, "jti-1", now.Add(5*time.Minute))
	assert.True(t, dl.IsRevoked("sid-1", "jti-1", "user-1", now))
	assert.False(t, dl.IsRevoked("sid-1", "jti-2", "user-1", now))

	// Revoke by SID
	dl.AddRevoked(auth.RevokeKindSID, "sid-1", now.Add(10*time.Minute))
	assert.True(t, dl.IsRevoked("sid-1", "jti-99", "user-1", now))

	// Revoke by Sub (User cutoff)
	cutoff := now.Add(1 * time.Second)
	dl.AddRevoked(auth.RevokeKindSub, "user-disabled", now.Add(1*time.Hour), cutoff)
	// Token issued before cutoff is revoked
	assert.True(t, dl.IsRevoked("", "", "user-disabled", now))
	// Token issued after cutoff is allowed
	assert.False(t, dl.IsRevoked("", "", "user-disabled", now.Add(2*time.Second)))
}
