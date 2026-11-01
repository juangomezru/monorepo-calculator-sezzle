# Sezzle Calculator

A full-stack, stateless calculator with a physical-calculator keypad in React/TypeScript and a modular Go REST API. Every arithmetic operation is validated and evaluated by the backend; the browser owns presentation, input handling, and API orchestration.

- **Frontend:** React 18, TypeScript, Vite 7, Fluent UI v9, Vitest, Stryker.
- **Backend:** Go 1.22, standard-library `net/http`, Gremlins.
- **Deployment:** multi-stage Docker images; Docker Compose runs the UI behind nginx with `/api` and `/health` proxied to Go.

## Features

- Seven operations: addition, subtraction, multiplication, division, power, square root, and percentage.
- Matrix keypad with digits, operators, decimal point, sign toggle, backspace, clear, and equals.
- Full keyboard support: `0-9`, `.` or `,`, `+`, `-`, `*`/`x`, `/`, `^`, `%`, `r`, `Enter`/`=`, `Backspace`, and `Esc`/`C`.
- Chained calculations: pressing another operator evaluates the pending binary operation first.
- Calculation trail above the display showing each completed expression and result, including chained steps and square roots.
- Square root is evaluated immediately and can be used inside a pending expression.
- Accessible controls, live result announcements, error messages, and a responsive mobile layout.
- Go domain logic is isolated from HTTP; operations live in a registry and validation rules are shared by every operation.
- Unit tests, coverage thresholds, coverage reports, mutation testing, and a clean `npm audit`.

## Project structure

```text
.
├── backend
│   ├── cmd/api/main.go              # process wiring, HTTP server, graceful shutdown
│   ├── internal/calculator
│   │   ├── calculator.go            # validation and calculation entry point
│   │   ├── errors.go                # stable error codes and error type
│   │   └── operations.go            # operation registry; add an operation here
│   ├── internal/config/config.go    # environment configuration
│   ├── internal/httpapi/handler.go  # JSON REST transport and CORS
│   ├── scripts/mutation.ps1         # Gremlins runner for Windows
│   ├── scripts/mutation.sh          # Gremlins runner for Linux/macOS
│   ├── .gremlins.yaml               # mutation-testing configuration
│   ├── tools.go                     # reproducible Gremlins tool dependency
│   └── Dockerfile
├── frontend
│   ├── src/api.ts                   # typed API client
│   ├── src/calculator.ts            # pure calculator state machine and formatters
│   ├── src/operations.ts            # operation names, labels, symbols, and key labels
│   ├── src/keypad.ts                # data-driven keypad layout and keyboard shortcuts
│   ├── src/App.tsx                  # layout composition only
│   ├── src/components
│   │   ├── CalculationTrail.tsx     # completed-expression history panel
│   │   ├── CalculatorDisplay.tsx    # live display and pending-operation caption
│   │   ├── CalculatorKey.tsx        # accessible Fluent key button
│   │   ├── Keypad.tsx               # renders keypad.ts
│   │   └── OperationGuide.tsx       # operation and keyboard reference
│   ├── src/hooks
│   │   ├── useCalculator.ts         # state, API calls, history, action dispatch
│   │   └── useKeyboardInput.ts      # window keyboard listener
│   ├── src/styles.css               # responsive calculator design
│   ├── tests
│   │   ├── App.test.tsx             # keypad, trail, keyboard, loading, and error UI tests
│   │   ├── api.test.ts              # API client tests
│   │   ├── calculator.test.ts       # state-machine and formatter tests
│   │   ├── integration.test.ts      # frontend client against the Go HTTP server
│   │   ├── keypad.test.ts           # keypad layout and shortcut tests
│   │   └── setup.ts                 # Testing Library and ResizeObserver setup
│   ├── stryker.config.json          # Stryker mutation-testing configuration
│   ├── vitest.config.ts             # tests, coverage scope, and thresholds
│   ├── nginx.conf                   # Docker reverse proxy for /api and /health
│   └── Dockerfile
├── docker-compose.yml
└── README.md
```

## Prerequisites

- Go 1.22+
- Node.js 22.18+ and npm 10+
- Docker (optional, for the container workflow or the Windows Gremlins runner)

## Local setup

### Backend

```sh
cd backend
go run ./cmd/api
```

