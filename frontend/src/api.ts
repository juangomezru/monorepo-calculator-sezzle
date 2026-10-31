import type { Operation } from './operations';

export type { Operation } from './operations';
export { labels } from './operations';

type CalculateResponse = {
  result?: number;
  error?: { code?: string; message?: string };
};

export async function calculate(operation: Operation, operandA: number, operandB?: number): Promise<number> {
  const response = await fetch('/api/v1/calculate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ operation, operandA, operandB: operandB ?? null }),
  });

  let data: CalculateResponse | null = null;
  try {
    data = (await response.json()) as CalculateResponse;
  } catch {
    // A malformed or empty body is treated as a missing payload.
  }

  if (!response.ok) {
    throw new Error(data?.error?.message || 'The calculation could not be completed.');
  }
  if (typeof data?.result !== 'number' || !Number.isFinite(data.result)) {
    throw new Error('The calculator service returned an invalid response.');
  }
  return data.result;
}
