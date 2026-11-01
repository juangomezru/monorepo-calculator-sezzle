package httpapi

import (
	"encoding/json"
	"errors"
	"io"
	"log"
	"net/http"

	"github.com/juangomezru/monorepo-calculator-sezzle/backend/internal/calculator"
)

const (
	codeInvalidJSON      = "invalid_json"
	codeNotFound         = "not_found"
	codeMethodNotAllowed = "method_not_allowed"
	codeCalculation      = "calculation_error"
	maxRequestBody       = 1 << 20
)

type CalculateFunc func(name string, operandA, operandB *float64) (float64, error)

type API struct {
	corsOrigin  string
	calculateFn CalculateFunc
}

func NewHandler(corsOrigin string) http.Handler {
	return NewHandlerWithCalculator(corsOrigin, calculator.Calculate)
}

func NewHandlerWithCalculator(corsOrigin string, calculate CalculateFunc) http.Handler {
	return &API{corsOrigin: corsOrigin, calculateFn: calculate}
}

func (api *API) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	if api.corsOrigin != "" {
		w.Header().Set("Access-Control-Allow-Origin", api.corsOrigin)
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
	}

	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusNoContent)
		return
	}

	switch r.URL.Path {
	case "/health":
		api.health(w, r)
	case "/api/v1/calculate":
		api.calculate(w, r)
	default:
		writeError(w, http.StatusNotFound, codeNotFound, "endpoint not found")
	}
}

func (api *API) health(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		methodNotAllowed(w, http.MethodGet)
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (api *API) calculate(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		methodNotAllowed(w, http.MethodPost)
		return
	}

	r.Body = http.MaxBytesReader(w, r.Body, maxRequestBody)
	defer r.Body.Close()

	var req calculateRequest
	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, codeInvalidJSON, "request must be valid JSON")
		return
	}
	if err := decoder.Decode(&struct{}{}); err != io.EOF {
		writeError(w, http.StatusBadRequest, codeInvalidJSON, "request must contain a single JSON object")
		return
	}

	result, err := api.calculateFn(req.Operation, req.OperandA, req.OperandB)
	if err != nil {
		writeError(w, http.StatusBadRequest, errorCode(err), err.Error())
		return
	}
	writeJSON(w, http.StatusOK, calculateResponse{Result: result})
}

func errorCode(err error) string {
	var calcErr *calculator.Error
	if errors.As(err, &calcErr) {
		return calcErr.Code
	}
	return codeCalculation
}

func methodNotAllowed(w http.ResponseWriter, allowed string) {
	w.Header().Set("Allow", allowed)
	writeError(w, http.StatusMethodNotAllowed, codeMethodNotAllowed, "method not allowed")
}

type calculateRequest struct {
	Operation string   `json:"operation"`
	OperandA  *float64 `json:"operandA"`
	OperandB  *float64 `json:"operandB"`
}

type calculateResponse struct {
	Result float64 `json:"result"`
}

type errorBody struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

type errorResponse struct {
	Error errorBody `json:"error"`
}

func writeError(w http.ResponseWriter, status int, code, message string) {
	writeJSON(w, status, errorResponse{Error: errorBody{Code: code, Message: message}})
}

func writeJSON(w http.ResponseWriter, status int, value any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(value); err != nil {
		log.Printf("write response: %v", err)
	}
}
