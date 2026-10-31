package calculator_test

import (
	"errors"
	"math"
	"testing"

	"github.com/juangomezru/monorepo-calculator-sezzle/backend/internal/calculator"
)

func ptr(v float64) *float64 { return &v }

func TestCalculateOperations(t *testing.T) {
	tests := []struct {
		name string
		op   string
		a, b *float64
		want float64
	}{
		{"add", "add", ptr(2), ptr(3), 5},
		{"subtract", "subtract", ptr(2), ptr(3), -1},
		{"multiply", "multiply", ptr(2), ptr(3), 6},
		{"divide", "divide", ptr(6), ptr(3), 2},
		{"power", "power", ptr(2), ptr(3), 8},
		{"fractional power", "power", ptr(9), ptr(0.5), 3},
		{"percentage", "percentage", ptr(25), ptr(20), 5},
		{"sqrt", "sqrt", ptr(9), nil, 3},
		{"sqrt ignores a supplied second operand", "sqrt", ptr(16), ptr(-4), 4},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := calculator.Calculate(tt.op, tt.a, tt.b)
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if math.Abs(got-tt.want) > 1e-9 {
				t.Fatalf("got %v, want %v", got, tt.want)
			}
		})
	}
}

func TestCalculateValidation(t *testing.T) {
	tests := []struct {
		name string
		op   string
		code string
		a, b *float64
	}{
		{"missing operand a", "add", calculator.CodeInvalidInput, nil, ptr(1)},
		{"missing operand b", "add", calculator.CodeInvalidInput, ptr(1), nil},
		{"non-finite operand a", "add", calculator.CodeInvalidInput, ptr(math.NaN()), ptr(1)},
		{"negative infinite operand a", "add", calculator.CodeInvalidInput, ptr(math.Inf(-1)), ptr(1)},
		{"non-finite operand b", "add", calculator.CodeInvalidInput, ptr(1), ptr(math.Inf(1))},
		{"division by zero", "divide", calculator.CodeDivisionByZero, ptr(1), ptr(0)},
		{"negative square root", "sqrt", calculator.CodeInvalidInput, ptr(-1), nil},
		{"unsupported operation", "wat", calculator.CodeUnsupportedOperation, ptr(1), ptr(2)},
		{"non-finite power result", "power", calculator.CodeNonFiniteResult, ptr(math.MaxFloat64), ptr(2)},
		{"non-finite addition result", "add", calculator.CodeNonFiniteResult, ptr(math.MaxFloat64), ptr(math.MaxFloat64)},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := calculator.Calculate(tt.op, tt.a, tt.b)
			if err == nil {
				t.Fatalf("expected an error, got result %v", got)
			}
			var calcErr *calculator.Error
			if !errors.As(err, &calcErr) {
				t.Fatalf("expected a calculator error, got %T", err)
			}
			if calcErr.Code != tt.code {
				t.Fatalf("got code %q, want %q", calcErr.Code, tt.code)
			}
			if calcErr.Message == "" {
				t.Fatal("expected a non-empty error message")
			}
		})
	}
}