The API listens on `http://localhost:8080` by default. Verify it with:

```sh
curl -s http://localhost:8080/health
```

From the repository root, run the backend module with:

```sh
go test ./backend/...
```

The backend tests are kept in `backend/tests`, so production-package coverage
is collected with:

```sh
cd backend
go test -count=1 -coverpkg=./... -coverprofile=coverage.out ./...
go tool cover -func coverage.out
```

### Frontend

```sh
cd frontend
npm ci
npm run dev
```

Open the Vite URL (normally `http://localhost:5173`). The development proxy forwards `/api` and `/health` to port 8080. Use `npm install` instead of `npm ci` only when you intentionally want to refresh dependency ranges.

### Environment variables

| Variable      | Service | Default | Purpose                                                    |
| ------------- | ------- | ------- | ---------------------------------------------------------- |
| `PORT`        | backend | `8080`  | HTTP listen port.                                          |
| `CORS_ORIGIN` | backend | empty   | Value for `Access-Control-Allow-Origin`; omitted when empty. |

In Docker, nginx serves the frontend and proxies API requests to the backend, so no CORS configuration is required. When serving the SPA and API from different origins, set `CORS_ORIGIN` to the frontend origin.

## API

### `GET /health`

```json
{ "status": "ok" }
```

### `POST /api/v1/calculate`

Request body:

```json
{ "operation": "add", "operandA": 2, "operandB": 3 }
```

Example request:

```sh
curl -s http://localhost:8080/api/v1/calculate \
  -H 'Content-Type: application/json' \
  -d '{"operation":"percentage","operandA":25,"operandB":20}'
```

Successful response:

```json
{ "result": 5 }
```

`operandB` is required for binary operations and ignored for `sqrt`. Omit it or send `null` for square root:

```sh
curl -s http://localhost:8080/api/v1/calculate \
  -H 'Content-Type: application/json' \
  -d '{"operation":"sqrt","operandA":9}'
```

Supported operations:

| Operation    | Semantics                   | Operands |
| ------------ | --------------------------- | -------- |
| `add`        | `operandA + operandB`       | A, B     |
| `subtract`   | `operandA - operandB`       | A, B     |
| `multiply`   | `operandA * operandB`       | A, B     |
| `divide`     | `operandA / operandB`       | A, B     |
| `power`      | `operandA ^ operandB`       | A, B     |
| `percentage` | `operandA * operandB / 100` | A, B     |
| `sqrt`       | square root of `operandA`   | A        |

Errors use a consistent shape:

```json
{
  "error": {
    "code": "division_by_zero",
    "message": "cannot divide by zero"
  }
}
```

| Code                    | Status | Meaning                                        |
| ----------------------- | ------ | ---------------------------------------------- |
| `invalid_json`          | 400    | Malformed body, unknown field, or extra data.  |
| `invalid_input`         | 400    | Missing/non-finite operand or negative root.   |
| `division_by_zero`      | 400    | Division by zero.                              |
| `unsupported_operation` | 400    | Unknown operation name.                        |
| `non_finite_result`     | 400    | Calculation overflowed or produced NaN/Inf.    |
| `not_found`             | 404    | Unknown endpoint.                              |
| `method_not_allowed`    | 405    | Known endpoint with the wrong method.          |

Inputs and results must be finite. Unknown JSON fields, trailing documents, and bodies over 1 MiB are rejected so malformed requests fail fast. `405` responses include an `Allow` header.

## Frontend behavior

The UI is an immediate-execution calculator:

- Enter a number, choose an operator, enter the second number, then press `=`.
- Pressing another operator after the second number evaluates the pending operation and starts a new one, so expressions can be chained.
- The history trail records every successful calculation as `expression = result`. Chaining adds one step per completed operation, so the trail reads like a worked solution.
- `Clear history` removes the trail without changing the current display. Failed calculations are not added to the trail.
- `√` evaluates the current entry immediately. If a binary operation is pending, the square-root result becomes its right operand.
- `%` means “A percent of B”: `25 % 20 =` evaluates `percentage(25, 20)`, or 5. The trail renders this as `25% of 20 = 5`.
- Results keep their full JavaScript number in calculator state; `formatNumber` rounds to 12 significant digits only when rendering the display and trail.
- Invalid characters are ignored, entries are capped at 16 digits (sign and decimal point excluded), and only one decimal point is allowed.
- Calculation errors appear inline; the next digit or operator starts a fresh entry while square root clears the error.
- The keypad is disabled while a request is in flight to prevent overlapping calculations.

