package importer_test

import (
	"strings"
	"testing"

	"docsearch/api/internal/importer"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestCSVParser(t *testing.T) {
	csvData := `JobOrder,B/L,Invoice,Customer Name
JO-01,BL-01,INV-01,Siam Logistics
JO-02,,,Bangkok Freight`

	parser, err := importer.NewCSVParser(strings.NewReader(csvData))
	require.NoError(t, err)

	r1, err := parser.Next()
	require.NoError(t, err)
	assert.Equal(t, "JO-01", r1.JobNo)
	assert.Equal(t, "BL-01", r1.BLNo)
	assert.Equal(t, "Siam Logistics", r1.CustomerName)

	r2, err := parser.Next()
	require.NoError(t, err)
	assert.Equal(t, "JO-02", r2.JobNo)
	assert.Empty(t, r2.BLNo)
}

func TestReconcile_Classifier(t *testing.T) {
	// 1. New row
	rowNew := &importer.CSVRow{JobNo: "JO-NEW", CustomerName: "Company A"}
	d1 := importer.ClassifyRow(rowNew, nil)
	assert.Equal(t, importer.ReconcileNew, d1.Result)

	// 2. Matched row
	rowMatched := &importer.CSVRow{JobNo: "JO-1", CustomerName: "Company A", BLNo: "BL1", InvoiceNo: "INV1"}
	dbMatched := &importer.ExistingJobRecord{JobNo: "JO-1", CustomerName: "Company A", BLNo: "BL1", InvoiceNo: "INV1"}
	d2 := importer.ClassifyRow(rowMatched, dbMatched)
	assert.Equal(t, importer.ReconcileMatched, d2.Result)

	// 3. Fills blank
	rowFills := &importer.CSVRow{JobNo: "JO-1", CustomerName: "Company A", BLNo: "BL1", InvoiceNo: "INV1"}
	dbBlank := &importer.ExistingJobRecord{JobNo: "JO-1", CustomerName: "Company A", BLNo: "", InvoiceNo: ""}
	d3 := importer.ClassifyRow(rowFills, dbBlank)
	assert.Equal(t, importer.ReconcileFillsBlank, d3.Result)

	// 4. Conflict
	rowConflict := &importer.CSVRow{JobNo: "JO-1", CustomerName: "Company A", BLNo: "BL-CSV", InvoiceNo: "INV1"}
	dbExisting := &importer.ExistingJobRecord{JobNo: "JO-1", CustomerName: "Company A", BLNo: "BL-DB", InvoiceNo: "INV1"}
	d4 := importer.ClassifyRow(rowConflict, dbExisting)
	assert.Equal(t, importer.ReconcileConflict, d4.Result)
	assert.Equal(t, "bl_no", d4.ConflictField)
	assert.Equal(t, "BL-DB", d4.ExistingVal)
	assert.Equal(t, "BL-CSV", d4.CSVVal)
}
