import { Card, MessageBar, Title3 } from '@fluentui/react-components';
import { CalculatorDisplay } from './components/CalculatorDisplay';
import { Keypad } from './components/Keypad';
import { useCalculator } from './hooks/useCalculator';
import { useKeyboardInput } from './hooks/useKeyboardInput';

export default function App() {
  const calculator = useCalculator();
  useKeyboardInput(calculator);

  return (
    <main className="shell">
      <header className="hero">
        <span className="eyebrow">SEZZLE</span>
        <Title3 as="h1">Calculator</Title3>
      </header>

      <div className="workspace">
        <Card className="calculator">
          <CalculatorDisplay
            state={calculator.state}
            loading={calculator.loading}
            trail={calculator.trail}
          />

          {calculator.state.error && (
            <MessageBar intent="error" className="calculator-error">
              {calculator.state.error}
            </MessageBar>
          )}

          <Keypad disabled={calculator.loading} onAction={calculator.perform} />
        </Card>
      </div>

      <footer>Stateless REST calculator · No data is stored</footer>
    </main>
  );
}