## Testing and quality

### Backend

```sh
cd backend
gofmt -l .
go vet ./...
go test -count=1 -cover ./...
go build ./...
```

Mutation testing:

```sh
./scripts/mutation.sh          # Linux/macOS (or: sh scripts/mutation.sh)
```

```powershell
.\scripts\mutation.ps1         # Windows (runs Gremlins in a Linux container)
```

Gremlins v0.5.1 has an upstream Windows path-separator bug when mapping coverage profiles, so the Windows script runs the same tool inside a Linux Go container. The latest run produced:

- 25 mutants killed, 0 survived, 1 not covered.
- 100% test efficacy and 96.15% mutant coverage.
- Thresholds: efficacy 90%, mutant coverage 90%.

Go coverage: `internal/calculator` 96.7%, `internal/config` 100%, and `internal/httpapi` 100% of statements. `cmd/api` is process wiring and is excluded from mutation testing.

### Frontend

```sh
cd frontend
npm run lint
npm test
npm run test:coverage
npm run build
npm audit
npm run test:mutation
```

Frontend tests live in `tests/`, separate from production source. `vitest.config.ts` includes that folder and loads `tests/setup.ts`; `tsconfig.app.json` includes `tests` as well so `npm run lint` type-checks the suite.

Current results:

- 79 unit tests across 4 files.
- Coverage: 98.28% statements, 97.36% branches, 100% functions, 100% lines.
- Coverage thresholds enforced by Vitest: 90% statements, 85% branches, 90% functions, 95% lines.
- Stryker mutates the pure state machine (`calculator.ts`), the API client (`api.ts`), and operation metadata (`operations.ts`): MUTATION_RESULT.
- Stryker thresholds: high 85%, low 70%, break 0%.
- `npm audit`: 0 vulnerabilities. Patched transitive versions are pinned with npm overrides (`minimatch` and `qs`).
- `npm run build` passes with Vite 7.3.7.

Stryker writes `reports/mutation/mutation.html` and `reports/mutation/mutation.json`. Mutation runs are opt-in because they are slower than the unit-test suite. Presentational components and the keypad configuration are covered by unit tests but excluded from the mutation scope so the run stays focused and fast.

## Design decisions and assumptions

**Go standard library over a framework.** This small API needs routing, JSON, CORS, and graceful process wiring that `net/http` and the standard library already provide. Avoiding framework dependencies keeps the binary small, the request lifecycle explicit, and the assessment focused on domain behavior.

**Backend is authoritative.** The Go domain owns validation and arithmetic, so clients cannot bypass edge-case handling. The frontend validates only enough to keep the keypad usable.

**Domain separated from transport.** `internal/calculator` has no HTTP imports. Operations live in a registry, so adding an operation is one map entry with an arity and an `apply` function. `internal/httpapi` maps domain error codes to JSON and status codes, and `internal/config` keeps deployment concerns out of the domain.

**Typed frontend state machine.** `calculator.ts` contains pure transitions (`inputDigit`, `selectOperation`, `applyResult`, and so on). This keeps React focused on presentation and makes behavior easy to unit test and mutate.

**Floating-point limitations.** The calculator uses IEEE 754 binary floating-point numbers because the API contract is JSON numbers and the tool is general-purpose. Values such as `0.1 + 0.2` can contain a small representation error, so the UI formats values for readability without feeding rounded display text back into calculations. For financial calculations, I would use integer minor units where possible or a decimal type end to end, define explicit currency and rounding rules, and add currency-aware domain tests.

**Modular frontend.** `useCalculator` owns state, API calls, history, and action dispatch; `useKeyboardInput` owns the global listener. UI components are small and presentational, while `operations.ts` and `keypad.ts` are the single source of truth for operation metadata, keypad layout, and keyboard shortcuts. `App.tsx` is only layout composition. Adding an operation therefore means updating the backend registry and one operation definition, then adding its keypad entry.

