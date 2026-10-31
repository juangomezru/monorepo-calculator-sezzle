package calculator

const (
	CodeInvalidInput         = "invalid_input"
	CodeDivisionByZero       = "division_by_zero"
	CodeUnsupportedOperation = "unsupported_operation"
	CodeNonFiniteResult      = "non_finite_result"
)

type Error struct {
	Code    string
	Message string
}

func (e *Error) Error() string { return e.Message }

func newError(code, message string) *Error {
	return &Error{Code: code, Message: message}
}
