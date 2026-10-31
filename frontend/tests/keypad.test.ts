import { describe, expect, it } from 'vitest';
import { keypadKeys, keyboardAction } from '../src/keypad';

describe('keypad layout', () => {
  it('defines one key for every digit', () => {
    const digits = keypadKeys
      .flatMap((key) => (key.action.type === 'input-digit' ? [key.action.digit] : []))
      .sort();

    expect(digits).toEqual(['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']);
    expect(new Set(keypadKeys.map((key) => key.id)).size).toBe(keypadKeys.length);
  });
});

describe('keyboardAction', () => {
  it('maps shortcuts to calculator actions', () => {
    expect(keyboardAction('7', false)).toEqual({ type: 'input-digit', digit: '7' });
    expect(keyboardAction(',', false)).toEqual({ type: 'input-decimal' });
    expect(keyboardAction('+', false)).toEqual({
      type: 'select-operation',
      operation: 'add',
    });
    expect(keyboardAction('x', false)).toEqual({
      type: 'select-operation',
      operation: 'multiply',
    });
    expect(keyboardAction('r', false)).toEqual({ type: 'square-root' });
    expect(keyboardAction('Enter', false)).toEqual({ type: 'equals' });
    expect(keyboardAction('Backspace', false)).toEqual({ type: 'backspace' });
    expect(keyboardAction('Escape', false)).toEqual({ type: 'clear' });
  });

  it('ignores unknown keys and submission from focused controls', () => {
    expect(keyboardAction('z', false)).toBeNull();
    expect(keyboardAction('Enter', true)).toBeNull();
    expect(keyboardAction('=', true)).toBeNull();
  });
});
