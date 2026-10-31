import { operationById } from './operations';
import type { BinaryOperation } from './operations';

export type CalculatorAction =
  | { type: 'input-digit'; digit: string }
  | { type: 'input-decimal' }
  | { type: 'toggle-sign' }
  | { type: 'backspace' }
  | { type: 'clear' }
  | { type: 'select-operation'; operation: BinaryOperation }
  | { type: 'equals' }
  | { type: 'square-root' };

export type KeypadKey = {
  id: string;
  label: string;
  ariaLabel: string;
  className: string;
  appearance?: 'primary' | 'secondary';
  action: CalculatorAction;
  keyboard?: readonly string[];
};

function operationKey(
  operation: BinaryOperation,
  keyboard: readonly string[],
  className = 'key-operator',
): KeypadKey {
  const definition = operationById[operation];
  return {
    id: `operation-${operation}`,
    label: definition.symbol,
    ariaLabel: definition.keyLabel,
    className,
    action: { type: 'select-operation', operation },
    keyboard,
  };
}

function digitKey(digit: string, className = 'key-digit'): KeypadKey {
  return {
    id: `digit-${digit}`,
    label: digit,
    ariaLabel: digit,
    className,
    action: { type: 'input-digit', digit },
    keyboard: [digit],
  };
}

/**
 * The keypad is data-driven so a new operation only needs a new entry here and
 * a matching backend operation. Keyboard shortcuts live with their key to keep
 * both input methods in sync.
 */
export const keypadKeys: readonly KeypadKey[] = [
  {
    id: 'clear',
    label: 'C',
    ariaLabel: 'Clear',
    className: 'key-function',
    action: { type: 'clear' },
    keyboard: ['Escape', 'c', 'C'],
  },
  {
    id: 'backspace',
    label: '⌫',
    ariaLabel: 'Backspace',
    className: 'key-function',
    action: { type: 'backspace' },
    keyboard: ['Backspace'],
  },
  {
    id: 'sqrt',
    label: operationById.sqrt.symbol,
    ariaLabel: operationById.sqrt.keyLabel,
    className: 'key-function',
    action: { type: 'square-root' },
    keyboard: ['r', 'R'],
  },
  operationKey('divide', ['/']),
  operationKey('power', ['^'], 'key-function'),
  operationKey('percentage', ['%'], 'key-function'),
  {
    id: 'sign',
    label: '±',
    ariaLabel: 'Toggle sign',
    className: 'key-function',
    action: { type: 'toggle-sign' },
  },
  operationKey('multiply', ['*', 'x', 'X']),
  digitKey('7'),
  digitKey('8'),
  digitKey('9'),
  operationKey('subtract', ['-']),
  digitKey('4'),
  digitKey('5'),
  digitKey('6'),
  operationKey('add', ['+']),
  digitKey('1'),
  digitKey('2'),
  digitKey('3'),
  {
    id: 'equals',
    label: '=',
    ariaLabel: 'Equals',
    className: 'key-equals',
    appearance: 'primary',
    action: { type: 'equals' },
    keyboard: ['Enter', '='],
  },
  digitKey('0', 'key-digit key-zero'),
  {
    id: 'decimal',
    label: '.',
    ariaLabel: 'Decimal point',
    className: 'key-digit key-decimal',
    action: { type: 'input-decimal' },
    keyboard: ['.', ','],
  },
];

const keyboardActions = new Map<string, CalculatorAction>();
for (const key of keypadKeys) {
  for (const shortcut of key.keyboard ?? []) {
    keyboardActions.set(shortcut, key.action);
  }
}

/**
 * Resolve a keyboard event key to a calculator action. Enter and equals are
 * ignored when a control is focused so native button activation still works.
 */
export function keyboardAction(key: string, targetIsControl: boolean): CalculatorAction | null {
  if (targetIsControl && (key === 'Enter' || key === '=')) return null;
  return keyboardActions.get(key) ?? null;
}
