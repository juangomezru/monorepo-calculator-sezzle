import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FluentProvider, webLightTheme } from '@fluentui/react-components';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../src/App';
import { calculate } from '../src/api';

vi.mock('../src/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/api')>();
  return { ...actual, calculate: vi.fn() };
});

const mockedCalculate = vi.mocked(calculate);
type User = ReturnType<typeof userEvent.setup>;

function renderApp() {
  return render(
    <FluentProvider theme={webLightTheme}>
      <App />
    </FluentProvider>,
  );
}

function key(name: string) {
  return screen.getByRole('button', { name });
}

function display() {
  return screen.getByLabelText('Calculator display').textContent;
}

async function clickDigits(user: User, digits: string) {
  for (const digit of digits) {
    await user.click(key(digit));
  }
}

async function enterBinary(user: User, left: string, operation: string, right: string) {
  await clickDigits(user, left);
  await user.click(key(operation));
  await clickDigits(user, right);
  await user.click(key('Equals'));
}

beforeEach(() => {
  mockedCalculate.mockReset();
});

describe('calculator shell', () => {
  it('renders the physical keypad and display without instructions', () => {
    renderApp();

    expect(screen.getByText('Calculator')).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Calculator keypad' })).toBeInTheDocument();
    expect(screen.getByLabelText('Calculator display')).toHaveTextContent('0');
    expect(screen.queryByText('Supported operations')).not.toBeInTheDocument();

    for (const name of [
      'Clear',
      'Backspace',
      'Square root',
      'Divide',
      'Power',
      'Percentage',
      'Toggle sign',
      'Multiply',
      'Subtract',
      'Add',
      'Equals',
      'Decimal point',
      '0',
      '1',
      '2',
      '3',
      '4',
      '5',
      '6',
      '7',
      '8',
      '9',
    ]) {
      expect(key(name)).toBeInTheDocument();
    }
  });

  it('builds numbers from the keypad and clears them', async () => {
    const user = userEvent.setup();
    renderApp();

    await clickDigits(user, '0123456789');
    expect(display()).toBe('123456789');

    await user.click(key('Clear'));
    expect(display()).toBe('0');
  });

  it('supports decimals, sign changes, and backspace', async () => {
    const user = userEvent.setup();
    renderApp();

    await user.click(key('1'));
    await user.click(key('Decimal point'));
    await user.click(key('5'));
    expect(display()).toBe('1.5');

    await user.click(key('Toggle sign'));
    expect(display()).toBe('-1.5');

    await user.click(key('Backspace'));
    expect(display()).toBe('-1.');

    await user.click(key('Backspace'));
    await user.click(key('Backspace'));
    expect(display()).toBe('0');
  });
});

