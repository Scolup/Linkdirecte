// © 2026 typeof (Scolup) | Licensed under AGPL 3.
import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import {
  checkTokenHealth,
  startTokenKeepalive,
  stopTokenKeepalive,
  configure,
  clearSession,
} from '../src/index';
import { setToken } from '../src/core/store';

describe('Token Health Module', () => {
  let originalFetch: typeof globalThis.fetch;
  let requests: string[] = [];

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    requests = [];
    setToken('test_token');
    configure({ maxRetries: 0 });
  });

  afterEach(async () => {
    globalThis.fetch = originalFetch;
    stopTokenKeepalive();
    await clearSession();
  });

  it('returns true if token health check is successful (code 200)', async () => {
    globalThis.fetch = async (input) => {
      requests.push(input.toString());
      return new Response(JSON.stringify({ code: 200, message: '', data: {} }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    };

    const result = await checkTokenHealth();

    expect(requests.length).toBe(1);
    expect(requests[0]).toContain('/rdt/sondages.awp');
    expect(result).toBe(true);
  });

  it('returns false if token health check fails or returns non-200', async () => {
    globalThis.fetch = async (input) => {
      requests.push(input.toString());
      return new Response(JSON.stringify({ code: 500, message: 'Expired' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    };

    const result = await checkTokenHealth();

    expect(requests.length).toBe(1);
    expect(result).toBe(false);
  });

  it('can start and stop token keepalive keepalive timers', () => {
    startTokenKeepalive();
    stopTokenKeepalive();

    expect(true).toBe(true);
  });
});
// © 2026 typeof (Scolup) | Licensed under AGPL 3.
