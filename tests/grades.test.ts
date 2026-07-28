// © 2026 typeof (Scolup) | Licensed under AGPL 3.0
import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { getGrades, configure, clearSession } from '../src/index';
import { setAccount, setToken } from '../src/core/store';

describe('Grades Module', () => {
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
    modules: [{ code: 'NOTES', enable: true, badge: 0, params: {} }],
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

  it('fetches grades and transforms correctly with no periodId', async () => {
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
            notes: [
              {
                valeur: '18',
                noteSur: '20',
                coef: '1',
                enLettre: false,
                date: '2023-11-20',
                codeMatiere: 'MATH',
                libelleMatiere: 'Mathématiques',
                codePeriode: 'A01',
                dateSaisie: '2023-11-21',
              },
            ],
            periodes: [
              {
                idPeriode: 'A01',
                codePeriode: 'P1',
                periode: 'Trimestre 1',
                annuel: false,
              },
            ],
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    };

    const result = await getGrades();

    expect(lastRequest).toBeDefined();
    expect(lastRequest!.url).toContain('/eleves/9876/notes.awp');
    expect(lastRequest!.url).toContain('verbe=get');
    expect(lastRequest!.method).toBe('POST');
    expect(lastRequest!.body).toEqual({ anneeScolaire: '' });

    expect(result.notes).toBeDefined();
    expect(result.notes.length).toBe(1);
    expect(result.notes[0].valeur).toBe('18');
    expect(result.notes[0].date).toBeInstanceOf(Date);
    expect(result.notes[0].date.getFullYear()).toBe(2023);
    expect(result.notes[0].date.getMonth()).toBe(10); // November is 10
    expect(result.notes[0].dateSaisie).toBeInstanceOf(Date);

    expect(result.periodes).toBeDefined();
    expect(result.periodes!.length).toBe(1);
    expect(result.periodes![0].idPeriode).toBe('A01');
  });

  it('fetches grades and sends the correct periodId', async () => {
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
            notes: [],
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    };

    const result = await getGrades({ periodId: '2023-2024' });

    expect(lastRequest).toBeDefined();
    expect(lastRequest!.url).toContain('/eleves/9876/notes.awp');
    expect(lastRequest!.body).toEqual({ anneeScolaire: '2023-2024' });
    expect(result.notes).toEqual([]);
  });
});
