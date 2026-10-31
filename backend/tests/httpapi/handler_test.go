package httpapi_test

import (
	"encoding/json"
	"errors"
	"math"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/juangomezru/monorepo-calculator-sezzle/backend/internal/httpapi"
)

const (
	codeInvalidJSON      = "invalid_json"
	codeNotFound         = "not_found"
	codeMethodNotAllowed = "method_not_allowed"
	codeCalculation      = "calculation_error"
)

type errorBody struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

func TestHandler(t *testing.T) {
	const corsOrigin = "https://example.test"

	tests := []struct {
		name       string
		method     string
		path       string
		body       string
		wantStatus int
		wantCode   string
		wantResult *float64
		wantHealth bool
	}{
		{"health", http.MethodGet, "/health", "", http.StatusOK, "", nil, true},
		{"health wrong method", http.MethodPost, "/health", "", http.StatusMethodNotAllowed, codeMethodNotAllowed, nil, false},
		{"cors preflight", http.MethodOptions, "/api/v1/calculate", "", http.StatusNoContent, "", nil, false},
		{"unknown path", http.MethodGet, "/nope", "", http.StatusNotFound, codeNotFound, nil, false},
		{"calculate wrong method", http.MethodGet, "/api/v1/calculate", "", http.StatusMethodNotAllowed, codeMethodNotAllowed, nil, false},
		{"empty body", http.MethodPost, "/api/v1/calculate", "", http.StatusBadRequest, codeInvalidJSON, nil, false},
		{"invalid json", http.MethodPost, "/api/v1/calculate", "{", http.StatusBadRequest, codeInvalidJSON, nil, false},
		{"unknown field", http.MethodPost, "/api/v1/calculate", `{"operation":"add","operandA":1,"operandB":2,"extra":3}`, http.StatusBadRequest, codeInvalidJSON, nil, false},
		{"trailing document", http.MethodPost, "/api/v1/calculate", `{"operation":"add","operandA":1,"operandB":2}{}`, http.StatusBadRequest, codeInvalidJSON, nil, false},
		{"missing operand a", http.MethodPost, "/api/v1/calculate", `{"operation":"add","operandB":2}`, http.StatusBadRequest, "invalid_input", nil, false},
		{"missing operand b", http.MethodPost, "/api/v1/calculate", `{"operation":"add","operandA":1}`, http.StatusBadRequest, "invalid_input", nil, false},
		{"divide by zero", http.MethodPost, "/api/v1/calculate", `{"operation":"divide","operandA":1,"operandB":0}`, http.StatusBadRequest, "division_by_zero", nil, false},
		{"negative square root", http.MethodPost, "/api/v1/calculate", `{"operation":"sqrt","operandA":-1}`, http.StatusBadRequest, "invalid_input", nil, false},
		{"unsupported operation", http.MethodPost, "/api/v1/calculate", `{"operation":"wat","operandA":1,"operandB":2}`, http.StatusBadRequest, "unsupported_operation", nil, false},
		{"non-finite result", http.MethodPost, "/api/v1/calculate", `{"operation":"power","operandA":1e308,"operandB":2}`, http.StatusBadRequest, "non_finite_result", nil, false},
		{"addition", http.MethodPost, "/api/v1/calculate", `{"operation":"add","operandA":2,"operandB":4}`, http.StatusOK, "", ptr(6), false},
		{"square root", http.MethodPost, "/api/v1/calculate", `{"operation":"sqrt","operandA":9,"operandB":null}`, http.StatusOK, "", ptr(3), false},
	}

	handler := httpapi.NewHandler(corsOrigin)

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			request := httptest.NewRequest(tt.method, tt.path, strings.NewReader(tt.body))
			response := httptest.NewRecorder()

			handler.ServeHTTP(response, request)

			if response.Code != tt.wantStatus {
				t.Fatalf("got status %d, want %d", response.Code, tt.wantStatus)
			}
			if response.Code == http.StatusMethodNotAllowed {
				wantAllow := http.MethodPost
				if tt.path == "/health" {
					wantAllow = http.MethodGet
				}
				if got := response.Header().Get("Allow"); got != wantAllow {
					t.Fatalf("got Allow %q, want %q", got, wantAllow)
				}
			}
			if got := response.Header().Get("Access-Control-Allow-Origin"); got != corsOrigin {
				t.Fatalf("got CORS origin %q", got)
			}
			if got := response.Header().Get("Access-Control-Allow-Methods"); !strings.Contains(got, http.MethodPost) {
				t.Fatalf("got CORS methods %q", got)
			}
			if response.Code == http.StatusNoContent {
				if response.Body.Len() != 0 {
					t.Fatalf("expected an empty preflight body, got %q", response.Body.String())
				}
				return
			}
			if got := response.Header().Get("Content-Type"); got != "application/json" {
				t.Fatalf("got content type %q", got)
			}

			var payload struct {
				Result *float64   `json:"result"`
				Error  *errorBody `json:"error"`
				Status string     `json:"status"`
			}
			if err := json.Unmarshal(response.Body.Bytes(), &payload); err != nil {
				t.Fatalf("invalid response JSON: %v", err)
			}

			if tt.wantCode != "" {
				if payload.Error == nil {
					t.Fatalf("expected error code %q, got %s", tt.wantCode, response.Body.String())
				}
				if payload.Error.Code != tt.wantCode {
					t.Fatalf("got error code %q, want %q", payload.Error.Code, tt.wantCode)
				}
				if payload.Error.Message == "" {
					t.Fatal("expected a non-empty error message")
				}
				return
			}
			if tt.wantHealth {
				if payload.Status != "ok" {
					t.Fatalf("got health status %q", payload.Status)
				}
				return
			}
			if payload.Result == nil {
				t.Fatalf("expected a result, got %s", response.Body.String())
			}
			if math.Abs(*payload.Result-*tt.wantResult) > 1e-9 {
				t.Fatalf("got result %v, want %v", *payload.Result, *tt.wantResult)
			}
		})
	}
}

