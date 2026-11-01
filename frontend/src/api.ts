import type { Operation } from './operations';

export type { Operation } from './operations';
export { labels } from './operations';

type CalculateResponse = {
  result?: number;
  error?: { code?: string; message?: string };
};

export type CalculateOptions = {
  signal?: AbortSignal;
  timeoutMs?: number;
  baseUrl?: string;
  fetchImpl?: typeof fetch;
};

function joinUrl(baseUrl: string, path: string): string {
  return `${baseUrl.replace(/\/$/, '')}${path}`;
}

export async function calculate(
  operation: Operation,
  operandA: number,
  operandB?: number,
  options: CalculateOptions = {},
): Promise<number> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort('timeout'), options.timeoutMs ?? 10_000);
  const signal = options.signal;
  const abort = () => controller.abort(signal?.reason);
  if (signal?.aborted) {
    controller.abort(signal.reason);
  } else {
    signal?.addEventListener('abort', abort, { once: true });
  }

  let response: Response;
  let data: CalculateResponse | null = null;
  try {
    if (signal?.aborted) {
      throw signal.reason ?? new DOMException('The request was aborted.', 'AbortError');
    }
    response = await (options.fetchImpl ?? fetch)(joinUrl(options.baseUrl ?? '', '/api/v1/calculate'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ operation, operandA, operandB: operandB ?? null }),
      signal: controller.signal,
    });
    try {
      data = (await response.json()) as CalculateResponse;
    } catch (error) {
      if (controller.signal.aborted) throw error;
      data = null;
    }
  } catch (error) {
    if (controller.signal.reason === 'timeout') {
      throw new Error('The calculator service timed out.');
    }
    throw error instanceof Error ? error : new Error('Unable to reach the calculator service.');
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener('abort', abort);
  }

  if (!response.ok) {
    throw new Error(
      data?.error?.message || `The calculation could not be completed (HTTP ${response.status}).`,
    );
  }
  if (typeof data?.result !== 'number' || !Number.isFinite(data.result)) {
    throw new Error('The calculator service returned an invalid response.');
  }
  return data.result;
}
