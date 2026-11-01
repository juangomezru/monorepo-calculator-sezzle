# Integration hand-off

## Backend
- Folder: `backend`
- Run: `go run ./cmd/api` (port 8080); build: `go build ./...`; health: `GET /health`
- Layout: `cmd/api` (wiring), `internal/calculator` (domain, errors, operation registry), `internal/httpapi` (transport), `internal/config` (environment)
- Mutation testing: `.\scripts\mutation.ps1` (Windows) or `./scripts/mutation.sh` (Linux/macOS)

## Frontend
- Folder: `frontend`
- Install: `npm ci`; build: `npm run build`; dev: `npm run dev`
- API seam: `src/api.ts` (`calculate` calls live REST endpoint)
- Calculator behavior: `src/calculator.ts` (pure state machine and expression formatting)
- Orchestration: `src/hooks/useCalculator.ts` (state, API calls, calculation trail, action dispatch)
- Keyboard: `src/hooks/useKeyboardInput.ts` (global shortcuts)
- Configuration: `src/operations.ts` (operation metadata) and `src/keypad.ts` (keypad layout and shortcuts)
- Presentation: `src/components/` (`CalculatorDisplay`, `CalculationTrail`, `Keypad`, `CalculatorKey`, `OperationGuide`); `src/App.tsx` composes the layout
- Calculation trail: session-only list of completed `expression = result` steps with `Clear history`; not persisted and not part of the API
- Tests: `tests/` (`App.test.tsx`, `api.test.ts`, `calculator.test.ts`, `keypad.test.ts`) with shared setup in `tests/setup.ts`; Vitest and `tsconfig.app.json` include that folder
- Mutation testing: `npm run test:mutation`
- No mock files or datasets are present.

## API routes
- `GET /health`
- `POST /api/v1/calculate` with operation, operandA, optional operandB

## Database
- None (stateless calculator); no migrations or seed data required.

## Shared types and services
- No shared package; frontend owns the operation union.
- Services: backend (Essential), frontend (Essential).
