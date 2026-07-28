// © 2026 typeof (Scolup) | Licensed under AGPL 3.0
import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { getAttendance, configure, clearSession } from '../src/index';
import { setAccount, setToken } from '../src/core/store';

describe('Attendance Module', () => {
  let originalFetch: typeof globalThis.fetch;
  let lastRequest: { url: string; method: string; body: any } | null = null;

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
    modules: [{ code: 'VIE_SCOLAIRE', enable: true, badge: 0, params: {} }],
  };

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    lastRequest = null;
    setAccount(mockAccount);
    setToken('test_token');
    configure({ maxRetries: 0 });
  });

  afterEach(async () => {
    globalThis.fetch = originalFetch;
    await clearSession();
  });

  it('fetches attendance and transforms correctly', async () => {
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
      lastRequest = { url: urlStr, method, body: parsedBody };

      return new Response(
        JSON.stringify({
          code: 200,
          message: '',
          data: {
            absences: [
              {
                id: 1,
                date: '2023-10-15',
                type: 'ABSENCE',
                libelleMatiere: 'MATHS',
              },
            ],
            delays: [
              {
                id: 2,
                date: '2023-10-16',
                type: 'RETARD',
              },
            ],
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    };

    const result = await getAttendance();

    expect(lastRequest).toBeDefined();
    expect(lastRequest!.url).toContain('/eleves/9876/viescolaire.awp');
    expect(lastRequest!.method).toBe('POST');
    expect(lastRequest!.body).toEqual({});

    expect(result.absences).toBeDefined();
    expect(result.absences![0].id).toBe(1);
    expect(result.delays).toBeDefined();
    expect(result.delays![0].id).toBe(2);
  });
});
