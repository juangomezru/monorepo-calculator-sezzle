import { expressionLabel, formatNumber, type CalculatorState } from '../calculator';
import { labels } from '../operations';
import { CalculationTrail } from './CalculationTrail';

type CalculatorDisplayProps = {
  state: CalculatorState;
  loading: boolean;
  trail: string;
};

export function CalculatorDisplay({ state, loading, trail }: CalculatorDisplayProps) {
  const caption = loading
    ? 'Calculating…'
    : state.pendingOperation
      ? labels[state.pendingOperation]
      : 'Stateless API';

  return (
    <section
      className="display"
      aria-label="Calculator screen"
      aria-live="polite"
      aria-busy={loading}
    >
      <CalculationTrail trail={trail} />
      <span className="display-expression">{expressionLabel(state)}</span>
      <output className="display-value" aria-label="Calculator display">
        {state.error ? 'Error' : state.justEvaluated ? formatNumber(Number(state.entry)) : state.entry}
      </output>
      <span className="display-caption">{caption}</span>
    </section>
  );
}
