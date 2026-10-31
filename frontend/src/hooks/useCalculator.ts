import { useState } from 'react';
import { calculate } from '../api';
import {
  applyChainedResult,
  applyResult,
  applyUnaryResult,
  backspace,
  clearCalculator,
  createInitialState,
  formatNumber,
  inputDecimal,
  inputDigit,
  selectOperation,
  toggleSign,
  withError,
  type CalculationInput,
  type CalculatorState,
} from '../calculator';
import { operationSymbols, type BinaryOperation } from '../operations';
import type { CalculatorAction } from '../keypad';

export type CalculatorController = {
  state: CalculatorState;
  trail: string;
  loading: boolean;
  perform: (action: CalculatorAction) => void;
};

type ApplyResult = (state: CalculatorState, result: number) => CalculatorState;

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unable to reach the calculator service.';
}

/**
 * Owns all calculator state and side effects. The UI only dispatches actions;
 * keeping this orchestration out of App.tsx makes it easy to test and extend.
 */
export function useCalculator(): CalculatorController {
  const [state, setState] = useState<CalculatorState>(createInitialState);
  const [trail, setTrail] = useState('');
  const [loading, setLoading] = useState(false);

  async function runCalculation(
    input: CalculationInput,
    apply: ApplyResult,
    expression: string,
  ) {
    setLoading(true);
    try {
      const result = await calculate(
        input.operation,
        input.operandA,
        input.operation === 'sqrt' ? undefined : input.operandB,
      );
      setState((current) => apply(current, result));
      setTrail(expression);
    } catch (error) {
      setState((current) => withError(current, errorMessage(error)));
    } finally {
      setLoading(false);
    }
  }

  function selectOperationFor(operation: BinaryOperation) {
    if (state.error) {
      setState(selectOperation(createInitialState(), operation));
      return;
    }
    if (
      state.pendingOperation !== null &&
      state.storedValue !== null &&
      !state.replaceEntry
    ) {
      void runCalculation(
        {
          operation: state.pendingOperation,
          operandA: state.storedValue,
          operandB: Number(state.entry),
        },
        (current, result) => applyChainedResult(current, result, operation),
        trail
          ? `(${trail}) ${operationSymbols[state.pendingOperation]} ${formatNumber(Number(state.entry))}`
          : `${formatNumber(state.storedValue)} ${operationSymbols[state.pendingOperation]} ${formatNumber(Number(state.entry))}`,
      );
      return;
    }
    setState((current) => selectOperation(current, operation));
  }

  function pressEquals() {
    if (state.error) return;
    if (state.pendingOperation === null || state.storedValue === null) return;
    void runCalculation(
      {
        operation: state.pendingOperation,
        operandA: state.storedValue,
        operandB: Number(state.entry),
      },
      applyResult,
      trail
        ? `(${trail}) ${operationSymbols[state.pendingOperation]} ${formatNumber(Number(state.entry))}`
        : `${formatNumber(state.storedValue)} ${operationSymbols[state.pendingOperation]} ${formatNumber(Number(state.entry))}`,
    );
  }

  function pressSquareRoot() {
    if (state.error) {
      setState(createInitialState());
      return;
    }
    const operand = Number(state.entry);
    if (!Number.isFinite(operand)) return;
    void runCalculation(
      { operation: 'sqrt', operandA: operand },
      applyUnaryResult,
      `${trail ? `(${trail}) ` : ''}√${formatNumber(operand)}`,
    );
  }

  function perform(action: CalculatorAction) {
    if (loading) return;
    switch (action.type) {
      case 'input-digit':
        setState((current) => inputDigit(current, action.digit));
        return;
      case 'input-decimal':
        setState(inputDecimal);
        return;
      case 'toggle-sign':
        setState(toggleSign);
        return;
      case 'backspace':
        setState(backspace);
        return;
      case 'clear':
        setState(clearCalculator());
        setTrail('');
        return;
      case 'select-operation':
        selectOperationFor(action.operation);
        return;
      case 'equals':
        pressEquals();
        return;
      case 'square-root':
        pressSquareRoot();
        return;
    }
  }

  return { state, trail, loading, perform };
}
