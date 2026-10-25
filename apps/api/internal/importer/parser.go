package importer

import (
	"bytes"
	"encoding/csv"
	"errors"
	"io"
	"strings"
)

type CSVRow struct {
	RowNo        int    `json:"row_no"`
	JobNo        string `json:"job_no"`
	BLNo         string `json:"bl_no"`
	InvoiceNo    string `json:"invoice_no"`
	CustomerName string `json:"customer_name"`
	Error        string `json:"error,omitempty"`
}

type CSVParser struct {
	reader *csv.Reader
	rowNo  int
}

func NewCSVParser(r io.Reader) (*CSVParser, error) {
	// Strip UTF-8 BOM if present
	buf := make([]byte, 3)
	n, _ := io.ReadFull(r, buf)
	var finalReader io.Reader
	if n == 3 && bytes.Equal(buf, []byte{0xEF, 0xBB, 0xBF}) {
		finalReader = r
	} else {
		finalReader = io.MultiReader(bytes.NewReader(buf[:n]), r)
	}

	csvReader := csv.NewReader(finalReader)
	csvReader.TrimLeadingSpace = true
	csvReader.ReuseRecord = true

	// Validate Header
	header, err := csvReader.Read()
	if err != nil {
		return nil, errors.New("cannot read CSV header")
	}

	headerMap := make(map[string]int)
	for i, h := range header {
		cleanHeader := strings.TrimSpace(strings.ToLower(h))
		headerMap[cleanHeader] = i
	}

	// Check required headers: joborder and customer name
	hasJobOrder := false
	hasCustomer := false
	for k := range headerMap {
		if strings.Contains(k, "joborder") || strings.Contains(k, "job_no") || strings.Contains(k, "job order") {
			hasJobOrder = true
		}
		if strings.Contains(k, "customer") {
			hasCustomer = true
		}
	}
	if !hasJobOrder || !hasCustomer {
		return nil, errors.New("missing required headers: 'JobOrder' and 'Customer Name' are required")
	}

	return &CSVParser{
		reader: csvReader,
		rowNo:  1,
	}, nil
}

func (p *CSVParser) Next() (*CSVRow, error) {
	record, err := p.reader.Read()
	if err != nil {
		return nil, err
	}
	p.rowNo++

	row := &CSVRow{
		RowNo: p.rowNo,
	}

	if len(record) > 0 {
		row.JobNo = strings.TrimSpace(record[0])
	}
	if len(record) > 1 {
		row.BLNo = strings.TrimSpace(record[1])
	}
	if len(record) > 2 {
		row.InvoiceNo = strings.TrimSpace(record[2])
	}
	if len(record) > 3 {
		row.CustomerName = strings.TrimSpace(record[3])
	}

	if row.JobNo == "" {
		row.Error = "JobOrder is required"
	}
	if row.CustomerName == "" {
		row.Error = "Customer Name is required"
	}

	return row, nil
}
