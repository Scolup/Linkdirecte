// © 2026 typeof (Scolup) | Licensed under AGPL 3.0
import { describe, it, expect, beforeEach, afterEach, mock } from 'bun:test';
import {
  login,
  configure,
  getGrades,
  clearSession,
  offlineQueue,
  memoryStorage,
  encryptedStorage,
  nodeStorage,
} from '../src/index';
import { setAccount, setToken, getConfig } from '../src/core/store';
import { EdRateLimitError, EdNetworkError } from '../src/core/errors';
import { stopTokenKeepalive } from '../src/core/health';

describe('Core Fetch Mechanism & Error Handling', () => {
  let originalFetch: typeof globalThis.fetch;
  let requests: {
    url: string;
    method: string;
    headers: Record<string, string>;
    body: any;
  }[] = [];
  let responseQueue: (() => {
    status: number;
    headers?: Record<string, string>;
    body: any;
  })[] = [];
  let mockResponses: Map<
    string,
    (req: any) => {
      status: number;
      headers?: Record<string, string>;
      body: any;
    }
  > = new Map();

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    requests = [];
    responseQueue = [];
    mockResponses.clear();

    configure({
      storage: undefined,
      passkey: undefined,
      maxRetries: 2,
      retryDelay: 1,
      timeout: 1000,
      offlineQueue: false,
    });

    globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const urlStr = input.toString();
      const method = init?.method || 'GET';
      const headers: Record<string, string> = {};
      if (init?.headers) {
        if (init.headers instanceof Headers) {
          init.headers.forEach((value, key) => {
            headers[key] = value;
          });
        } else {
          Object.assign(headers, init.headers);
        }
      }

      let parsedBody: any = undefined;
      if (init?.body) {
        const bodyStr = init.body.toString();
        if (bodyStr.startsWith('data=')) {
          const jsonStr = decodeURIComponent(bodyStr.substring(5));
          try {
            parsedBody = JSON.parse(jsonStr);
          } catch {
            parsedBody = bodyStr;
          }
        } else {
          parsedBody = bodyStr;
        }
      }

      const requestObj = { url: urlStr, method, headers, body: parsedBody };
      requests.push(requestObj);

      const queuedHandler = responseQueue.shift();
      if (queuedHandler) {
        const { status, headers: resHeaders, body } = queuedHandler();
        return new Response(JSON.stringify(body), {
          status,
          headers: new Headers({
            'Content-Type': 'application/json',
            ...resHeaders,
          }),
        });
      }

      let matchedHandler = null;
      for (const [pattern, handler] of mockResponses.entries()) {
        if (urlStr.includes(pattern)) {
          matchedHandler = handler;
          break;
        }
      }

      if (matchedHandler) {
        try {
          const { status, headers: resHeaders, body } = matchedHandler(requestObj);
          return new Response(JSON.stringify(body), {
            status,
            headers: new Headers({
              'Content-Type': 'application/json',
              ...resHeaders,
            }),
          });
        } catch (err) {
          throw err;
        }
      }

      return new Response(JSON.stringify({ code: 404, message: 'Not found' }), {
        status: 404,
        headers: new Headers({ 'Content-Type': 'application/json' }),
      });
    };
  });

  afterEach(async () => {
    globalThis.fetch = originalFetch;
    stopTokenKeepalive();
    await clearSession();
    offlineQueue.getQueue().length = 0;
  });

  const mockAccount = {
    idLogin: 1234567,
    id: 9876,
    uid: 'session_uid',
    identifiant: 'Test.user',
    typeCompte: 'E' as const,
    prenom: 'John',
    nom: 'Doe',
    email: 'john.doe@example.com',
    nomEtablissement: 'Ecole Test',
    main: true,
    profile: {
      sexe: 'M' as const,
      photo: 'https://example.com/photo.jpg',
    },
    modules: [{ code: 'NOTES', enable: true, badge: 0, params: {} }],
  };

  it('fetches grades and applies transform correctly', async () => {
    setAccount(mockAccount);
    setToken('valid_token');

    mockResponses.set('/notes.awp', (req) => {
      expect(req.headers['X-Token']).toBe('valid_token');
      expect(req.body.anneeScolaire).toBe('');
      return {
        status: 200,
        body: {
          code: 200,
          message: '',
          data: {
            notes: [
              {
                valeur: '15,5',
                noteSur: '20',
                coef: '2',
                enLettre: '0',
                interrogation: '1',
                dateSaisie: '2023-10-15',
                codeMatiere: 'MATHS',
                libelleMatiere: 'Mathématiques',
                codePeriode: 'TRIM1',
              },
            ],
            matieres: [
              {
                codeMatiere: 'MATHS',
                libelleMatiere: 'Mathématiques',
                coef: 2,
                nomProf: 'M. Sévère',
              },
            ],
          },
        },
      };
    });

    const result = await getGrades();

    expect(result.notes.length).toBe(1);
    expect(result.notes[0].valeur).toBe('15,5');
    expect(result.notes[0].coef).toBe('2');
    expect(result.notes[0].interrogation).toBe('1');
    expect(result.notes[0].enLettre).toBe('0');
    expect(result.notes[0].codeMatiere).toBe('MATHS');

    expect((result as any).matieres.length).toBe(1);
    expect((result as any).matieres[0].codeMatiere).toBe('MATHS');
    expect((result as any).matieres[0].coef).toBe(2);
    expect((result as any).matieres[0].nomProf).toBe('M. Sévère');
  });

  it('handles automatic retries on server errors (HTTP 500)', async () => {
    setAccount(mockAccount);
    setToken('valid_token');

    responseQueue.push(() => ({
      status: 500,
      body: { code: 500, message: 'Internal Server Error', data: {} },
    }));
    responseQueue.push(() => ({
      status: 500,
      body: { code: 500, message: 'Internal Server Error', data: {} },
    }));
    responseQueue.push(() => ({
      status: 200,
      body: {
        code: 200,
        message: '',
        data: {
          notes: [
            {
              valeur: '12',
              noteSur: '20',
              coef: '2',
              enLettre: '0',
              interrogation: '1',
              dateSaisie: '2023-10-15',
              codeMatiere: 'MATHS',
              libelleMatiere: 'Mathématiques',
              codePeriode: 'TRIM1',
            },
          ],
          matieres: [
            {
              codeMatiere: 'MATHS',
              libelleMatiere: 'Mathématiques',
              coef: 2,
              nomProf: 'M. Sévère',
            },
          ],
        },
      },
    }));

    configure({ maxRetries: 3, retryDelay: 1 });

    const result = await getGrades();
    expect(result.notes.length).toBe(1);
    expect(requests.length).toBe(3);
  });

  it('stops retrying and throws error when maxRetries is exceeded', async () => {
    setAccount(mockAccount);
    setToken('valid_token');

    configure({ maxRetries: 0 });

    responseQueue.push(() => ({
      status: 500,
      body: { code: 500, message: 'Internal Server Error', data: {} },
    }));

    expect(getGrades()).rejects.toThrow(EdNetworkError);
  });

  it('throws EdRateLimitError on HTTP 429', async () => {
    setAccount(mockAccount);
    setToken('valid_token');

    mockResponses.set('/notes.awp', () => ({
      status: 429,
      body: { code: 429, message: 'Too many requests', data: {} },
    }));

    expect(getGrades()).rejects.toThrow(EdRateLimitError);
  });

  it('pushes mutating requests to offline queue on network error if enabled', async () => {
    setAccount(mockAccount);
    setToken('valid_token');

    configure({ offlineQueue: true, maxRetries: 0 });

    globalThis.fetch = async () => {
      throw new Error('Connection refused');
    };

    const { edFetch } = await import('../src/core/fetch');

    expect(
      edFetch('/some-mutation.awp', {
        method: 'POST',
        queued: true,
        body: { homeworkId: 123, isDone: true },
      }),
    ).rejects.toThrow();

    const queue = offlineQueue.getQueue();
    expect(queue.length).toBe(1);
    expect(queue[0].endpoint).toBe('/some-mutation.awp');
    expect(queue[0].options.body).toEqual({ homeworkId: 123, isDone: true });
  });

  it('handles automatic session refresh (re-login) on session expiry code 521', async () => {
    const storageMock = {
      store: new Map<string, string>(),
      get(key: string) {
        return this.store.get(key) || null;
      },
      set(key: string, val: string) {
        this.store.set(key, val);
      },
      delete(key: string) {
        this.store.delete(key);
      },
    };

    storageMock.set('ed_access_token_9876', 'saved_access_token');
    storageMock.set('ed_uuid_9876', 'saved_uuid');

    configure({
      storage: storageMock,
      maxRetries: 0,
    });

    setAccount({
      ...mockAccount,
      accessToken: 'saved_access_token',
    });
    setToken('expired_token');

    responseQueue.push(() => ({
      status: 200,
      body: { code: 521, message: 'Session expirée', data: {} },
    }));

    mockResponses.set('/login.awp?gtk=1', () => ({
      status: 200,
      headers: { 'set-cookie': 'GTK=refreshed_gtk_value; Path=/' },
      body: { code: 200, token: '', message: '', data: {} },
    }));

    mockResponses.set('/login.awp?v=', (req) => {
      expect(req.body.accesstoken).toBe('saved_access_token');
      expect(req.body.isReLogin).toBe(true);
      return {
        status: 200,
        headers: { 'X-Token': 'new_valid_token' },
        body: {
          code: 200,
          token: 'new_valid_token',
          message: '',
          data: {
            accounts: [mockAccount],
          },
        },
      };
    });

    mockResponses.set('/notes.awp', (req) => {
      expect(req.headers['X-Token']).toBe('new_valid_token');
      return {
        status: 200,
        body: {
          code: 200,
          message: '',
          data: {
            notes: [
              {
                valeur: '12',
                noteSur: '20',
                coef: '2',
                enLettre: '0',
                interrogation: '1',
                dateSaisie: '2023-10-15',
                codeMatiere: 'MATHS',
                libelleMatiere: 'Mathématiques',
                codePeriode: 'TRIM1',
              },
            ],
            matieres: [
              {
                codeMatiere: 'MATHS',
                libelleMatiere: 'Mathématiques',
                coef: 2,
                nomProf: 'M. Sévère',
              },
            ],
          },
        },
      };
    });

    const result = await getGrades();
    expect(result.notes.length).toBe(1);
  });

  it('verifies that errors construct clean, descriptive, formatted messages', async () => {
    const error = new EdRateLimitError('Too many requests', 'RATE_LIMIT', 429);
    expect(error.message).toBe('[RATE_LIMIT] Too many requests (HTTP 429)');
    expect(error.name).toBe('EdRateLimitError');
  });

  describe('Centralized API Version and User-Agent Behavior', () => {
    it('verifies relative URLs receive version v', () => {
      const { buildApiUrl, ED_VERSION } = require('../src/core/http');
      const url = buildApiUrl('/some/endpoint.awp');
      expect(url.searchParams.get('v')).toBe(ED_VERSION);
    });

    it('verifies explicit v values are preserved', () => {
      const { buildApiUrl } = require('../src/core/http');
      const url = buildApiUrl('/some/endpoint.awp?v=custom-version');
      expect(url.searchParams.get('v')).toBe('custom-version');
    });

    it('verifies absolute URLs bypass injection', () => {
      const { buildApiUrl } = require('../src/core/http');
      const url = buildApiUrl('https://example.com/photo.jpg');
      expect(url.searchParams.has('v')).toBe(false);
    });

    it('verifies lazy default user-agent initialization and preservation of a custom userAgent', () => {
      const { getConfig, setConfig, DEFAULT_USER_AGENT } = require('../src/core/store');
      const { ED_VERSION } = require('../src/core/http');

      setConfig({ userAgent: '' });
      const config1 = getConfig();
      expect(DEFAULT_USER_AGENT).toBe(
        `Linkdirecte/1.0 (iPhone; CPU OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.5.2 Mobile/15E148 EDMOBILE v${ED_VERSION}`,
      );
      expect(config1.userAgent).toBe(DEFAULT_USER_AGENT);

      setConfig({ userAgent: 'CustomAgent/1.0' });
      const config2 = getConfig();
      expect(config2.userAgent).toBe('CustomAgent/1.0');
    });
  });

  describe('Storage Enhancements & Encryption', () => {
    it('manually wraps a storage adapter with encryptedStorage and encrypts/decrypts correctly', async () => {
      const base = memoryStorage;
      const encrypted = encryptedStorage(base, 'super-secret-key');

      await encrypted.set('test_key', 'plain_text_value');

      const encryptedValue = await base.get('test_key');
      expect(encryptedValue).not.toBeNull();
      expect(encryptedValue).not.toBe('plain_text_value');

      const decryptedValue = await encrypted.get('test_key');
      expect(decryptedValue).toBe('plain_text_value');

      const wrongEncrypted = encryptedStorage(base, 'wrong-key');
      const wrongValue = await wrongEncrypted.get('test_key');
      expect(wrongValue).toBeNull();
    });

    it('defaults to nodeStorage in Bun/Node.js environment', () => {
      configure({ storage: undefined });
      const config = getConfig();
      expect(config.storage).toBeDefined();
      expect(config.storage!.get).toBeDefined();
    });

    it('transparently wraps with encryptedStorage when passkey is configured', async () => {
      const base = memoryStorage;
      configure({ storage: base, passkey: 'auto-key' });

      const config = getConfig();
      await config.storage!.set('ed_tk', 'my-secret-token');

      const baseValue = await base.get('ed_tk');
      expect(baseValue).not.toBeNull();
      expect(baseValue).not.toBe('my-secret-token');

      const decrypted = await config.storage!.get('ed_tk');
      expect(decrypted).toBe('my-secret-token');
    });

    it('verifies that sequential writes in persistSession prevent read-modify-write adapter race conditions', async () => {
      const { persistSession } = await import('../src/core/store');
      let fileContents: Record<string, string> = {};
      const rmwStorage = {
        async get(key: string) {
          await new Promise((r) => setTimeout(r, 2));
          return fileContents[key] || null;
        },
        async set(key: string, value: string) {
          await new Promise((r) => setTimeout(r, 2));
          const current = { ...fileContents };
          current[key] = value;
          await new Promise((r) => setTimeout(r, 2));
          fileContents = current;
        },
        async delete(key: string) {
          await new Promise((r) => setTimeout(r, 2));
          const current = { ...fileContents };
          delete current[key];
          await new Promise((r) => setTimeout(r, 2));
          fileContents = current;
        },
      };

      setToken('token-abc');
      setAccount({ ...mockAccount, id: 1111 });

      configure({ storage: rmwStorage });
      await persistSession();

      const storedToken = await rmwStorage.get('ed_tk');
      const storedAccount = await rmwStorage.get('ed_acc');

      expect(storedToken).toBe('token-abc');
      expect(storedAccount).toContain('1111');
    });
  });

  describe('Granular Error Taxonomy & Code Mapping', () => {
    it('verifies EdValidationError properties', () => {
      const { assertNonEmptyString } = require('../src/core/validate');
      const { EdValidationError } = require('../src/core/errors');

      try {
        assertNonEmptyString('', 'identifiant');
      } catch (err: any) {
        expect(err).toBeInstanceOf(EdValidationError);
        expect(err.name).toBe('EdValidationError');
        expect(err.code).toBe('INVALID_ARGUMENT');
        expect(err.message).toContain('identifiant must be a non-empty string');
      }
    });

    it('verifies EdServerError properties', async () => {
      const { getGrades } = require('../src/index');
      const { EdServerError } = require('../src/core/errors');

      setAccount(mockAccount);
      setToken('valid_token');

      responseQueue.push(() => ({
        status: 502,
        body: { code: 502, message: 'Bad Gateway', data: {} },
      }));

      configure({ maxRetries: 0 });

      await expect(getGrades()).rejects.toThrow(EdServerError);
    });

    it('verifies EdParseError properties', async () => {
      const { getGrades } = require('../src/index');
      const { EdParseError } = require('../src/core/errors');

      setAccount(mockAccount);
      setToken('valid_token');

      globalThis.fetch = async () => {
        return new Response('Not valid JSON', {
          status: 200,
          headers: new Headers({ 'Content-Type': 'application/json' }),
        });
      };

      configure({ maxRetries: 0 });

      try {
        await getGrades();
        expect(true).toBe(false); // should not reach here
      } catch (err: any) {
        expect(err).toBeInstanceOf(EdParseError);
        expect(err.message).toContain('Not valid JSON');
      }

      globalThis.fetch = async () => {
        return new Response('Another malformed body', {
          status: 200,
          headers: new Headers({ 'Content-Type': 'application/json' }),
        });
      };
      await expect(getGrades()).rejects.toThrow(EdParseError);
    });

    it('verifies EdTimeoutError properties', async () => {
      const { getGrades } = require('../src/index');
      const { EdTimeoutError } = require('../src/core/errors');

      setAccount(mockAccount);
      setToken('valid_token');

      globalThis.fetch = async () => {
        const err = new Error('The request timed out');
        err.name = 'AbortError';
        throw err;
      };

      configure({ maxRetries: 0, timeout: 100 });

      await expect(getGrades()).rejects.toThrow(EdTimeoutError);
    });

    it('verifies toJSON representation of EdError subclasses', () => {
      const { EdValidationError } = require('../src/core/errors');
      const error = new EdValidationError('Value is empty', 'INVALID_ARGUMENT', 400, {
        original: 'payload',
      });
      const json = error.toJSON() as any;

      expect(json.name).toBe('EdValidationError');
      expect(json.message).toBe('[INVALID_ARGUMENT] Value is empty (HTTP 400)');
      expect(json.code).toBe('INVALID_ARGUMENT');
      expect(json.statusCode).toBe(400);
      expect(json.raw).toBeUndefined();
    });

    it('verifies friendly error code mappings (e.g., 505 / Bad Credentials)', async () => {
      const { login } = require('../src/index');
      const { EdAuthError } = require('../src/core/errors');

      mockResponses.set('/login.awp?gtk=1', () => ({
        status: 200,
        headers: { 'set-cookie': 'GTK=mocked_gtk_value; Path=/' },
        body: { code: 200, token: '', message: '', data: {} },
      }));

      mockResponses.set('/login.awp?v=', () => ({
        status: 200,
        body: {
          code: 505,
          message: 'Mot de passe invalide',
          data: {},
        },
      }));

      let thrown = false;
      try {
        await login('testuser', 'badpass');
      } catch (err: any) {
        thrown = true;
        expect(err).toBeInstanceOf(EdAuthError);
        expect(err.message).toContain('Invalid username or password');
      }
      expect(thrown).toBe(true);
    });
  });
});
