// © 2026 typeof (Scolup) | Licensed under AGPL 3.0
import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { getTimetable, getTimetableIcalUrl, configure, clearSession } from '../src/index';
import { setAccount, setToken } from '../src/core/store';

describe('Timetable Module', () => {
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
    modules: [{ code: 'EDT', enable: true, badge: 0, params: {} }],
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

  it('fetches timetable with custom dates', async () => {
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
            timetable: [
              {
                id: 1,
                codeMatiere: 'MATHS',
                matiere: 'Mathematics',
                start_date: '2023-10-15 08:30',
                end_date: '2023-10-15 10:30',
              },
            ],
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    };

    const result = await getTimetable({
      startDate: '2023-10-15',
      endDate: '2023-10-16',
    });

    expect(requests.length).toBe(1);
    expect(requests[0].url).toContain('/E/9876/emploidutemps.awp');
    expect(requests[0].body).toEqual({
      dateDebut: '2023-10-15',
      dateFin: '2023-10-16',
      avecTrous: false,
    });
    expect(result.timetable).toBeDefined();
    expect(result.timetable[0].id).toBe(1);
    expect(result.timetable[0].codeMatiere).toBe('MATHS');
    expect(result.timetable[0].matiere).toBe('Mathematics');
  });

  it('retrieves ICAL timetable URL', async () => {
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
            url: 'ical_url_hash',
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    };

    const url = await getTimetableIcalUrl();

    expect(requests.length).toBe(1);
    expect(requests[0].url).toContain('/ical/E/9876/url.awp');
    expect(url).toBe('https://api.ecoledirecte.com/v3/ical_url_hash');
  });
});
