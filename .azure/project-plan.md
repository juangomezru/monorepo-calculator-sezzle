# Sezzle Calculator

**Status**: Approved
**Created**: 2026-10-31
**Mode**: Planning

## 1. Project Summary

Build a responsive, stateless calculator with a React + TypeScript frontend and a Go REST API. The application supports addition, subtraction, multiplication, and division, plus exponentiation, square root, and percentage operations where valid. The UI provides clear validation and error feedback, while the API remains independently testable and documented.

## 2. Goals & User Stories

- Users can enter operands and select an operation from desktop or mobile.
- Users can calculate basic arithmetic and supported advanced operations.
- Users can follow a trail of completed calculations, including chained steps, to understand how a result was produced.
- Users receive actionable errors for malformed input, division by zero, negative square-root input, unsupported operations, and non-finite results.
- Developers can run and test frontend and backend independently.
- A new contributor can set up the project and understand the API and design rationale from the README.

Out of scope: accounts, persisted calculation history, payments, and external integrations. The on-screen trail is session-only.

## 3. Architecture

Use a small monorepo with separate `frontend/` and `backend/` applications. The browser sends JSON requests to the Go API; the API validates inputs, performs deterministic calculations, and returns JSON results or structured errors. Development uses a Vite proxy (or configurable API base URL) to avoid CORS friction. Production can serve the compiled frontend separately from the API.

## 4. Services

**Frontend**: React, TypeScript, Vite. Physical-calculator matrix keypad, live display, completed-calculation trail, operation guide, keyboard support, validation, responsive layout, API client, and component/unit tests. Modules are split into `components/`, `hooks/`, core calculator files, and a single operation/keypad configuration.

**Backend**: Go REST API using `net/http`. Modular layout: `cmd/api` process wiring, `internal/calculator` domain with an operation registry, `internal/httpapi` JSON transport, and `internal/config` environment loading. Health endpoint, calculation endpoint, JSON decoding/encoding, operation validation, finite-number checks, CORS/configuration, graceful shutdown, and Go unit tests.

## 5. Data Stores & API

**Data Stores**: No datastore required; calculations are stateless.

**Authentication**: None.

Primary endpoint:

- `GET /health` → service status.
- `POST /api/v1/calculate` with `{ "operation": "add|subtract|multiply|divide|power|sqrt|percentage", "operandA": number, "operandB": number | null }` → `{ "result": number }`.
- Errors use a consistent JSON shape such as `{ "error": { "code": "invalid_input", "message": "..." } }`; validation and calculation failures return 400, unknown endpoints return 404, and wrong HTTP methods return 405.

Percentage is defined as `operandA * operandB / 100`; square root uses `operandA` and does not require `operandB`. The README documents these semantics.

## 6. Design System & UI

**Component Library**: Fluent UI v9

**Visual direction**: Calm, high-contrast calculator interface with a matrix keypad that mirrors a physical calculator: dark live display, four-column key grid, prominent equals key, and a compact operation guide. Use semantic buttons, explicit accessible labels, keyboard-accessible focus states, responsive stacking on narrow screens, and sufficient touch targets. Avoid exposing raw API errors directly to users; map them to concise guidance.

**Testing**: Unit tests cover the pure calculator state machine, API client, keypad orchestration, every backend operation, validation, and HTTP error shapes. Mutation testing uses Stryker on the React side and Gremlins on the Go side.

## 7. Validation & Error Handling

Validate required numeric operands, operation-specific operand requirements, finite values, division by zero, negative square-root input, and unsupported operations on both client and server. The server is authoritative. Disable or guard submission while a request is pending, show retryable network errors, and preserve entered values after failures.

## 8. Testing & Quality

Backend unit tests cover every operation, edge cases, JSON validation, HTTP status/error shapes, and health behavior using Go's standard testing tools. Frontend tests live in `frontend/tests/` and cover the pure calculator state machine, keypad rendering and keyboard shortcuts, API orchestration, successful results, validation messages, loading/network failures, and accessible interactions. Vitest and the app TypeScript config both include the test folder. Add formatting/linting/type-check scripts and run both test suites in CI or documented local commands.

## 9. Documentation & Deployment

The README documents prerequisites, local setup, commands, environment/API base URL configuration, endpoint request/response examples, operation semantics, testing, architecture, and design rationale. Optional Docker support consists of a backend image and a frontend production image (or a compose file) without making Docker a prerequisite for local development. Do not include secrets; use environment variables for configurable values.

## 10. Delivery Plan

1. Establish monorepo folders, Go module, Vite React TypeScript app, and shared development commands.
2. Implement and test the pure calculation domain and Go HTTP handlers.
3. Implement the accessible Fluent UI calculator and typed API client.
4. Add client validation, error mapping, responsive styling, and frontend tests.
5. Add README, optional Docker configuration, formatting/linting, and an end-to-end local smoke check.

