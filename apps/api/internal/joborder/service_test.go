package joborder_test

import (
	"context"
	"testing"

	"docsearch/api/internal/joborder"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestJobOrder_CreateValidation(t *testing.T) {
	svc := joborder.NewService(nil, nil)

	// Missing job_no
	_, err := svc.CreateJobOrder(context.Background(), joborder.CreateJobOrderRequest{
		JobNo:      "",
		CustomerID: uuid.New(),
	})
	assert.Error(t, err)

	// Missing customer_id
	_, err = svc.CreateJobOrder(context.Background(), joborder.CreateJobOrderRequest{
		JobNo:      "JO-2026-001",
		CustomerID: uuid.Nil,
	})
	assert.Error(t, err)

	// Valid creation
	bl := "BL-TH-1"
	jo, err := svc.CreateJobOrder(context.Background(), joborder.CreateJobOrderRequest{
		JobNo:      "JO-2026-001",
		BLNo:       &bl,
		CustomerID: uuid.New(),
	})
	require.NoError(t, err)
	assert.Equal(t, "JO-2026-001", jo.JobNo)
	assert.Equal(t, "manual", jo.DataSource)
	assert.Equal(t, "unverified", jo.VerificationStatus)
}
