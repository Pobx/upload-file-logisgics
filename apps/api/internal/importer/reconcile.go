package importer

import (
	"strings"
)

type ExistingJobRecord struct {
	JobNo        string
	CustomerName string
	BLNo         string
	InvoiceNo    string
}

type ReconcileDecision struct {
	Result        ReconcileResult `json:"result"`
	ConflictField string          `json:"conflict_field,omitempty"`
	ExistingVal   string          `json:"existing_val,omitempty"`
	CSVVal        string          `json:"csv_val,omitempty"`
}

// ClassifyRow classifies a CSV row against existing database records
func ClassifyRow(row *CSVRow, existing *ExistingJobRecord) ReconcileDecision {
	if row.Error != "" {
		return ReconcileDecision{Result: ReconcileError}
	}

	if existing == nil {
		return ReconcileDecision{Result: ReconcileNew}
	}

	// Normalize comparisons (trim and case-insensitive)
	normRowCust := strings.ToLower(strings.TrimSpace(row.CustomerName))
	normDBcust := strings.ToLower(strings.TrimSpace(existing.CustomerName))

	normRowBL := strings.ToUpper(strings.TrimSpace(row.BLNo))
	normDBBL := strings.ToUpper(strings.TrimSpace(existing.BLNo))

	normRowInv := strings.ToUpper(strings.TrimSpace(row.InvoiceNo))
	normDBInv := strings.ToUpper(strings.TrimSpace(existing.InvoiceNo))

	// Check customer conflict
	if normDBcust != "" && normRowCust != "" && normDBcust != normRowCust {
		return ReconcileDecision{
			Result:        ReconcileConflict,
			ConflictField: "customer",
			ExistingVal:   existing.CustomerName,
			CSVVal:        row.CustomerName,
		}
	}

	// Check B/L conflict
	if normDBBL != "" && normRowBL != "" && normDBBL != normRowBL {
		return ReconcileDecision{
			Result:        ReconcileConflict,
			ConflictField: "bl_no",
			ExistingVal:   existing.BLNo,
			CSVVal:        row.BLNo,
		}
	}

	// Check Invoice conflict
	if normDBInv != "" && normRowInv != "" && normDBInv != normRowInv {
		return ReconcileDecision{
			Result:        ReconcileConflict,
			ConflictField: "invoice_no",
			ExistingVal:   existing.InvoiceNo,
			CSVVal:        row.InvoiceNo,
		}
	}

	// Check fills blank: DB field was empty, but CSV has value
	fillsBlank := false
	if normDBBL == "" && normRowBL != "" {
		fillsBlank = true
	}
	if normDBInv == "" && normRowInv != "" {
		fillsBlank = true
	}
	if normDBcust == "" && normRowCust != "" {
		fillsBlank = true
	}

	if fillsBlank {
		return ReconcileDecision{Result: ReconcileFillsBlank}
	}

	return ReconcileDecision{Result: ReconcileMatched}
}
