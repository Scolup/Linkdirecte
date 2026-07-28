// © 2026 typeof (Scolup) | Licensed under AGPL 3.0
import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import {
  getQcms,
  getQcmDetail,
  updateQcmStatus,
  submitQcmAnswer,
  configure,
  clearSession,
} from '../src/index';
import { setAccount, setToken } from '../src/core/store';

describe('Forms Module', () => {
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
    modules: [{ code: 'QCM', enable: true, badge: 0, params: {} }],
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

  it('fetches associations of QCMS', async () => {
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
            associations: [
              {
                id: 11,
                idQcm: 22,
                titre: 'Math Test',
              },
            ],
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    };

    const result = await getQcms();

    expect(lastRequest).toBeDefined();
    expect(lastRequest!.url).toContain('/eleves/9876/qcms/0/associations.awp');
    expect(result.associations).toBeDefined();
    expect(result.associations![0].id).toBe(11);
    expect(result.associations![0].idQcm).toBe(22);
    expect(result.associations![0].titre).toBe('Math Test');
  });

  it('gets detail of a QCM', async () => {
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
            idQcm: 22,
            questions: [
              {
                id: 123,
                libelle: 'What is 2+2?',
              },
            ],
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    };

    const result = await getQcmDetail(22, 11);

    expect(lastRequest).toBeDefined();
    expect(lastRequest!.url).toContain('/eleves/9876/qcms/22/associations/11.awp');
    expect(lastRequest!.body).toEqual({ anneeQCMs: '' });
    expect(result.idQcm).toBe(22);
    expect(result.questions[0].id).toBe(123);
    expect(result.questions[0].libelle).toBe('What is 2+2?');
  });

  it('updates QCM status', async () => {
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
            success: true,
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    };

    const result = await updateQcmStatus(22, 11, 444, 'updateStartDate');

    expect(lastRequest).toBeDefined();
    expect(lastRequest!.url).toContain('/eleves/9876/qcms/22/associations/11/participants/444.awp');
    expect(lastRequest!.body).toEqual({ action: 'updateStartDate' });
    expect(result.success).toBe(true);
  });

  it('submits QCM answers', async () => {
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
            success: true,
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    };

    const result = await submitQcmAnswer({
      idQcm: 22,
      idAssociation: 11,
      idParticipant: 444,
      idReponse: 555,
      idQuestion: 123,
      choiceIds: [1, 2],
    });

    expect(lastRequest).toBeDefined();
    expect(lastRequest!.url).toContain(
      '/eleves/9876/qcms/22/associations/11/participants/444/reponse/555.awp',
    );
    expect(lastRequest!.body).toEqual({
      reponse: {
        id: 555,
        idQuestion: 123,
        idParticipant: 444,
        choix: [1, 2],
      },
    });
    expect(result.success).toBe(true);
  });
});
