package calculator

import "math"

type arity int

const (
	unary arity = iota + 1
	binary
)

type operation struct {
	arity arity
	apply func(a, b float64) (float64, error)
}

var operations = map[string]operation{
	"add": {arity: binary, apply: func(a, b float64) (float64, error) {
		return a + b, nil
	}},
	"subtract": {arity: binary, apply: func(a, b float64) (float64, error) {
		return a - b, nil
	}},
	"multiply": {arity: binary, apply: func(a, b float64) (float64, error) {
		return a * b, nil
	}},
	"divide": {arity: binary, apply: func(a, b float64) (float64, error) {
		if b == 0 {
			return 0, newError(CodeDivisionByZero, "cannot divide by zero")
		}
		return a / b, nil
	}},
	"power": {arity: binary, apply: func(a, b float64) (float64, error) {
		return math.Pow(a, b), nil
	}},
	"percentage": {arity: binary, apply: func(a, b float64) (float64, error) {
		return a * b / 100, nil
	}},
	"sqrt": {arity: unary, apply: func(a, _ float64) (float64, error) {
		if a < 0 {
			return 0, newError(CodeInvalidInput, "square root requires a non-negative operandA")
		}
		return math.Sqrt(a), nil
	}},
}
