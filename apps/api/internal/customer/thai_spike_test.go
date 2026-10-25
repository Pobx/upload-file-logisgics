package customer_test

import (
	"strings"
	"testing"
	"unicode/utf8"

	"github.com/stretchr/testify/assert"
	"golang.org/x/text/unicode/norm"
)

// Spike B2-00: Thai Language Normalization & Search Verification
func TestSpike_B2_00_ThaiLanguageNormalization(t *testing.T) {
	// Sample Thai company names
	thaiSample1 := " บริษัท สยามโลจิสติกส์ คอร์ปอเรชั่น จำกัด "
	thaiSample2 := "บริษัท\u200Bกรุงเทพเฟรท\u200Bจำกัด" // with zero-width spaces

	// 1. NFC Normalization test
	nfc1 := norm.NFC.String(thaiSample1)
	assert.True(t, utf8.ValidString(nfc1))

	// 2. Remove zero-width spaces and clean
	clean2 := strings.ReplaceAll(thaiSample2, "\u200B", "")
	assert.Equal(t, "บริษัทกรุงเทพเฟรทจำกัด", clean2)

	// 3. Substring matching in Thai without spaces
	target := "สยามโลจิสติกส์"
	assert.True(t, strings.Contains(thaiSample1, target))
}
