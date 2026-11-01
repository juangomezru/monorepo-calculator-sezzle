import { operationSymbols } from './operations';
import type { BinaryOperation, Operation } from './operations';

export type { BinaryOperation, Operation } from './operations';
export { operationSymbols } from './operations';

export type CalculatorState = {
  entry: string;
  storedValue: number | null;
  pendingOperation: BinaryOperation | null;
  replaceEntry: boolean;
  justEvaluated: boolean;
  error: string;
};

/**
 * A completed calculation, expressed with the operands that were sent to the
 * API. Square root is the only unary operation.
 */
export type CalculationInput =
  | { operation: 'sqrt'; operandA: number }
  | { operation: BinaryOperation; operandA: number; operandB: number };

export const MAX_ENTRY_LENGTH = 16;

export function createInitialState(): CalculatorState {
  return {
    entry: '0',
    storedValue: null,
    pendingOperation: null,
    replaceEntry: true,
    justEvaluated: false,
    error: '',
  };
}

export function formatNumber(value: number): string {
  if (!Number.isFinite(value)) return 'Error';
  return String(Number(value.toPrecision(12)));
}

export function formatExpression(input: CalculationInput): string {
  const symbol = operationSymbols[input.operation];
  if (input.operation === 'sqrt') {
    return `${symbol}${formatNumber(input.operandA)}`;
  }
  if (input.operation === 'percentage') {
    return `${formatNumber(input.operandA)}${symbol} of ${formatNumber(input.operandB)}`;
  }
  return `${formatNumber(input.operandA)} ${symbol} ${formatNumber(input.operandB)}`;
}

function withoutError(state: CalculatorState): CalculatorState {
  return state.error ? createInitialState() : state;
}

export function inputDigit(state: CalculatorState, digit: string): CalculatorState {
  if (!/^\d$/.test(digit)) return state;
  const base = withoutError(state);
  if (base.replaceEntry) {
    return { ...base, entry: digit, replaceEntry: false, justEvaluated: false };
  }
  if (base.entry.replace(/[-.]/g, '').length >= MAX_ENTRY_LENGTH) return base;
  return {
    ...base,
    entry: base.entry === '0' ? digit : `${base.entry}${digit}`,
    justEvaluated: false,
  };
}

export function inputDecimal(state: CalculatorState): CalculatorState {
  const base = withoutError(state);
  if (base.replaceEntry) {
    return { ...base, entry: '0.', replaceEntry: false, justEvaluated: false };
  }
  if (base.entry.includes('.')) return base;
  return { ...base, entry: `${base.entry}.`, justEvaluated: false };
}

export function toggleSign(state: CalculatorState): CalculatorState {
  const base = withoutError(state);
  const isNegative = base.entry.startsWith('-');
  const magnitude = isNegative ? base.entry.slice(1) : base.entry;
  if (magnitude === '0') return { ...base, entry: '0', justEvaluated: false };
  return {
    ...base,
    entry: isNegative ? magnitude : `-${magnitude}`,
    justEvaluated: false,
  };
}

export function backspace(state: CalculatorState): CalculatorState {
  const base = withoutError(state);
  if (base.replaceEntry) {
    return { ...base, entry: '0', replaceEntry: true, justEvaluated: false };
  }
  const next =
    base.entry.length <= 1 || (base.entry.length === 2 && base.entry.startsWith('-'))
      ? '0'
      : base.entry.slice(0, -1);
  return {
    ...base,
    entry: next,
    replaceEntry: next === '0',
    justEvaluated: false,
  };
}

export function clearCalculator(): CalculatorState {
  return createInitialState();
}

export function selectOperation(state: CalculatorState, operation: BinaryOperation): CalculatorState {
  const base = withoutError(state);
  const value = Number(base.entry);
  if (!Number.isFinite(value)) return base;
  return {
    ...base,
    storedValue: value,
    pendingOperation: operation,
    replaceEntry: true,
    justEvaluated: false,
    error: '',
  };
}

export function applyResult(state: CalculatorState, result: number): CalculatorState {
  return {
    ...state,
    entry: String(result),
    storedValue: null,
    pendingOperation: null,
    replaceEntry: true,
    justEvaluated: true,
    error: '',
  };
}

export function applyChainedResult(
  state: CalculatorState,
  result: number,
  nextOperation: BinaryOperation,
): CalculatorState {
  return {
    ...state,
    entry: String(result),
    storedValue: result,
    pendingOperation: nextOperation,
    replaceEntry: true,
    justEvaluated: false,
    error: '',
  };
}

export function applyUnaryResult(state: CalculatorState, result: number): CalculatorState {
  return {
    ...state,
    entry: String(result),
    replaceEntry: true,
    justEvaluated: true,
    error: '',
  };
}

export function withError(state: CalculatorState, message: string): CalculatorState {
  return { ...state, error: message };
}

export function expressionLabel(state: CalculatorState): string {
  if (state.error) return 'Error';
  if (state.pendingOperation !== null) {
    const left = state.storedValue === null ? '0' : formatNumber(state.storedValue);
    return `${left} ${operationSymbols[state.pendingOperation]}`;
  }
  return state.justEvaluated ? '=' : 'Ready';
}