**Calculation trail is a UI concern.** Completed expressions are appended to an in-memory list after a successful API response. The trail is intentionally not part of the state machine or the backend, so it cannot affect calculation correctness and is trivially extendable (for example, persisting it later). It follows the Google Calculator pattern: newest calculation adjacent to the live display, with older steps scrollable above.

**Immediate execution with backend round-trips.** Chaining, equals, and square root call the API as they happen. The UI disables the keypad while a request is pending to avoid overlapping calculations.

**Percentage semantics.** `%` is defined as “A percent of B” (`A * B / 100`) rather than a postfix percentage. This is explicit in the UI, API documentation, and tests.

**Square root semantics.** Square root is unary and uses the current entry. It preserves a pending binary operation so the result can be used as an operand.

**Accessibility and responsiveness.** Every key has an explicit accessible label, the display is a live region, focus remains visible through Fluent UI, and the keypad collapses cleanly on mobile.

**Stateless by design.** No accounts or secrets are involved, and the backend stores nothing. The calculation trail exists only in the current browser session. CORS is the only deployment-specific backend setting.

**Mutation testing is opt-in.** Mutation runs are slower than the normal suite, so they are separate npm/Go commands rather than part of the default test script. The frontend mutation scope deliberately targets logic and metadata rather than presentation.

**Assumptions and limits.** History is session-only and is not persisted across reloads, repeated-equals behavior is not implemented, one CORS origin is supported, and the service keeps no state between requests.

## Docker

```sh
docker compose up --build
```

The UI is on `http://localhost:3000` and the API on `http://localhost:8080`. The backend image builds only `./cmd/api`, runs as a non-root user, and exposes a health check. The frontend image builds the Vite bundle and serves it with nginx, proxying `/api` and `/health` to the backend container. Compose waits for the backend health check before starting the frontend.

## AI assistance and prompts

This solution used the following prompts to automate repetitive scaffolding,
refactoring, test-maintenance, and verification work. Original prompts,
consolidated and edited for readability.

1. **Initial project scaffolding**

   > Propose a scaffolding plan for a full-stack calculator using a modularized
   > monolith approach. The repository should contain a Go backend and a
   > React/Vite/TypeScript frontend. Keep the system simple to deploy as one
   > application while separating domain logic, transport, configuration, UI,
   > and API concerns. Save the approved implementation plan as a Markdown
   > document, including the proposed folder structure, responsibilities,
   > testing strategy, API contract, and local development workflow. Use this
   > plan to automate the repetitive initial setup instead of creating the
   > project structure and boilerplate manually.

2. **Feature completion and regression testing**

   > The next folder is a monorepo containing both a Go backend and a
   > React/Vite/TypeScript frontend. Complete these steps:
   >
   > 1. The backend exposes endpoints for several operations, but the frontend
   >    currently sends only two separated numbers. Update the frontend so it
   >    supports the complete backend operation contract.
   > 2. The frontend feels empty and is not intuitive. Replace the current input
   >    experience with a matrix-style keypad and UI/UX modeled after a physical
   >    calculator, while preserving accessibility and responsive behavior.
   > 3. Unit tests already exist for both backend and frontend. Add a mutation
   >    testing library on the React side and Gremlins mutation testing on the
   >    Go side.
   > 4. Run the complete regression suite, including formatting, linting,
   >    unit tests, builds, coverage, mutation tests, and dependency checks.
   >    Fix any regressions or dependency vulnerabilities found, then report
   >    the exact commands and results. Automate the repetitive implementation,
   >    test execution, failure diagnosis, and dependency verification work
   >    while preserving the existing behavior and architecture.

3. **Test organization and configuration cleanup**

   > Review the monorepo for files matching `*_test` and `*.test.*`. Move tests
   > into clearly separated test folders without breaking package boundaries,
   > imports, coverage, or test discovery. Check that frontend test imports,
   > setup files, TypeScript configuration, Vite/Vitest configuration, and
   > related test paths are correct. Preserve behavior, update references and
   > documentation where necessary, and run the relevant backend and frontend
   > test suites after the reorganization. Automate the repetitive file
   > organization, import updates, configuration checks, and post-change
   > validation instead of handling each test file manually.

Together, these prompts delegated repetitive project scaffolding, cross-layer
refactoring, test relocation, configuration maintenance, and regression
verification to AI assistance. All generated code was reviewed, formatted, and
verified with the commands above.
