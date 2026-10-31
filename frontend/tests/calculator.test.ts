import { describe, expect, it } from 'vitest';
import {
  MAX_ENTRY_LENGTH,
  applyChainedResult,
  applyResult,
  applyUnaryResult,
  backspace,
  clearCalculator,
  createInitialState,
  expressionLabel,
  formatExpression,
  formatNumber,
  inputDecimal,
  inputDigit,
  operationSymbols,
  selectOperation,
  toggleSign,
  withError,
  type CalculatorState,
} from '../src/calculator';

function enter(digits: string, state: CalculatorState = createInitialState()): CalculatorState {
  return [...digits].reduce((current, digit) => inputDigit(current, digit), state);
}

describe('formatNumber', () => {
  it('rounds floating point noise for display', () => {
    expect(formatNumber(0.30000000000000004)).toBe('0.3');
    expect(formatNumber(1.2345678901234567)).toBe('1.23456789012');
  });

  it('renders negative zero as zero', () => {
    expect(formatNumber(-0)).toBe('0');
  });

  it('renders non-finite values as Error', () => {
    expect(formatNumber(Number.POSITIVE_INFINITY)).toBe('Error');
    expect(formatNumber(Number.NaN)).toBe('Error');
  });

  it('keeps very large numbers compact', () => {
    expect(formatNumber(1e21)).toBe('1e+21');
  });
});

describe('formatExpression', () => {
  it('formats binary operations', () => {
    expect(formatExpression({ operation: 'add', operandA: 2, operandB: 3 })).toBe('2 + 3');
    expect(formatExpression({ operation: 'power', operandA: 2, operandB: 3 })).toBe('2 xʸ 3');
  });

  it('formats percentage and square-root expressions', () => {
    expect(formatExpression({ operation: 'percentage', operandA: 25, operandB: 20 })).toBe(
      '25% of 20',
    );
    expect(formatExpression({ operation: 'sqrt', operandA: 16 })).toBe('√16');
  });
});

describe('entry helpers', () => {
  it('starts with a replaceable zero entry and no pending work', () => {
    expect(createInitialState()).toEqual({
      entry: '0',
      storedValue: null,
      pendingOperation: null,
      replaceEntry: true,
      justEvaluated: false,
      error: '',
    });
  });

  it('replaces the initial zero with the first digit', () => {
    expect(inputDigit(createInitialState(), '7')).toMatchObject({
      entry: '7',
      replaceEntry: false,
      justEvaluated: false,
    });
  });

  it('appends digits and keeps repeated zeros at zero', () => {
    expect(enter('123').entry).toBe('123');
    expect(enter('000').entry).toBe('0');
    expect(inputDigit(enter('1'), '2')).toMatchObject({
      entry: '12',
      replaceEntry: false,
      justEvaluated: false,
    });
  });

  it('ignores non-digit input', () => {
    const state = createInitialState();
    expect(inputDigit(state, 'a')).toBe(state);
    expect(inputDigit(state, '12')).toBe(state);
  });

  it('caps the number of entered digits', () => {
    const state = enter('1234567890123456');
    expect(state.entry).toHaveLength(MAX_ENTRY_LENGTH);
    expect(inputDigit(state, '7').entry).toHaveLength(MAX_ENTRY_LENGTH);
  });

  it('does not count the sign or decimal point toward the digit limit', () => {
    const negative = toggleSign(enter('123456789012345'));
    expect(inputDigit(negative, '6').entry).toBe('-1234567890123456');

    const decimal = inputDecimal(enter('123456789012345'));
    expect(inputDigit(decimal, '6').entry).toBe('123456789012345.6');
  });

  it('starts a decimal entry at zero and only allows one decimal point', () => {
    expect(inputDecimal(createInitialState())).toMatchObject({
      entry: '0.',
      replaceEntry: false,
      justEvaluated: false,
    });
    expect(inputDecimal(enter('12'))).toMatchObject({ entry: '12.', justEvaluated: false });
    expect(inputDecimal(inputDecimal(enter('12'))).entry).toBe('12.');
  });

  it('starts a new entry after a result', () => {
    const state = applyResult(createInitialState(), 5);
    expect(inputDecimal(state)).toMatchObject({
      entry: '0.',
      replaceEntry: false,
      justEvaluated: false,
    });
    expect(inputDigit(state, '8')).toMatchObject({
      entry: '8',
      replaceEntry: false,
      justEvaluated: false,
    });
  });

  it('toggles the sign of the current entry', () => {
    expect(toggleSign(enter('12'))).toMatchObject({ entry: '-12', justEvaluated: false });
    expect(toggleSign(toggleSign(enter('12')))).toMatchObject({ entry: '12', justEvaluated: false });
    expect(toggleSign(createInitialState())).toMatchObject({ entry: '0', justEvaluated: false });
    expect(toggleSign(inputDecimal(createInitialState()))).toMatchObject({
      entry: '-0.',
      justEvaluated: false,
    });
  });

  it('removes the last character with backspace', () => {
    expect(backspace(enter('123'))).toMatchObject({
      entry: '12',
      replaceEntry: false,
      justEvaluated: false,
    });
    expect(backspace(enter('1'))).toMatchObject({ entry: '0', replaceEntry: true });
    expect(backspace(applyResult(createInitialState(), 123)).entry).toBe('0');
    expect(backspace(selectOperation(enter('12'), 'add')).entry).toBe('0');
    expect(backspace(toggleSign(enter('12'))).entry).toBe('-1');
    expect(backspace(toggleSign(enter('1'))).entry).toBe('0');
    expect(backspace(applyResult(createInitialState(), 5))).toMatchObject({
      entry: '0',
      replaceEntry: true,
      justEvaluated: false,
    });
  });

  it('marks a zero entry for replacement but keeps longer entries editable', () => {
    expect(backspace(enter('1')).replaceEntry).toBe(true);
    expect(backspace(enter('12')).replaceEntry).toBe(false);
  });

  it('clears to a fresh state', () => {
    expect(clearCalculator()).toEqual(createInitialState());
  });
});

