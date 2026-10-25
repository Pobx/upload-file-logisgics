package customer_test

import (
	"context"
	"testing"

	"docsearch/api/internal/customer"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestCustomer_NormalizeName(t *testing.T) {
	tests := []struct {
		input    string
		expected string
	}{
		{"  Siam Logistics  Corp  ", "siam logistics corp"},
		{"BANGKOK FREIGHT LTD", "bangkok freight ltd"},
		{"  Thai   Maritime   Agency  ", "thai maritime agency"},
	}

	for _, tc := range tests {
		res := customer.NormalizeName(tc.input)
		assert.Equal(t, tc.expected, res)
	}
}

func TestCustomer_CreateValidation(t *testing.T) {
	svc := customer.NewService(nil, nil)

	// Missing name
	_, err := svc.CreateCustomer(context.Background(), customer.CreateCustomerRequest{Name: "  "})
	assert.Error(t, err)

	// Valid name
	cust, err := svc.CreateCustomer(context.Background(), customer.CreateCustomerRequest{Name: "Siam Logistics"})
	require.NoError(t, err)
	assert.Equal(t, "Siam Logistics", cust.Name)
	assert.Equal(t, "siam logistics", cust.NameNormalized)
	assert.True(t, cust.IsActive)
}
