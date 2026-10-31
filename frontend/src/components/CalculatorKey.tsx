import { Button } from '@fluentui/react-components';

type CalculatorKeyProps = {
  label: string;
  ariaLabel: string;
  onClick: () => void;
  className?: string;
  appearance?: 'primary' | 'secondary';
  disabled?: boolean;
};

export function CalculatorKey({
  label,
  ariaLabel,
  onClick,
  className = '',
  appearance,
  disabled,
}: CalculatorKeyProps) {
  return (
    <Button
      type="button"
      aria-label={ariaLabel}
      appearance={appearance}
      className={`calc-key ${className}`.trim()}
      onClick={onClick}
      disabled={disabled}
    >
      {label}
    </Button>
  );
}
