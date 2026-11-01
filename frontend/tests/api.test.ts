import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { calculate, labels } from '../src/api';

const fetchMock = vi.fn();

function response(body: unknown, ok = true, status = 200): Response {
  return {
    ok,
    status,
    json: vi.fn().mockResolvedValue(body),
  } as unknown as Response;
}

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  fetchMock.mockReset();
  vi.unstubAllGlobals();
});

describe('calculate', () => {
  it('defines a human-readable label for every operation', () => {
    expect(labels).toEqual({
      add: 'Addition',
      subtract: 'Subtraction',
      multiply: 'Multiplication',
      divide: 'Division',
      power: 'Power',
      sqrt: 'Square root',
      percentage: 'Percentage',
    });
  });

  it('posts the operation and operands to the API', async () => {
    fetchMock.mockResolvedValue(response({ result: 5 }));

    await expect(calculate('add', 2, 3)).resolves.toBe(5);

    expect(fetchMock).toHaveBeenCalledWith('/api/v1/calculate', expect.objectContaining({
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ operation: 'add', operandA: 2, operandB: 3 }),
    }));
    expect(fetchMock.mock.calls[0][1]?.signal).toBeInstanceOf(AbortSignal);
  });

  it('sends a null second operand for unary operations', async () => {
    fetchMock.mockResolvedValue(response({ result: 3 }));

    await expect(calculate('sqrt', 9)).resolves.toBe(3);

    expect(fetchMock.mock.calls[0][1]?.body).toBe(
      JSON.stringify({ operation: 'sqrt', operandA: 9, operandB: null }),
    );
  });

  it('keeps a zero second operand instead of treating it as missing', async () => {
    fetchMock.mockResolvedValue(response({ result: 0 }));

    await expect(calculate('multiply', 7, 0)).resolves.toBe(0);

    expect(fetchMock.mock.calls[0][1]?.body).toBe(
      JSON.stringify({ operation: 'multiply', operandA: 7, operandB: 0 }),
    );
  });

  it('surfaces the API error message', async () => {
    fetchMock.mockResolvedValue(
      response({ error: { code: 'division_by_zero', message: 'cannot divide by zero' } }, false, 400),
    );

    await expect(calculate('divide', 1, 0)).rejects.toThrow('cannot divide by zero');
  });

  it('falls back to a friendly message when the API error has no message', async () => {
    fetchMock.mockResolvedValue(response({ error: { code: 'invalid_input' } }, false, 400));

    await expect(calculate('add', 1, 2)).rejects.toThrow(
      'The calculation could not be completed (HTTP 400).',
    );
  });

  it('falls back when an unsuccessful response has no error object', async () => {
    fetchMock.mockResolvedValue(response({}, false, 500));

    await expect(calculate('add', 1, 2)).rejects.toThrow(
      'The calculation could not be completed (HTTP 500).',
    );
  });

  it('rejects an unsuccessful response without a JSON body', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 500,
      json: vi.fn().mockRejectedValue(new Error('invalid json')),
    } as unknown as Response);

    await expect(calculate('add', 1, 2)).rejects.toThrow(
      'The calculation could not be completed (HTTP 500).',
    );
  });

  it('rejects a successful response without a numeric result', async () => {
    fetchMock.mockResolvedValue(response({ result: '5' }));

    await expect(calculate('add', 1, 2)).rejects.toThrow(
      'The calculator service returned an invalid response.',
    );
  });

  it('rejects a successful response without a body', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockRejectedValue(new Error('invalid json')),
    } as unknown as Response);

    await expect(calculate('add', 1, 2)).rejects.toThrow(
      'The calculator service returned an invalid response.',
    );
  });

  it('propagates network failures', async () => {
    fetchMock.mockRejectedValue(new Error('network down'));

    await expect(calculate('add', 1, 2)).rejects.toThrow('network down');
  });

  it('reports request timeouts', async () => {
    fetchMock.mockImplementation((_url, init: RequestInit) =>
      new Promise((_resolve, reject) => {
        init.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
      }),
    );

    await expect(calculate('add', 1, 2, { timeoutMs: 1 })).rejects.toThrow(
      'The calculator service timed out.',
    );
  });

  it('includes unexpected HTTP status in the fallback error', async () => {
    fetchMock.mockResolvedValue(response({}, false, 503));

    await expect(calculate('add', 1, 2)).rejects.toThrow(
      'The calculation could not be completed (HTTP 503).',
    );
  });
});
