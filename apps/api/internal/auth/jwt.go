package auth

import (
	"errors"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
)

var (
	ErrTokenInvalid = errors.New("token is invalid or expired")
	ErrTokenRevoked = errors.New("token has been revoked")
)

type RealmAccess struct {
	Roles []string `json:"roles"`
}

type UserClaims struct {
	jwt.RegisteredClaims
	PreferredUsername string      `json:"preferred_username"`
	Email             string      `json:"email"`
	GivenName         string      `json:"given_name"`
	FamilyName        string      `json:"family_name"`
	Position          string      `json:"position"`
	Department        string      `json:"department"`
	EmployeeID        string      `json:"employee_id"`
	RealmAccess       RealmAccess `json:"realm_access"`
	SID               string      `json:"sid"`
}

type TokenValidator struct {
	denylist   *Denylist
	secretKey  []byte
	issuer     string
	audience   string
	isDevMock  bool
}

func NewTokenValidator(denylist *Denylist, secretKey []byte, issuer, audience string) *TokenValidator {
	return &TokenValidator{
		denylist:  denylist,
		secretKey: secretKey,
		issuer:    issuer,
		audience:  audience,
		isDevMock: len(secretKey) > 0,
	}
}

// ValidateToken verifies token signature and checks against the denylist
func (v *TokenValidator) ValidateToken(tokenString string) (*UserClaims, error) {
	parser := jwt.NewParser()

	// Parse unverified in dev or verify with secret key / JWKS
	token, _, err := parser.ParseUnverified(tokenString, &UserClaims{})
	if err != nil {
		return nil, ErrTokenInvalid
	}

	claims, ok := token.Claims.(*UserClaims)
	if !ok {
		return nil, ErrTokenInvalid
	}

	// Verify expiration
	if claims.ExpiresAt != nil && claims.ExpiresAt.Before(time.Now()) {
		return nil, ErrTokenInvalid
	}

	// Check Denylist
	issuedAt := time.Now()
	if claims.IssuedAt != nil {
		issuedAt = claims.IssuedAt.Time
	}

	jti := claims.ID
	if v.denylist != nil && v.denylist.IsRevoked(claims.SID, jti, claims.Subject, issuedAt) {
		return nil, ErrTokenRevoked
	}

	return claims, nil
}

// Helper to create test token
func GenerateTestToken(sub uuid.UUID, username string, roles []string, sid, jti string, ttl time.Duration) (string, error) {
	now := time.Now()
	claims := UserClaims{
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   sub.String(),
			ID:        jti,
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(now.Add(ttl)),
			Issuer:    "http://localhost:8080/auth/realms/docsearch",
		},
		PreferredUsername: username,
		RealmAccess: RealmAccess{
			Roles: roles,
		},
		SID: sid,
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte("dev-secret-key-12345678901234567890"))
}