describe('binary operations', () => {
  const cases = [
    { label: 'Add', operation: 'add', left: '12', right: '3', result: 15 },
    { label: 'Subtract', operation: 'subtract', left: '12', right: '3', result: 9 },
    { label: 'Multiply', operation: 'multiply', left: '12', right: '3', result: 36 },
    { label: 'Divide', operation: 'divide', left: '12', right: '3', result: 4 },
    { label: 'Power', operation: 'power', left: '2', right: '3', result: 8 },
    { label: 'Percentage', operation: 'percentage', left: '25', right: '20', result: 5 },
  ];

  for (const testCase of cases) {
    it(`sends the ${testCase.operation} operation to the API`, async () => {
      const user = userEvent.setup();
      mockedCalculate.mockResolvedValue(testCase.result);
      renderApp();

      await enterBinary(user, testCase.left, testCase.label, testCase.right);

      await waitFor(() =>
        expect(mockedCalculate).toHaveBeenCalledWith(
          testCase.operation,
          Number(testCase.left),
          Number(testCase.right),
        ),
      );
      await waitFor(() => expect(display()).toBe(String(testCase.result)));
    });
  }

  it('shows the pending expression and operation name while entering the second operand', async () => {
    const user = userEvent.setup();
    renderApp();

    await clickDigits(user, '12');
    await user.click(key('Add'));

    expect(screen.getByText('12 +')).toBeInTheDocument();
    expect(screen.getByText('Addition', { selector: '.display-caption' })).toBeInTheDocument();
    expect(display()).toBe('12');
  });

  it('does nothing when equals is pressed without a pending operation', async () => {
    renderApp();

    fireEvent.keyDown(window, { key: '5' });
    fireEvent.keyDown(window, { key: 'Enter' });

    expect(mockedCalculate).not.toHaveBeenCalled();
    expect(display()).toBe('5');
  });

  it('chains operations and uses the intermediate result as the next operand', async () => {
    const user = userEvent.setup();
    mockedCalculate.mockImplementation(async (operation, a, b) =>
      operation === 'add' ? a + (b ?? 0) : 0,
    );
    renderApp();

    await clickDigits(user, '2');
    await user.click(key('Add'));
    await clickDigits(user, '3');
    await user.click(key('Add'));

    await waitFor(() => expect(mockedCalculate).toHaveBeenNthCalledWith(1, 'add', 2, 3));
    await waitFor(() => expect(display()).toBe('5'));
    expect(screen.getByText('5 +')).toBeInTheDocument();

    await clickDigits(user, '4');
    await user.click(key('Equals'));

    await waitFor(() => expect(mockedCalculate).toHaveBeenNthCalledWith(2, 'add', 5, 4));
    await waitFor(() => expect(display()).toBe('9'));
  });
});

describe('square root', () => {
  it('sends the current entry to the API without a second operand', async () => {
    const user = userEvent.setup();
    mockedCalculate.mockResolvedValue(3);
    renderApp();

    await clickDigits(user, '9');
    await user.click(key('Square root'));

    await waitFor(() => expect(mockedCalculate).toHaveBeenCalledWith('sqrt', 9, undefined));
    await waitFor(() => expect(display()).toBe('3'));
  });

  it('keeps a pending operation so the result can be used as an operand', async () => {
    const user = userEvent.setup();
    mockedCalculate.mockImplementation(async (operation, a, b) =>
      operation === 'sqrt' ? Math.sqrt(a) : a + (b ?? 0),
    );
    renderApp();

    await clickDigits(user, '9');
    await user.click(key('Add'));
    await clickDigits(user, '16');
    await user.click(key('Square root'));

    await waitFor(() => expect(mockedCalculate).toHaveBeenNthCalledWith(1, 'sqrt', 16, undefined));
    await waitFor(() => expect(display()).toBe('4'));

    await user.click(key('Equals'));
    await waitFor(() => expect(mockedCalculate).toHaveBeenNthCalledWith(2, 'add', 9, 4));
    await waitFor(() => expect(display()).toBe('13'));
  });
});

