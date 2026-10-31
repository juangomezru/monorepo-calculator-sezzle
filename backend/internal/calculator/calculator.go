package calculator

import "math"

// Calculate validates and executes one operation. OperandB is ignored for unary
// operations and may be nil for those operations.
func Calculate(name string, operandA, operandB *float64) (float64, error) {
	spec, ok := operations[name]
	if !ok {
		return 0, newError(CodeUnsupportedOperation, "unsupported operation")
	}
	if operandA == nil || !finite(*operandA) {
		return 0, newError(CodeInvalidInput, "operandA must be a finite number")
	}
	if spec.arity == binary && (operandB == nil || !finite(*operandB)) {
		return 0, newError(CodeInvalidInput, "operandB must be a finite number")
	}

	var b float64
	if operandB != nil {
		b = *operandB
	}
	result, err := spec.apply(*operandA, b)
	if err != nil {
		return 0, err
	}
	if !finite(result) {
		return 0, newError(CodeNonFiniteResult, "calculation result is not finite")
	}
	return result, nil
}

func finite(value float64) bool {
	return !math.IsNaN(value) && !math.IsInf(value, 0)
}
