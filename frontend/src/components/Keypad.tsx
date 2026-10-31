import { CalculatorKey } from './CalculatorKey';
import { keypadKeys } from '../keypad';
import type { CalculatorAction } from '../keypad';

type KeypadProps = {
  disabled: boolean;
  onAction: (action: CalculatorAction) => void;
};

export function Keypad({ disabled, onAction }: KeypadProps) {
  return (
    <div className="keypad" role="group" aria-label="Calculator keypad">
      {keypadKeys.map((key) => (
        <CalculatorKey
          key={key.id}
          label={key.label}
          ariaLabel={key.ariaLabel}
          className={key.className}
          appearance={key.appearance}
          disabled={disabled}
          onClick={() => onAction(key.action)}
        />
      ))}
    </div>
  );
}