describe('calculation trail', () => {
  it('shows the completed expression and result', async () => {
    const user = userEvent.setup();
    mockedCalculate.mockResolvedValue(5);
    renderApp();

    await enterBinary(user, '2', 'Add', '3');

    await waitFor(() => expect(screen.getByText('2 + 3')).toBeInTheDocument());
    const trail = screen.getByLabelText('Calculation trail');
    expect(screen.getByLabelText('Calculator screen')).toContainElement(trail);
    expect(trail).toHaveTextContent('2 + 3');
  });

  it('keeps one accumulated expression for chained calculations', async () => {
    const user = userEvent.setup();
    mockedCalculate.mockImplementation(async (operation, a, b) =>
      operation === 'add' ? a + (b ?? 0) : 0,
    );
    renderApp();

    await clickDigits(user, '2');
    await user.click(key('Add'));
    await clickDigits(user, '3');
    await user.click(key('Add'));

    await waitFor(() => expect(screen.getByText('2 + 3')).toBeInTheDocument());

    await clickDigits(user, '4');
    await user.click(key('Equals'));

    await waitFor(() => expect(screen.getByText('(2 + 3) + 4')).toBeInTheDocument());
    expect(screen.getAllByLabelText('Calculation trail')).toHaveLength(1);
  });

  it('records square root and percentage calculations', async () => {
    const user = userEvent.setup();
    mockedCalculate.mockImplementation(async (operation, a, b) => {
      if (operation === 'sqrt') return Math.sqrt(a);
      if (operation === 'percentage') return (a * (b ?? 0)) / 100;
      return 0;
    });
    renderApp();

    await clickDigits(user, '16');
    await user.click(key('Square root'));
    await waitFor(() => expect(screen.getByText('√16')).toBeInTheDocument());

    await user.click(key('Clear'));
    await clickDigits(user, '25');
    await user.click(key('Percentage'));
    await clickDigits(user, '20');
    await user.click(key('Equals'));

    await waitFor(() => expect(screen.getByText('25 % 20')).toBeInTheDocument());
    expect(screen.getAllByLabelText('Calculation trail')).toHaveLength(1);
  });

  it('clears the trail and display with C', async () => {
    const user = userEvent.setup();
    mockedCalculate.mockResolvedValue(5);
    renderApp();

    await enterBinary(user, '2', 'Add', '3');
    await waitFor(() => expect(screen.getByText('2 + 3')).toBeInTheDocument());

    await user.click(key('Clear'));

    expect(screen.queryByLabelText('Calculation trail')).not.toBeInTheDocument();
    expect(display()).toBe('0');
  });

  it('does not record failed calculations', async () => {
    const user = userEvent.setup();
    mockedCalculate.mockRejectedValue(new Error('cannot divide by zero'));
    renderApp();

    await enterBinary(user, '1', 'Divide', '0');
    await waitFor(() => expect(screen.getByText('cannot divide by zero')).toBeInTheDocument());

    expect(screen.queryByLabelText('Calculation trail')).not.toBeInTheDocument();
  });
});

describe('errors and loading', () => {
  it('shows API errors and recovers on the next digit', async () => {
    const user = userEvent.setup();
    mockedCalculate.mockRejectedValue(new Error('cannot divide by zero'));
    renderApp();

    await enterBinary(user, '1', 'Divide', '0');

    await waitFor(() => expect(screen.getByText('cannot divide by zero')).toBeInTheDocument());
    expect(display()).toBe('Error');

    await user.click(key('5'));
    expect(display()).toBe('5');
    expect(screen.queryByText('cannot divide by zero')).not.toBeInTheDocument();
  });

  it('falls back to a friendly message for unknown failures', async () => {
    const user = userEvent.setup();
    mockedCalculate.mockRejectedValue('offline');
    renderApp();

    await enterBinary(user, '1', 'Add', '2');

    await waitFor(() =>
      expect(screen.getByText('Unable to reach the calculator service.')).toBeInTheDocument(),
    );
  });

  it('restarts cleanly when an operator is pressed after a failure', async () => {
    const user = userEvent.setup();
    mockedCalculate.mockRejectedValue(new Error('cannot divide by zero'));
    renderApp();

    await enterBinary(user, '1', 'Divide', '0');
    await waitFor(() => expect(screen.getByText('cannot divide by zero')).toBeInTheDocument());

    await user.click(key('Add'));
    expect(screen.queryByText('cannot divide by zero')).not.toBeInTheDocument();
    expect(screen.getByText('0 +')).toBeInTheDocument();
    expect(display()).toBe('0');
  });

  it('clears the failure when square root is pressed after an error', async () => {
    const user = userEvent.setup();
    mockedCalculate.mockRejectedValue(new Error('cannot divide by zero'));
    renderApp();

    await enterBinary(user, '1', 'Divide', '0');
    await waitFor(() => expect(screen.getByText('cannot divide by zero')).toBeInTheDocument());

    mockedCalculate.mockResolvedValue(4);
    await user.click(key('Square root'));

    await waitFor(() => expect(display()).toBe('0'));
    expect(screen.queryByText('cannot divide by zero')).not.toBeInTheDocument();
  });

  it('disables the keypad while a calculation is pending', async () => {
    const user = userEvent.setup();
    let resolveCalculation: (value: number) => void = () => {};
    mockedCalculate.mockReturnValue(
      new Promise<number>((resolve) => {
        resolveCalculation = resolve;
      }),
    );
    renderApp();

    await clickDigits(user, '1');
    await user.click(key('Add'));
    await clickDigits(user, '2');
    await user.click(key('Equals'));

    await waitFor(() => expect(mockedCalculate).toHaveBeenCalledTimes(1));
    expect(key('Equals')).toBeDisabled();
    expect(key('7')).toBeDisabled();
    expect(screen.getByText('Calculating…')).toBeInTheDocument();

    fireEvent.keyDown(window, { key: '7' });
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(display()).toBe('2');

    resolveCalculation(3);

    await waitFor(() => expect(display()).toBe('3'));
    expect(key('7')).toBeEnabled();
  });
});

