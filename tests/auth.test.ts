// © 2026 typeof (Scolup) | Licensed under AGPL 3.0
import { describe, it, expect, beforeEach, afterEach, mock } from 'bun:test';
import {
  login,
  logout,
  refreshToken,
  configure,
  getAccount,
  getAccounts,
  switchAccount,
  getLastTokenRefresh,
  clearSession,
} from '../src/index';
import { EdAuthError } from '../src/core/errors';
import { stopTokenKeepalive } from '../src/core/health';

function encodeBase64(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

describe('Authentication Flow', () => {
  let originalFetch: typeof globalThis.fetch;
  let requests: {
    url: string;
    method: string;
    headers: Record<string, string>;
    body: any;
  }[] = [];
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
    mockResponses.clear();

    configure({
      storage: undefined,
      on2faRequired: undefined,
      onCredentialsRequired: undefined,
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
        } else if (Array.isArray(init.headers)) {
          init.headers.forEach(([key, value]) => {
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

      requests.push({ url: urlStr, method, headers, body: parsedBody });

      let matchedHandler = null;
      for (const [pattern, handler] of mockResponses.entries()) {
        if (urlStr.includes(pattern)) {
          matchedHandler = handler;
          break;
        }
      }

      if (matchedHandler) {
        const {
          status,
          headers: resHeaders,
          body,
        } = matchedHandler({ url: urlStr, method, headers, body: parsedBody });
        return new Response(JSON.stringify(body), {
          status,
          headers: new Headers({
            'Content-Type': 'application/json',
            ...resHeaders,
          }),
        });
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
  });

  const mockRawAccount = {
    idLogin: 1234567,
    id: 9876,
    uid: 'session_uid',
    identifiant: 'Test.user',
    typeCompte: 'E',
    prenom: 'John',
    nom: 'Doe',
    email: 'john.doe@example.com',
    nomEtablissement: 'Ecole Test',
    main: true,
    accesstoken: 'mocked_access_token',
    photo: 'https://example.com/photo.jpg',
    profile: {
      sexe: 'M',
      photo: 'https://example.com/photo.jpg',
    },
    modules: [{ code: 'NOTES', enable: 1, badge: 0, params: {} }],
  };

  const mockRawAccount2 = {
    idLogin: 1234567,
    id: 5555,
    uid: 'session_uid2',
    identifiant: 'Test.user2',
    typeCompte: 'E',
    prenom: 'Jane',
    nom: 'Doe',
    email: 'jane.doe@example.com',
    nomEtablissement: 'Ecole Test',
    main: false,
    accesstoken: 'mocked_access_token2',
    photo: 'https://example.com/photo2.jpg',
    profile: {
      sexe: 'F',
      photo: 'https://example.com/photo2.jpg',
    },
    modules: [{ code: 'NOTES', enable: 1, badge: 0, params: {} }],
  };

  it('performs a standard successful login', async () => {
    mockResponses.set('/login.awp?gtk=1', () => ({
      status: 200,
      headers: { 'set-cookie': 'GTK=mocked_gtk_value; Path=/' },
      body: { code: 200, token: '', message: '', data: {} },
    }));

    mockResponses.set('/login.awp?v=', (req) => {
      expect(req.headers['X-GTK']).toBe('mocked_gtk_value');
      expect(req.body.identifiant).toBe('testuser');
      expect(req.body.motdepasse).toBe('testpass');
      return {
        status: 200,
        headers: { 'X-Token': 'mocked_session_token' },
        body: {
          code: 200,
          token: 'mocked_session_token',
          message: '',
          data: {
            accounts: [mockRawAccount],
          },
        },
      };
    });

    const result = await login('testuser', 'testpass');

    expect(result.type).toBe('success');
    if (result.type === 'success') {
      expect(result.user.prenom).toBe('John');
      expect(result.user.nom).toBe('Doe');
      expect(result.token).toBe('mocked_session_token');
    }
    expect(getAccount()?.id).toBe(9876);
    expect(getLastTokenRefresh()).toBeDefined();

    expect(requests.length).toBe(2);
    expect(requests[0].url).toContain('gtk=1');
    expect(requests[1].url).toContain('login.awp?v=');
  });

  it('handles 2FA challenge flow successfully', async () => {
    mockResponses.set('/login.awp?gtk=1', () => ({
      status: 200,
      headers: { 'set-cookie': 'GTK=mocked_gtk_value; Path=/' },
      body: { code: 200, token: '', message: '', data: {} },
    }));

    mockResponses.set('/login.awp?v=', (req) => {
      if (req.body && req.body.cn === 'mocked_cn' && req.body.cv === 'mocked_cv') {
        return {
          status: 200,
          headers: { 'X-Token': 'final_session_token' },
          body: {
            code: 200,
            token: 'final_session_token',
            message: '',
            data: {
              accounts: [mockRawAccount],
            },
          },
        };
      }
      return {
        status: 200,
        headers: { '2fa-token': 't1', 'x-token': 'x1' },
        body: { code: 250, token: '', message: '2FA required', data: {} },
      };
    });

    mockResponses.set('/connexion/doubleauth.awp?verbe=get', () => ({
      status: 200,
      headers: { '2fa-token': 't2', 'x-token': 'x2' },
      body: {
        code: 200,
        token: '',
        message: '',
        data: {
          question: encodeBase64('What is your favorite color?'),
          propositions: [encodeBase64('Blue'), encodeBase64('Red'), encodeBase64('Green')],
        },
      },
    }));

    mockResponses.set('/connexion/doubleauth.awp?verbe=post', () => ({
      status: 200,
      headers: { '2fa-token': 't3', 'x-token': 'x3' },
      body: {
        code: 200,
        token: '',
        message: '',
        data: {
          cn: 'mocked_cn',
          cv: 'mocked_cv',
        },
      },
    }));

    const on2faRequired = mock((question, choices) => {
      expect(question).toBe('What is your favorite color?');
      expect(choices).toEqual(['Blue', 'Red', 'Green']);
      return 1;
    });

    const result = await login('testuser', 'testpass', { on2faRequired });

    expect(on2faRequired).toHaveBeenCalled();
    expect(result.type).toBe('success');
    if (result.type === 'success') {
      expect(result.token).toBe('final_session_token');
      expect(result.user.prenom).toBe('John');
    }
  });

  it('performs login using the unified options object format', async () => {
    mockResponses.set('/login.awp?gtk=1', () => ({
      status: 200,
      headers: { 'set-cookie': 'GTK=mocked_gtk_value; Path=/' },
      body: { code: 200, token: '', message: '', data: {} },
    }));

    mockResponses.set('/login.awp?v=', (req) => {
      expect(req.body.identifiant).toBe('testuser_opt');
      expect(req.body.motdepasse).toBe('testpass_opt');
      return {
        status: 200,
        headers: { 'X-Token': 'mocked_session_token' },
        body: {
          code: 200,
          token: 'mocked_session_token',
          message: '',
          data: {
            accounts: [mockRawAccount],
          },
        },
      };
    });

    const result = await login({
      username: 'testuser_opt',
      password: 'testpass_opt',
    });

    expect(result.type).toBe('success');
    if (result.type === 'success') {
      expect(result.user.prenom).toBe('John');
      expect(result.token).toBe('mocked_session_token');
    }
  });

  it('handles 2FA choice selection by string option (case-insensitive)', async () => {
    mockResponses.set('/login.awp?gtk=1', () => ({
      status: 200,
      headers: { 'set-cookie': 'GTK=mocked_gtk_value; Path=/' },
      body: { code: 200, token: '', message: '', data: {} },
    }));

    mockResponses.set('/login.awp?v=', (req) => {
      if (req.body && req.body.cn === 'mocked_cn' && req.body.cv === 'mocked_cv') {
        return {
          status: 200,
          headers: { 'X-Token': 'final_session_token' },
          body: {
            code: 200,
            token: 'final_session_token',
            message: '',
            data: {
              accounts: [mockRawAccount],
            },
          },
        };
      }
      return {
        status: 200,
        headers: { '2fa-token': 't1', 'x-token': 'x1' },
        body: { code: 250, token: '', message: '2FA required', data: {} },
      };
    });

    mockResponses.set('/connexion/doubleauth.awp?verbe=get', () => ({
      status: 200,
      headers: { '2fa-token': 't2', 'x-token': 'x2' },
      body: {
        code: 200,
        token: '',
        message: '',
        data: {
          question: encodeBase64('What is your favorite color?'),
          propositions: [encodeBase64('Blue'), encodeBase64('Red'), encodeBase64('Green')],
        },
      },
    }));

    mockResponses.set('/connexion/doubleauth.awp?verbe=post', (req) => {
      expect(req.body.choix).toBe(encodeBase64('Red'));
      return {
        status: 200,
        headers: { '2fa-token': 't3', 'x-token': 'x3' },
        body: {
          code: 200,
          token: '',
          message: '',
          data: {
            cn: 'mocked_cn',
            cv: 'mocked_cv',
          },
        },
      };
    });

    const on2faRequired = mock((question, choices) => {
      return 'red';
    });

    const result = await login('testuser', 'testpass', { on2faRequired });

    expect(on2faRequired).toHaveBeenCalled();
    expect(result.type).toBe('success');
    if (result.type === 'success') {
      expect(result.token).toBe('final_session_token');
    }
  });

  it('throws an error on invalid 2FA selection option', async () => {
    mockResponses.set('/login.awp?gtk=1', () => ({
      status: 200,
      headers: { 'set-cookie': 'GTK=mocked_gtk_value; Path=/' },
      body: { code: 200, token: '', message: '', data: {} },
    }));

    mockResponses.set('/login.awp?v=', () => ({
      status: 200,
      headers: { '2fa-token': 't1', 'x-token': 'x1' },
      body: { code: 250, token: '', message: '2FA required', data: {} },
    }));

    mockResponses.set('/connexion/doubleauth.awp?verbe=get', () => ({
      status: 200,
      headers: { '2fa-token': 't2', 'x-token': 'x2' },
      body: {
        code: 200,
        token: '',
        message: '',
        data: {
          question: encodeBase64('What is your favorite color?'),
          propositions: [encodeBase64('Blue'), encodeBase64('Red'), encodeBase64('Green')],
        },
      },
    }));

    const result = (await login('testuser', 'testpass')) as any;
    expect(result.type).toBe('securityQuestion');
    expect(result.answer('Yellow')).rejects.toThrow();
  });

  it('fails login on bad credentials', async () => {
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

    expect(login('testuser', 'badpass')).rejects.toThrow();
  });

  it('supports multiple accounts listing and switching', async () => {
    mockResponses.set('/login.awp?gtk=1', () => ({
      status: 200,
      headers: { 'set-cookie': 'GTK=mocked_gtk_value; Path=/' },
      body: { code: 200, token: '', message: '', data: {} },
    }));

    mockResponses.set('/login.awp?v=', () => ({
      status: 200,
      headers: { 'X-Token': 'mocked_session_token' },
      body: {
        code: 200,
        token: 'mocked_session_token',
        message: '',
        data: {
          accounts: [mockRawAccount, mockRawAccount2],
        },
      },
    }));

    await login('testuser', 'testpass');

    const accounts = getAccounts();
    expect(accounts.length).toBe(2);
    expect(accounts[0].id).toBe(9876);
    expect(accounts[1].id).toBe(5555);

    expect(getAccount()?.id).toBe(9876);

    await switchAccount(5555);
    expect(getAccount()?.id).toBe(5555);
    expect(getAccount()?.prenom).toBe('Jane');

    expect(switchAccount(9999)).rejects.toThrow();
  });

  it('handles logout successfully', async () => {
    mockResponses.set('/login.awp?gtk=1', () => ({
      status: 200,
      headers: { 'set-cookie': 'GTK=mocked_gtk_value; Path=/' },
      body: { code: 200, token: '', message: '', data: {} },
    }));

    mockResponses.set('/login.awp?v=', () => ({
      status: 200,
      headers: { 'X-Token': 'mocked_session_token' },
      body: {
        code: 200,
        token: 'mocked_session_token',
        message: '',
        data: {
          accounts: [mockRawAccount],
        },
      },
    }));

    await login('testuser', 'testpass');
    expect(getAccount()).toBeDefined();

    await logout();
    expect(getAccount()).toBeUndefined();
  });
});
