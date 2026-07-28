// © 2026 typeof (Scolup) | Licensed under AGPL 3.0
import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import {
  getHomework,
  getHomeworkForDate,
  markAsDone,
  sendHomeworkComment,
  configure,
  clearSession,
} from '../src/index';
import { setAccount, setToken } from '../src/core/store';

function encodeBase64(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

describe('Homework Module', () => {
  let originalFetch: typeof globalThis.fetch;
  let requests: { url: string; method: string; body: any }[] = [];

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
    modules: [{ code: 'CAHIER_DE_TEXTES', enable: true, badge: 0, params: {} }],
  };

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    requests = [];
    setAccount(mockAccount);
    setToken('test_token');
    configure({ maxRetries: 0 });
  });

  afterEach(async () => {
    globalThis.fetch = originalFetch;
    await clearSession();
  });

  it('fetches basic homework list without content', async () => {
    globalThis.fetch = async (input, init) => {
      const urlStr = input.toString();
      const method = init?.method || 'GET';
      let parsedBody: any = undefined;
      if (init?.body) {
        const bodyStr = init.body.toString();
        if (bodyStr.startsWith('data=')) {
          parsedBody = JSON.parse(decodeURIComponent(bodyStr.substring(5)));
        } else {
          parsedBody = bodyStr;
        }
      }
      requests.push({ url: urlStr, method, body: parsedBody });

      return new Response(
        JSON.stringify({
          code: 200,
          message: '',
          data: {
            '2023-10-15': [
              {
                idDevoir: 1,
                matiere: 'MATHS',
                effectue: '0',
              },
            ],
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    };

    const result = await getHomework();

    expect(requests.length).toBe(1);
    expect(requests[0].url).toContain('/Eleves/9876/cahierdetexte.awp');
    expect(result['2023-10-15']).toBeDefined();
    expect(result['2023-10-15'][0].idDevoir).toBe(1);
    expect(result['2023-10-15'][0].effectue).toBe('0');
  });

  it('fetches homework with content and decodes Base64 fields', async () => {
    globalThis.fetch = async (input, init) => {
      const urlStr = input.toString();
      const method = init?.method || 'GET';
      let parsedBody: any = undefined;
      if (init?.body) {
        const bodyStr = init.body.toString();
        if (bodyStr.startsWith('data=')) {
          parsedBody = JSON.parse(decodeURIComponent(bodyStr.substring(5)));
        } else {
          parsedBody = bodyStr;
        }
      }
      requests.push({ url: urlStr, method, body: parsedBody });

      if (urlStr.includes('cahierdetexte.awp')) {
        return new Response(
          JSON.stringify({
            code: 200,
            message: '',
            data: {
              '2023-10-15': [
                {
                  idDevoir: 1,
                  matiere: 'Maths',
                },
              ],
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      } else if (urlStr.includes('2023-10-15.awp')) {
        return new Response(
          JSON.stringify({
            code: 200,
            message: '',
            data: {
              subjects: [
                {
                  matiere: 'Maths',
                  aFaire: {
                    contenu: encodeBase64('Solve equations'),
                  },
                },
              ],
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }

      return new Response(JSON.stringify({ code: 404, message: 'Not found' }), { status: 404 });
    };

    const result = await getHomework({ withContent: true });

    expect(requests.length).toBe(2);
    expect(requests[0].url).toContain('/Eleves/9876/cahierdetexte.awp');
    expect(requests[1].url).toContain('/Eleves/9876/cahierdetexte/2023-10-15.awp');

    expect(result['2023-10-15']).toBeDefined();
    const subjects: any = result['2023-10-15'];
    expect(subjects[0].matiere).toBe('Maths');
    expect(subjects[0].aFaire.contenu).toBe('Solve equations');
  });

  it('throws error for invalid date in getHomeworkForDate', async () => {
    expect(getHomeworkForDate('invalid-date')).rejects.toThrow();
  });

  it('marks homework as done', async () => {
    globalThis.fetch = async (input, init) => {
      const urlStr = input.toString();
      const method = init?.method || 'GET';
      let parsedBody: any = undefined;
      if (init?.body) {
        const bodyStr = init.body.toString();
        if (bodyStr.startsWith('data=')) {
          parsedBody = JSON.parse(decodeURIComponent(bodyStr.substring(5)));
        } else {
          parsedBody = bodyStr;
        }
      }
      requests.push({ url: urlStr, method, body: parsedBody });

      return new Response(
        JSON.stringify({
          code: 200,
          message: '',
          data: {
            success: true,
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    };

    const result = await markAsDone([1, 2]);

    expect(requests.length).toBe(1);
    expect(requests[0].url).toContain('/Eleves/9876/cahierdetexte.awp');
    expect(requests[0].body).toEqual({
      idDevoirsEffectues: [1, 2],
      idDevoirsNonEffectues: [],
    });
    expect(result.success).toBe(true);
  });

  it('posts a homework comment successfully and encodes the message payload in base64', async () => {
    globalThis.fetch = async (input, init) => {
      const urlStr = input.toString();
      const method = init?.method || 'GET';
      let parsedBody: any = undefined;
      if (init?.body) {
        const bodyStr = init.body.toString();
        if (bodyStr.startsWith('data=')) {
          parsedBody = JSON.parse(decodeURIComponent(bodyStr.substring(5)));
        } else {
          parsedBody = bodyStr;
        }
      }
      requests.push({ url: urlStr, method, body: parsedBody });

      return new Response(
        JSON.stringify({
          code: 200,
          message: '',
          data: {
            id: 12345,
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    };

    const result = await sendHomeworkComment(55442, 'Hello comment!');

    expect(requests.length).toBe(1);
    expect(requests[0].url).toContain('/eleves/9876/afaire/commentaires.awp');
    expect(requests[0].body).toEqual({
      idContenu: 55442,
      message: encodeBase64('Hello comment!'),
    });
    expect(result.id).toBe(12345);
  });
});