describe('keyboard support', () => {
  it('accepts digits, operators, and Enter', async () => {
    mockedCalculate.mockResolvedValue(9);
    renderApp();

    fireEvent.keyDown(window, { key: '7' });
    fireEvent.keyDown(window, { key: '+' });
    fireEvent.keyDown(window, { key: '2' });
    fireEvent.keyDown(window, { key: 'Enter' });

    await waitFor(() => expect(mockedCalculate).toHaveBeenCalledWith('add', 7, 2));
    await waitFor(() => expect(display()).toBe('9'));
  });

  it.each([
    ['-', 'subtract'],
    ['*', 'multiply'],
    ['x', 'multiply'],
    ['X', 'multiply'],
    ['/', 'divide'],
    ['^', 'power'],
    ['%', 'percentage'],
  ])('maps the %s key to %s', async (keyName, operation) => {
    mockedCalculate.mockResolvedValue(4);
    renderApp();

    fireEvent.keyDown(window, { key: '8' });
    fireEvent.keyDown(window, { key: keyName });
    fireEvent.keyDown(window, { key: '2' });
    fireEvent.keyDown(window, { key: 'Enter' });

    await waitFor(() => expect(mockedCalculate).toHaveBeenCalledWith(operation, 8, 2));
  });

  it('accepts a comma as a decimal separator and C as clear', () => {
    renderApp();

    fireEvent.keyDown(window, { key: '1' });
    fireEvent.keyDown(window, { key: ',' });
    fireEvent.keyDown(window, { key: '2' });
    expect(display()).toBe('1.2');

    fireEvent.keyDown(window, { key: 'c' });
    expect(display()).toBe('0');
  });

  it('does not submit when Enter is pressed while a control is focused', () => {
    renderApp();

    fireEvent.keyDown(window, { key: '7' });
    fireEvent.keyDown(key('Add'), { key: 'Enter' });

    expect(mockedCalculate).not.toHaveBeenCalled();
    expect(display()).toBe('7');
  });

  it('supports square root, backspace, and clear shortcuts', async () => {
    mockedCalculate.mockResolvedValue(4);
    renderApp();

    fireEvent.keyDown(window, { key: '1' });
    fireEvent.keyDown(window, { key: '6' });
    fireEvent.keyDown(window, { key: 'r' });

    await waitFor(() => expect(mockedCalculate).toHaveBeenCalledWith('sqrt', 16, undefined));
    await waitFor(() => expect(display()).toBe('4'));

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(display()).toBe('0');

    fireEvent.keyDown(window, { key: '1' });
    fireEvent.keyDown(window, { key: '2' });
    fireEvent.keyDown(window, { key: 'Backspace' });
    expect(display()).toBe('1');
  });
});
