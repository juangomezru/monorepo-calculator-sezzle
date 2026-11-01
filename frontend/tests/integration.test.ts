import { createServer } from 'node:net';
import { spawn, type ChildProcess } from 'node:child_process';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { calculate } from '../src/api';

let baseUrl: string;
let backend: ChildProcess;

async function findAvailablePort(): Promise<number> {
  const server = createServer();
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => resolve());
  });
  const address = server.address();
  if (!address || typeof address === 'string') {
    server.close();
    throw new Error('Could not allocate a test port');
  }
  const port = address.port;
  await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  return port;
}

async function waitForBackend(): Promise<void> {
  for (let attempt = 0; attempt < 150; attempt += 1) {
    const response = await fetch(`${baseUrl}/health`).catch(() => null);
    if (response?.ok) return;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error('Go backend did not start');
}

describe('frontend API client against the Go backend', () => {
  beforeAll(async () => {
    const port = await findAvailablePort();
    baseUrl = `http://127.0.0.1:${port}`;
    backend = spawn('go', ['run', './cmd/api'], {
      cwd: join(process.cwd(), '..', 'backend'),
      env: {
        ...process.env,
        PORT: String(port),
        CORS_ORIGIN: 'http://localhost:5173',
      },
      stdio: 'ignore',
    });
    await waitForBackend();
  }, 45_000);

  afterAll(async () => {
    if (!backend) return;
    if (backend.exitCode !== null || backend.signalCode !== null) return;
    await new Promise<void>((resolve) => {
      backend.once('exit', () => resolve());
      backend.kill();
    });
  });

  it('returns the backend result through the frontend API client', async () => {
    await expect(calculate('add', 0.1, 0.2, { baseUrl })).resolves.toBe(0.30000000000000004);
  });

  it('keeps chained division and multiplication numerically correct', async () => {
    const third = await calculate('divide', 1, 3, { baseUrl });

    await expect(calculate('multiply', third, 3, { baseUrl })).resolves.toBe(1);
  });

  it('maps backend division errors to the client error message', async () => {
    await expect(calculate('divide', 1, 0, { baseUrl })).rejects.toThrow('cannot divide by zero');
  });

  it('rejects an invalid request with the documented JSON error contract', async () => {
    const response = await fetch(`${baseUrl}/api/v1/calculate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ operation: 'add', operandA: 1 }),
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: {
        code: 'invalid_input',
        message: 'operandB must be a finite number',
      },
    });
  });

  it('returns the documented success JSON contract', async () => {
    const response = await fetch(`${baseUrl}/api/v1/calculate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ operation: 'power', operandA: 2, operandB: 10 }),
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ result: 1024 });
  });
});