func TestHandlerWithoutCORSOrigin(t *testing.T) {
	request := httptest.NewRequest(http.MethodGet, "/health", nil)
	response := httptest.NewRecorder()

	httpapi.NewHandler("").ServeHTTP(response, request)

	if response.Code != http.StatusOK {
		t.Fatalf("got status %d, want %d", response.Code, http.StatusOK)
	}
	for _, header := range []string{
		"Access-Control-Allow-Origin",
		"Access-Control-Allow-Headers",
		"Access-Control-Allow-Methods",
	} {
		if got := response.Header().Get(header); got != "" {
			t.Fatalf("got %s %q, want it omitted", header, got)
		}
	}
}

func TestHandlerUnknownCalculationError(t *testing.T) {
	handler := httpapi.NewHandlerWithCalculator("", func(string, *float64, *float64) (float64, error) {
		return 0, errors.New("unexpected")
	})
	request := httptest.NewRequest(
		http.MethodPost,
		"/api/v1/calculate",
		strings.NewReader(`{"operation":"add","operandA":1,"operandB":2}`),
	)
	response := httptest.NewRecorder()

	handler.ServeHTTP(response, request)

	if response.Code != http.StatusBadRequest {
		t.Fatalf("got status %d, want %d", response.Code, http.StatusBadRequest)
	}
	var payload struct {
		Error *errorBody `json:"error"`
	}
	if err := json.Unmarshal(response.Body.Bytes(), &payload); err != nil {
		t.Fatalf("invalid response JSON: %v", err)
	}
	if payload.Error == nil || payload.Error.Code != codeCalculation {
		t.Fatalf("got error %+v, want code %q", payload.Error, codeCalculation)
	}
}

type failingWriter struct {
	header http.Header
}

func (w *failingWriter) Header() http.Header       { return w.header }
func (w *failingWriter) WriteHeader(int)           {}
func (w *failingWriter) Write([]byte) (int, error) { return 0, errors.New("write failed") }

func TestHandlerSurvivesResponseWriteFailure(t *testing.T) {
	response := &failingWriter{header: http.Header{}}
	request := httptest.NewRequest(http.MethodGet, "/health", nil)

	httpapi.NewHandler("").ServeHTTP(response, request)

	if got := response.Header().Get("Content-Type"); got != "application/json" {
		t.Fatalf("got content type %q", got)
	}
}

func ptr(v float64) *float64 { return &v }
