export type Operation =
  | 'add'
  | 'subtract'
  | 'multiply'
  | 'divide'
  | 'power'
  | 'percentage'
  | 'sqrt';

export type BinaryOperation = Exclude<Operation, 'sqrt'>;

export type OperationDefinition = {
  id: Operation;
  label: string;
  keyLabel: string;
  symbol: string;
};

/**
 * Single source of truth for operation names and display metadata. Adding an
 * operation starts here (plus the backend registry and a keypad key).
 */
export const operations: readonly OperationDefinition[] = [
  { id: 'add', label: 'Addition', keyLabel: 'Add', symbol: '+' },
  { id: 'subtract', label: 'Subtraction', keyLabel: 'Subtract', symbol: '−' },
  { id: 'multiply', label: 'Multiplication', keyLabel: 'Multiply', symbol: '×' },
  { id: 'divide', label: 'Division', keyLabel: 'Divide', symbol: '÷' },
  { id: 'power', label: 'Power', keyLabel: 'Power', symbol: 'xʸ' },
  { id: 'sqrt', label: 'Square root', keyLabel: 'Square root', symbol: '√' },
  { id: 'percentage', label: 'Percentage', keyLabel: 'Percentage', symbol: '%' },
];

export const operationById = Object.fromEntries(
  operations.map((operation) => [operation.id, operation]),
) as Record<Operation, OperationDefinition>;

export const labels = Object.fromEntries(
  operations.map((operation) => [operation.id, operation.label]),
) as Record<Operation, string>;

export const operationSymbols = Object.fromEntries(
  operations.map((operation) => [operation.id, operation.symbol]),
) as Record<Operation, string>;