describe('operations', () => {
  it('stores the left operand and pending operation', () => {
    expect(selectOperation(enter('12'), 'multiply')).toMatchObject({
      storedValue: 12,
      pendingOperation: 'multiply',
      replaceEntry: true,
      justEvaluated: false,
      error: '',
    });
  });

  it('resets an errored calculator before selecting an operation', () => {
    expect(selectOperation(withError(enter('12'), 'boom'), 'add')).toMatchObject({
      entry: '0',
      storedValue: 0,
      pendingOperation: 'add',
      replaceEntry: true,
      justEvaluated: false,
      error: '',
    });
  });

  it('ignores operations when the current entry is not finite', () => {
    const state = { ...createInitialState(), entry: 'Infinity' };
    expect(selectOperation(state, 'add')).toEqual(state);
  });

  it('applies a binary result and clears the pending operation', () => {
    expect(applyResult(selectOperation(enter('2'), 'add'), 5)).toMatchObject({
      entry: '5',
      storedValue: null,
      pendingOperation: null,
      justEvaluated: true,
      replaceEntry: true,
      error: '',
    });
  });

  it('chains a result into the next operation', () => {
    expect(applyChainedResult(enter('2'), 5, 'multiply')).toMatchObject({
      entry: '5',
      storedValue: 5,
      pendingOperation: 'multiply',
      justEvaluated: false,
      replaceEntry: true,
      error: '',
    });
  });

  it('keeps a pending operation when applying a unary result', () => {
    const pending = selectOperation(enter('9'), 'add');
    expect(applyUnaryResult(pending, 4)).toMatchObject({
      entry: '4',
      storedValue: 9,
      pendingOperation: 'add',
      replaceEntry: true,
      justEvaluated: true,
      error: '',
    });
  });

  it('records an error message without losing the current state', () => {
    expect(withError(enter('12'), 'nope')).toMatchObject({
      entry: '12',
      error: 'nope',
      replaceEntry: false,
    });
  });
});

describe('expressionLabel', () => {
  it('shows a ready state before any operation', () => {
    expect(expressionLabel(createInitialState())).toBe('Ready');
  });

  it('shows the stored value and operation symbol', () => {
    expect(expressionLabel(selectOperation(enter('12'), 'add'))).toBe('12 +');
    expect(expressionLabel(selectOperation(enter('25'), 'percentage'))).toBe('25 %');
    expect(expressionLabel({ ...createInitialState(), pendingOperation: 'divide' })).toBe('0 ÷');
  });

  it('shows an equals marker after evaluation', () => {
    expect(expressionLabel(applyResult(createInitialState(), 5))).toBe('=');
  });

  it('shows an error marker after a failure', () => {
    expect(expressionLabel(withError(createInitialState(), 'nope'))).toBe('Error');
  });

  it('defines a symbol for every operation', () => {
    expect(operationSymbols).toEqual({
      add: '+',
      subtract: '−',
      multiply: '×',
      divide: '÷',
      power: 'xʸ',
      percentage: '%',
      sqrt: '√',
    });
  });
});
